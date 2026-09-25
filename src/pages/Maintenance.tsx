import React, { useState } from 'react';
import { db } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, Button, Modal, Input, Select, Textarea, StatusBadge, SearchInput, EmptyState, Card, showToast, ConfirmDialog } from '../components/ui';
import { Plus, Settings, Edit2, Trash2 } from 'lucide-react';
import { MaintenanceRecord, MaintenanceType, MaintenanceStatus } from '../types';

export default function Maintenance() {
  const { user } = useAuth();
  const [items, setItems] = useState(db.getMaintenanceRecords());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const equipment = db.getEquipment();
  const people = db.getPeople();

  const emptyForm = { equipmentId: '', type: 'preventive' as MaintenanceType, description: '', responsibleId: '', date: new Date().toISOString().split('T')[0], deadline: '', status: 'scheduled' as MaintenanceStatus, notes: '', cost: 0 };
  const [form, setForm] = useState(emptyForm);

  const filtered = items.filter(m => {
    const eq = equipment.find(e => e.id === m.equipmentId);
    const matchSearch = !search || m.description.toLowerCase().includes(search.toLowerCase()) || eq?.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || m.status === filterStatus;
    const matchType = !filterType || m.type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (m: MaintenanceRecord) => { setEditing(m); setForm({ equipmentId: m.equipmentId, type: m.type, description: m.description, responsibleId: m.responsibleId, date: m.date, deadline: m.deadline, status: m.status, notes: m.notes, cost: m.cost }); setModalOpen(true); };

  const handleSave = () => {
    if (!form.equipmentId) { showToast('error', 'Selecione um equipamento'); return; }
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
    setItems(db.getMaintenanceRecords());
    showToast('success', 'Registro excluído');
  };

  const typeLabels: Record<string, string> = { preventive: 'Preventiva', corrective: 'Corretiva', predictive: 'Preditiva', other: 'Outro' };

  return (
    <div>
      <PageHeader title="Manutenção" subtitle="Registro e controle de manutenções" actions={<Button onClick={openCreate}><Plus size={16} className="inline mr-1" /> Nova Manutenção</Button>} />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Pesquisar..." />
        <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-40">
          <option value="">Todos status</option>
          <option value="scheduled">Programada</option>
          <option value="in_progress">Em Andamento</option>
          <option value="completed">Concluída</option>
          <option value="overdue">Atrasada</option>
          <option value="cancelled">Cancelada</option>
        </Select>
        <Select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-40">
          <option value="">Todos tipos</option>
          <option value="preventive">Preventiva</option>
          <option value="corrective">Corretiva</option>
          <option value="predictive">Preditiva</option>
          <option value="other">Outro</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Settings size={48} />} title="Nenhum registro de manutenção" description="Registre a primeira manutenção." action={<Button onClick={openCreate}>Registrar</Button>} />
      ) : (
        <div className="space-y-3">
          {filtered.map(m => {
            const eq = equipment.find(e => e.id === m.equipmentId);
            return (
              <Card key={m.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-gray-800">{eq?.name || 'Equipamento'}</h3>
                      <StatusBadge status={m.status} />
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{typeLabels[m.type]}</span>
                    </div>
                    <p className="text-sm text-gray-600">{m.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                      <span>Responsável: {people.find(p => p.id === m.responsibleId)?.name || '—'}</span>
                      <span>Data: {m.date}</span>
                      <span>Prazo: {m.deadline || '—'}</span>
                      {m.cost > 0 && <span>Custo: R$ {m.cost.toFixed(2)}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(m)}><Edit2 size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(m.id)}><Trash2 size={14} className="text-red-500" /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Manutenção' : 'Nova Manutenção'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label="Equipamento *" value={form.equipmentId} onChange={e => setForm({ ...form, equipmentId: e.target.value })}>
            <option value="">Selecione...</option>
            {equipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
          <Select label="Tipo" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as MaintenanceType })}>
            <option value="preventive">Preventiva</option>
            <option value="corrective">Corretiva</option>
            <option value="predictive">Preditiva</option>
            <option value="other">Outro</option>
          </Select>
          <div className="md:col-span-2"><Textarea label="Descrição" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
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
          <Input label="Data" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          <Input label="Prazo" type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
          <Input label="Custo (R$)" type="number" value={form.cost} onChange={e => setForm({ ...form, cost: Number(e.target.value) })} />
          <div className="md:col-span-2"><Textarea label="Observações" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)} title="Excluir Registro" message="Tem certeza que deseja excluir este registro de manutenção?" />
    </div>
  );
}
