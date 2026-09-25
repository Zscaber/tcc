import React, { useState } from 'react';
import { db } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, Button, Modal, Input, Select, Textarea, StatusBadge, SearchInput, EmptyState, Card, showToast, ConfirmDialog } from '../components/ui';
import { Plus, Wrench, Edit2, Trash2, Eye } from 'lucide-react';
import { Equipment, EquipmentStatus } from '../types';

export default function EquipmentPage() {
  const { user } = useAuth();
  const [items, setItems] = useState(db.getEquipment());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const people = db.getPeople();

  const emptyForm = { name: '', code: '', type: '', manufacturer: '', model: '', serialNumber: '', sector: '', location: '', responsibleId: '', status: 'operating' as EquipmentStatus, acquisitionDate: '', lastMaintenance: '', nextMaintenance: '', notes: '' };
  const [form, setForm] = useState(emptyForm);

  const filtered = items.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || e.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (e: Equipment) => { setEditing(e); setForm({ name: e.name, code: e.code, type: e.type, manufacturer: e.manufacturer, model: e.model, serialNumber: e.serialNumber, sector: e.sector, location: e.location, responsibleId: e.responsibleId, status: e.status, acquisitionDate: e.acquisitionDate, lastMaintenance: e.lastMaintenance, nextMaintenance: e.nextMaintenance, notes: e.notes }); setModalOpen(true); };

  const handleSave = () => {
    if (!form.name) { showToast('error', 'Nome é obrigatório'); return; }
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

  return (
    <div>
      <PageHeader title="Equipamentos" subtitle="Gestão de equipamentos" actions={<Button onClick={openCreate}><Plus size={16} className="inline mr-1" /> Novo Equipamento</Button>} />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Pesquisar equipamentos..." />
        <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-48">
          <option value="">Todos os status</option>
          <option value="operating">Em Operação</option>
          <option value="maintenance">Em Manutenção</option>
          <option value="stopped">Parado</option>
          <option value="out_of_service">Fora de Uso</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Wrench size={48} />} title="Nenhum equipamento cadastrado" description="Cadastre o primeiro equipamento para começar." action={<Button onClick={openCreate}>Cadastrar Equipamento</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(e => (
            <Card key={e.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-800">{e.name}</h3>
                  <p className="text-xs text-gray-500">{e.code} — {e.type}</p>
                </div>
                <StatusBadge status={e.status} />
              </div>
              <div className="text-xs text-gray-500 space-y-1 mb-3">
                <p>Fabricante: {e.manufacturer || '—'} | Modelo: {e.model || '—'}</p>
                <p>Setor: {e.sector || '—'} | Local: {e.location || '—'}</p>
                <p>Próx. manutenção: {e.nextMaintenance || '—'}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setDetailOpen(e.id)}><Eye size={14} className="inline mr-1" /> Ver</Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(e)}><Edit2 size={14} /></Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(e.id)}><Trash2 size={14} className="text-red-500" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal isOpen={!!detail} onClose={() => setDetailOpen(null)} title={detail?.name || ''} size="lg">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Código:</span> {detail.code}</div>
              <div><span className="text-gray-500">Tipo:</span> {detail.type}</div>
              <div><span className="text-gray-500">Fabricante:</span> {detail.manufacturer}</div>
              <div><span className="text-gray-500">Modelo:</span> {detail.model}</div>
              <div><span className="text-gray-500">Nº Série:</span> {detail.serialNumber}</div>
              <div><span className="text-gray-500">Setor:</span> {detail.sector}</div>
              <div><span className="text-gray-500">Localização:</span> {detail.location}</div>
              <div><span className="text-gray-500">Responsável:</span> {people.find(p => p.id === detail.responsibleId)?.name || '—'}</div>
              <div><span className="text-gray-500">Aquisição:</span> {detail.acquisitionDate}</div>
              <div><span className="text-gray-500">Última Manutenção:</span> {detail.lastMaintenance}</div>
              <div><span className="text-gray-500">Próxima Manutenção:</span> {detail.nextMaintenance}</div>
              <div><span className="text-gray-500">Status:</span> <StatusBadge status={detail.status} /></div>
            </div>
            {detail.notes && <p className="text-sm text-gray-600">{detail.notes}</p>}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Histórico de Manutenção</h4>
              {maintenanceHistory.length === 0 ? <p className="text-sm text-gray-500">Nenhum registro</p> : (
                <div className="space-y-2">
                  {maintenanceHistory.map(m => (
                    <div key={m.id} className="p-2 bg-gray-50 rounded text-sm">
                      <span className="font-medium">{m.type}</span> — {m.description} <StatusBadge status={m.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Form Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Equipamento' : 'Novo Equipamento'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nome *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Código/Patrimônio" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
          <Input label="Tipo" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} />
          <Input label="Fabricante" value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} />
          <Input label="Modelo" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
          <Input label="Nº Série" value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} />
          <Input label="Setor" value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} />
          <Input label="Localização" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
          <Select label="Responsável" value={form.responsibleId} onChange={e => setForm({ ...form, responsibleId: e.target.value })}>
            <option value="">Selecione...</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as EquipmentStatus })}>
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
