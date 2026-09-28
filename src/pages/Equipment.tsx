import React, { useState } from 'react';
import { db } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, Button, Modal, Input, Select, Textarea, StatusBadge, SearchInput, EmptyState, Card, showToast, ConfirmDialog, Badge } from '../components/ui';
import { Plus, Wrench, Edit2, Trash2, Eye, Calendar, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Equipment, EquipmentStatus, CriticalityLevel } from '../types';

export default function EquipmentPage() {
  const { user } = useAuth();
  const [items, setItems] = useState(db.getEquipment());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCriticality, setFilterCriticality] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const people = db.getPeople();

  const emptyForm = {
    name: '',
    code: '',
    type: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    sector: '',
    location: '',
    responsibleId: '',
    status: 'operating' as EquipmentStatus,
    criticality: 'media' as CriticalityLevel,
    acquisitionDate: '',
    lastMaintenance: '',
    nextMaintenance: '',
    notes: '',
  };
  const [form, setForm] = useState(emptyForm);

  const filtered = items.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || e.status === filterStatus;
    const matchCriticality = !filterCriticality || e.criticality === filterCriticality;
    return matchSearch && matchStatus && matchCriticality;
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (e: Equipment) => {
    setEditing(e);
    setForm({
      name: e.name,
      code: e.code,
      type: e.type,
      manufacturer: e.manufacturer,
      model: e.model,
      serialNumber: e.serialNumber,
      sector: e.sector,
      location: e.location,
      responsibleId: e.responsibleId,
      status: e.status,
      criticality: e.criticality || 'media',
      acquisitionDate: e.acquisitionDate,
      lastMaintenance: e.lastMaintenance,
      nextMaintenance: e.nextMaintenance,
      notes: e.notes,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { showToast('error', 'Nome é obrigatório'); return; }
    if (editing) {
      db.updateEquipment(editing.id, form);
      db.addHistory({ userId: user!.id, action: 'Equipamento atualizado', entity: 'equipment', entityId: editing.id, details: form.name });
      showToast('success', 'Equipamento atualizado');
    } else {
      db.createEquipment(form);
      db.addHistory({ userId: user!.id, action: 'Equipamento cadastrado', entity: 'equipment', entityId: 'new', details: form.name });
      showToast('success', 'Equipamento cadastrado');
    }
    setItems(db.getEquipment());
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const e = db.getEquipmentById(id);
    db.deleteEquipment(id);
    db.addHistory({ userId: user!.id, action: 'Equipamento excluído', entity: 'equipment', entityId: id, details: e?.name || '' });
    setItems(db.getEquipment());
    showToast('success', 'Equipamento excluído');
  };

  const detail = detailOpen ? items.find(e => e.id === detailOpen) : null;
  const maintenanceHistory = detail ? db.getMaintenanceRecords().filter(m => m.equipmentId === detail.id) : [];

  const criticalityColors: Record<string, string> = { baixa: 'gray', media: 'blue', alta: 'orange', critica: 'red' };
  const criticalityLabels: Record<string, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' };

  return (
    <div className="space-y-6">
      <PageHeader title="Equipamentos" subtitle="Cadastro, criticidade e histórico de manutenção por equipamento" actions={<Button onClick={openCreate}><Plus size={16} className="inline mr-1" /> Novo Equipamento</Button>} />

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Pesquisar por nome ou código..." />
        <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-44 text-xs">
          <option value="">Todos os status</option>
          <option value="operating">Em Operação</option>
          <option value="maintenance">Em Manutenção</option>
          <option value="stopped">Parado</option>
          <option value="out_of_service">Fora de Uso</option>
        </Select>
        <Select value={filterCriticality} onChange={e => setFilterCriticality(e.target.value)} className="w-44 text-xs">
          <option value="">Todas criticidades</option>
          <option value="baixa">Criticidade Baixa</option>
          <option value="media">Criticidade Média</option>
          <option value="alta">Criticidade Alta</option>
          <option value="critica">Criticidade Crítica</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Wrench size={48} />} title="Nenhum equipamento cadastrado" description="Cadastre o primeiro equipamento para gerenciar manutenções." action={<Button onClick={openCreate}>Cadastrar Equipamento</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(e => (
            <Card key={e.id} className="p-4 hover:shadow-md transition-shadow border border-gray-200 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-gray-800 text-base">{e.name}</h3>
                    <p className="text-xs text-gray-500 font-mono">{e.code} — {e.type}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={e.status} />
                    <Badge color={criticalityColors[e.criticality || 'media']}>
                      Criticidade: {criticalityLabels[e.criticality || 'media']}
                    </Badge>
                  </div>
                </div>
                <div className="text-xs text-gray-600 space-y-1 mb-4 bg-slate-50 p-2.5 rounded-lg border border-gray-100">
                  <p><strong>Fabricante:</strong> {e.manufacturer || '—'} | <strong>Modelo:</strong> {e.model || '—'}</p>
                  <p><strong>Setor:</strong> {e.sector || '—'} | <strong>Local:</strong> {e.location || '—'}</p>
                  <p><strong>Próx. Manutenção:</strong> <span className="font-semibold text-blue-700">{e.nextMaintenance || '—'}</span></p>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <Button variant="secondary" size="sm" onClick={() => setDetailOpen(e.id)} className="flex-1">
                  <Eye size={14} className="inline mr-1" /> Histórico & Detalhes
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>
                  <Edit2 size={14} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(e.id)}>
                  <Trash2 size={14} className="text-red-500" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal com Timeline de Manutenção */}
      <Modal isOpen={!!detail} onClose={() => setDetailOpen(null)} title={`Ficha Técnica: ${detail?.name || ''}`} size="lg">
        {detail && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-gray-200">
              <div><span className="text-gray-500">Código:</span> <strong>{detail.code}</strong></div>
              <div><span className="text-gray-500">Tipo:</span> <strong>{detail.type}</strong></div>
              <div><span className="text-gray-500">Fabricante:</span> {detail.manufacturer || '—'}</div>
              <div><span className="text-gray-500">Modelo:</span> {detail.model || '—'}</div>
              <div><span className="text-gray-500">Nº Série:</span> {detail.serialNumber || '—'}</div>
              <div><span className="text-gray-500">Setor:</span> {detail.sector || '—'}</div>
              <div><span className="text-gray-500">Localização:</span> {detail.location || '—'}</div>
              <div><span className="text-gray-500">Responsável:</span> {people.find(p => p.id === detail.responsibleId)?.name || '—'}</div>
              <div><span className="text-gray-500">Aquisição:</span> {detail.acquisitionDate || '—'}</div>
              <div><span className="text-gray-500">Criticidade:</span> <Badge color={criticalityColors[detail.criticality || 'media']}>{criticalityLabels[detail.criticality || 'media']}</Badge></div>
              <div><span className="text-gray-500">Status Operacional:</span> <StatusBadge status={detail.status} /></div>
              <div><span className="text-gray-500">Próxima Manutenção:</span> <strong>{detail.nextMaintenance || '—'}</strong></div>
            </div>

            {/* Linha do Tempo de Manutenções (Timeline Format) */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-gray-800 flex items-center gap-1.5 border-b pb-2">
                <Clock size={16} className="text-blue-600" /> Histórico de Manutenções (Linha do Tempo)
              </h4>

              {maintenanceHistory.length === 0 ? (
                <p className="text-xs text-gray-400 italic bg-gray-50 p-4 rounded-lg text-center">Nenhuma manutenção registrada no histórico deste equipamento.</p>
              ) : (
                <ol className="relative border-l border-blue-200 ml-3 space-y-4 py-2">
                  {maintenanceHistory.map(m => (
                    <li key={m.id} className="ml-4">
                      <div className="absolute w-3 h-3 bg-blue-600 rounded-full -left-[6.5px] border border-white" />
                      <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-800">{m.description}</span>
                          <StatusBadge status={m.status} />
                        </div>
                        <p className="text-[11px] text-gray-500">
                          Data: <strong>{m.date}</strong> | Tipo: <span className="capitalize">{m.type}</span> | Responsável: {people.find(p => p.id === m.responsibleId)?.name || '—'}
                        </p>
                        {m.cost > 0 && <p className="text-[10px] text-emerald-700 font-semibold">Custo: R$ {m.cost.toFixed(2)}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setDetailOpen(null)}>Fechar</Button>
        </div>
      </Modal>

      {/* Form Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Equipamento' : 'Novo Equipamento'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nome *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Código/Patrimônio" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
          <Input label="Tipo" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} />
          <Select label="Criticidade" value={form.criticality} onChange={e => setForm({ ...form, criticality: e.target.value as CriticalityLevel })}>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </Select>
          <Input label="Fabricante" value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} />
          <Input label="Modelo" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
          <Input label="Nº Série" value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} />
          <Input label="Setor" value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} />
          <Input label="Localização" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
          <Select label="Responsável" value={form.responsibleId} onChange={e => setForm({ ...form, responsibleId: e.target.value })}>
            <option value="">Selecione...</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select label="Status Operacional" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as EquipmentStatus })}>
            <option value="operating">Em Operação</option>
            <option value="maintenance">Em Manutenção</option>
            <option value="stopped">Parado</option>
            <option value="out_of_service">Fora de Uso</option>
          </Select>
          <Input label="Data Aquisição" type="date" value={form.acquisitionDate} onChange={e => setForm({ ...form, acquisitionDate: e.target.value })} />
          <Input label="Última Manutenção" type="date" value={form.lastMaintenance} onChange={e => setForm({ ...form, lastMaintenance: e.target.value })} />
          <Input label="Próxima Manutenção" type="date" value={form.nextMaintenance} onChange={e => setForm({ ...form, nextMaintenance: e.target.value })} />
          <div className="md:col-span-2"><Textarea label="Observações" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)} title="Excluir Equipamento" message="Tem certeza que deseja excluir este equipamento?" />
    </div>
  );
}
