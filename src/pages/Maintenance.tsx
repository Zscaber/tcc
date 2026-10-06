import React, { useState } from 'react';
import { db, isDateOverdue, getOverdueDaysText } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, Button, Modal, Input, Select, Textarea, StatusBadge, SearchInput, EmptyState, Card, showToast, ConfirmDialog, Badge } from '../components/ui';
import { Plus, Settings, Edit2, Trash2, Eye, Wrench, AlertTriangle, ClipboardList, CheckCircle, Info } from 'lucide-react';
import { MaintenanceRecord, MaintenanceType, MaintenanceStatus } from '../types';
import { Permissions } from '../lib/permissions';

export default function Maintenance() {
  const { user } = useAuth();
  const [items, setItems] = useState(db.getMaintenanceRecords());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [inspectItem, setInspectItem] = useState<MaintenanceRecord | null>(null);
  const [editing, setEditing] = useState<MaintenanceRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const equipment = db.getEquipment();
  const people = db.getPeople();
  const problems = db.getProblems();
  const actionPlans = db.getActionPlans();

  const emptyForm = { equipmentId: '', problemId: '', actionPlanId: '', type: 'preventive' as MaintenanceType, description: '', responsibleId: '', date: new Date().toISOString().split('T')[0], deadline: '', status: 'scheduled' as MaintenanceStatus, notes: '', cost: 0 };
  const [form, setForm] = useState(emptyForm);

  const filtered = items.filter(m => {
    const eq = equipment.find(e => e.id === m.equipmentId);
    const matchSearch = !search || m.description.toLowerCase().includes(search.toLowerCase()) || (eq && eq.name.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = !filterStatus || m.status === filterStatus;
    const matchType = !filterType || m.type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (m: MaintenanceRecord) => {
    setEditing(m);
    setForm({
      equipmentId: m.equipmentId,
      problemId: m.problemId || '',
      actionPlanId: m.actionPlanId || '',
      type: m.type,
      description: m.description,
      responsibleId: m.responsibleId,
      date: m.date,
      deadline: m.deadline,
      status: m.status,
      notes: m.notes,
      cost: m.cost,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.equipmentId) { showToast('error', 'Selecione um equipamento'); return; }
    if (!form.description.trim()) { showToast('error', 'Descrição é obrigatória'); return; }

    if (editing) {
      db.updateMaintenanceRecord(editing.id, form);
      db.addHistory({ userId: user!.id, action: 'Manutenção atualizada', entity: 'maintenance', entityId: editing.id, details: form.description });
      showToast('success', 'Manutenção atualizada');
    } else {
      db.createMaintenanceRecord(form);
      db.addHistory({ userId: user!.id, action: 'Manutenção registrada', entity: 'maintenance', entityId: 'new', details: form.description });
      showToast('success', 'Manutenção registrada');
    }
    setItems(db.getMaintenanceRecords());
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    db.deleteMaintenanceRecord(id);
    db.addHistory({ userId: user!.id, action: 'Manutenção excluída', entity: 'maintenance', entityId: id, details: 'Manutenção desmarcada/removida' });
    setItems(db.getMaintenanceRecords());
    showToast('success', 'Manutenção excluída');
  };

  const typeLabels: Record<string, string> = { preventive: 'Preventiva', corrective: 'Corretiva', predictive: 'Preditiva', other: 'Outro' };

  const canCreate = Permissions.canCreateMaintenance(user);
  const canEdit = Permissions.canEditMaintenance(user);
  const canDelete = Permissions.canDeleteMaintenance(user);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manutenção"
        subtitle="Registro e controle integrado de manutenções de máquinas e equipamentos"
        actions={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus size={16} className="inline mr-1" /> Nova Manutenção
            </Button>
          ) : undefined
        }
      />

      {!canCreate && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-xs text-blue-800">
          <Info size={16} className="shrink-0 text-blue-600" />
          <span>
            <strong>Modo Consulta Educacional:</strong> Acompanhamento de ordens de serviço e manutenções industriais.
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Pesquisar por equipamento ou descrição..." />
        <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-40 text-xs">
          <option value="">Todos status</option>
          <option value="scheduled">Programada</option>
          <option value="in_progress">Em Andamento</option>
          <option value="completed">Concluída</option>
          <option value="overdue">Atrasada</option>
          <option value="cancelled">Cancelada</option>
        </Select>
        <Select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-40 text-xs">
          <option value="">Todos tipos</option>
          <option value="preventive">Preventiva</option>
          <option value="corrective">Corretiva</option>
          <option value="predictive">Preditiva</option>
          <option value="other">Outro</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Settings size={48} />}
          title="Nenhum registro de manutenção"
          description="Controle de intervenções preventivas, corretivas e preditivas dos equipamentos."
          action={canCreate ? <Button onClick={openCreate}>Registrar Manutenção</Button> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(m => {
            const eq = equipment.find(e => e.id === m.equipmentId);
            const overdue = isDateOverdue(m.deadline, m.status);
            const overdueText = getOverdueDaysText(m.deadline);
            const effectiveStatus = overdue ? 'overdue' : m.status;

            return (
              <Card key={m.id} className="p-4 hover:shadow-md transition-shadow border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                        <Wrench size={16} className="text-blue-600" /> {eq?.name || 'Equipamento'}
                        {eq?.code && <span className="font-mono text-xs text-gray-500">({eq.code})</span>}
                      </h3>
                      <StatusBadge status={effectiveStatus} />
                      <Badge color="blue">{typeLabels[m.type] || m.type}</Badge>

                      {overdue && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 animate-pulse">
                          ⚠️ {overdueText || 'Atrasada'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-700 font-medium">{m.description}</p>

                    <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-1">
                      <span><strong>Responsável:</strong> {people.find(p => p.id === m.responsibleId)?.name || '—'}</span>
                      <span><strong>Data Registro:</strong> {m.date}</span>
                      <span><strong>Prazo Limite:</strong> {m.deadline || '—'}</span>
                      {m.cost > 0 && <span className="font-semibold text-gray-800">Custo: R$ {m.cost.toFixed(2)}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="secondary" size="sm" onClick={() => setInspectItem(m)}>
                      <Eye size={14} className="inline mr-1" /> Ver Detalhes
                    </Button>
                    {canEdit && (
                      <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                        <Edit2 size={14} />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(m.id)}>
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Inspecionar Registro */}
      {inspectItem && (
        <Modal isOpen={true} onClose={() => setInspectItem(null)} title={`Detalhes da Manutenção: ${inspectItem.description}`} size="lg">
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-gray-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <StatusBadge status={isDateOverdue(inspectItem.deadline, inspectItem.status) ? 'overdue' : inspectItem.status} />
                <Badge color="blue">{typeLabels[inspectItem.type]}</Badge>
              </div>

              {isDateOverdue(inspectItem.deadline, inspectItem.status) && (
                <div className="p-2 bg-red-100 text-red-800 text-xs font-bold rounded-lg border border-red-300 flex items-center gap-1.5">
                  ⚠️ Manutenção com prazo vencido em {inspectItem.deadline} ({getOverdueDaysText(inspectItem.deadline)})
                </div>
              )}

              <p className="text-sm font-semibold text-gray-800">{inspectItem.description}</p>
              {inspectItem.notes && <p className="text-xs text-gray-600 bg-white p-2.5 rounded border border-gray-200">{inspectItem.notes}</p>}
            </div>

            {/* Registros Relacionados */}
            <div className="space-y-2 border-t border-gray-200 pt-3">
              <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider">Conexões no Sistema</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white border border-gray-200 rounded-lg">
                  <span className="font-bold text-gray-500 block mb-0.5">Equipamento:</span>
                  <span className="font-semibold text-gray-800">{equipment.find(e => e.id === inspectItem.equipmentId)?.name || 'N/A'}</span>
                </div>
                <div className="p-3 bg-white border border-gray-200 rounded-lg">
                  <span className="font-bold text-gray-500 block mb-0.5">Responsável Técnico:</span>
                  <span className="font-semibold text-gray-800">{people.find(p => p.id === inspectItem.responsibleId)?.name || 'N/A'}</span>
                </div>
                <div className="p-3 bg-white border border-gray-200 rounded-lg">
                  <span className="font-bold text-gray-500 block mb-0.5">Problema Relacionado:</span>
                  <span className="font-semibold text-gray-800">{problems.find(p => p.id === inspectItem.problemId)?.title || 'Nenhum'}</span>
                </div>
                <div className="p-3 bg-white border border-gray-200 rounded-lg">
                  <span className="font-bold text-gray-500 block mb-0.5">Plano 5W2H Relacionado:</span>
                  <span className="font-semibold text-gray-800">{actionPlans.find(a => a.id === inspectItem.actionPlanId)?.what || 'Nenhum'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="secondary" onClick={() => setInspectItem(null)}>Fechar</Button>
          </div>
        </Modal>
      )}

      {/* Modal Criar / Editar */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Manutenção' : 'Nova Manutenção'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label="Equipamento *" value={form.equipmentId} onChange={e => setForm({ ...form, equipmentId: e.target.value })}>
            <option value="">Selecione...</option>
            {equipment.map(e => <option key={e.id} value={e.id}>{e.name} ({e.code})</option>)}
          </Select>

          <Select label="Tipo" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as MaintenanceType })}>
            <option value="preventive">Preventiva</option>
            <option value="corrective">Corretiva</option>
            <option value="predictive">Preditiva</option>
            <option value="other">Outro</option>
          </Select>

          <div className="md:col-span-2"><Textarea label="Descrição *" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>

          <Select label="Problema Relacionado (Opcional)" value={form.problemId} onChange={e => setForm({ ...form, problemId: e.target.value })}>
            <option value="">Nenhum</option>
            {problems.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>

          <Select label="Plano 5W2H Relacionado (Opcional)" value={form.actionPlanId} onChange={e => setForm({ ...form, actionPlanId: e.target.value })}>
            <option value="">Nenhum</option>
            {actionPlans.map(a => <option key={a.id} value={a.id}>{a.what}</option>)}
          </Select>

          <Select label="Responsável" value={form.responsibleId} onChange={e => setForm({ ...form, responsibleId: e.target.value })}>
            <option value="">Selecione...</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>

          <Select label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as MaintenanceStatus })}>
            <option value="scheduled">Programada</option>
            <option value="in_progress">Em Andamento</option>
            <option value="completed">Concluída</option>
            <option value="overdue">Atrasada</option>
            <option value="cancelled">Cancelada</option>
          </Select>

          <Input label="Data de Registro" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          <Input label="Prazo Limite" type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
          <Input label="Custo estimado / real (R$)" type="number" value={form.cost} onChange={e => setForm({ ...form, cost: Number(e.target.value) })} />

          <div className="md:col-span-2"><Textarea label="Observações" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Registros</Button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)} title="Excluir Registro" message="Tem certeza que deseja excluir este registro de manutenção?" />
    </div>
  );
}
