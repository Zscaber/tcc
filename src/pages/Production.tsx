import React, { useState } from 'react';
import { db } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, Button, Modal, Input, Select, Textarea, StatusBadge, SearchInput, EmptyState, Card, showToast, ConfirmDialog, Badge } from '../components/ui';
import { Plus, FileText, Edit2, Trash2, Wrench } from 'lucide-react';
import { ProductionActivity } from '../types';

export default function Production() {
  const { user } = useAuth();
  const [items, setItems] = useState(db.getProductionActivities());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductionActivity | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const people = db.getPeople();
  const projects = db.getProjects();
  const equipment = db.getEquipment();

  const emptyForm = { title: '', description: '', projectId: '', equipmentId: '', sector: '', responsibleId: '', deadline: '', status: 'pending' as ProductionActivity['status'], notes: '' };
  const [form, setForm] = useState(emptyForm);

  const filtered = items.filter(a => {
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (a: ProductionActivity) => {
    setEditing(a);
    setForm({
      title: a.title,
      description: a.description,
      projectId: a.projectId,
      equipmentId: a.equipmentId || '',
      sector: a.sector,
      responsibleId: a.responsibleId,
      deadline: a.deadline,
      status: a.status,
      notes: a.notes,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) { showToast('error', 'Título é obrigatório'); return; }
    if (editing) {
      db.updateProductionActivity(editing.id, form);
      db.addHistory({ userId: user!.id, action: 'Atividade atualizada', entity: 'production', entityId: editing.id, details: form.title });
      showToast('success', 'Atividade atualizada');
    } else {
      db.createProductionActivity(form);
      db.addHistory({ userId: user!.id, action: 'Atividade criada', entity: 'production', entityId: 'new', details: form.title });
      showToast('success', 'Atividade criada');
    }
    setItems(db.getProductionActivities());
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    db.deleteProductionActivity(id);
    db.addHistory({ userId: user!.id, action: 'Atividade excluída', entity: 'production', entityId: id, details: 'Atividade removida' });
    setItems(db.getProductionActivities());
    showToast('success', 'Atividade excluída');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Produção" subtitle="Atividades de produção com vinculação a equipamentos e setores" actions={<Button onClick={openCreate}><Plus size={16} className="inline mr-1" /> Nova Atividade</Button>} />

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Pesquisar atividades..." />
        <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-40 text-xs">
          <option value="">Todos status</option>
          <option value="pending">Pendente</option>
          <option value="in_progress">Em Andamento</option>
          <option value="completed">Concluída</option>
          <option value="overdue">Atrasada</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<FileText size={48} />} title="Nenhuma atividade" description="Cadastre a primeira atividade de produção." action={<Button onClick={openCreate}>Cadastrar Atividade</Button>} />
      ) : (
        <div className="space-y-3">
          {filtered.map(a => {
            const proj = projects.find(p => p.id === a.projectId);
            const eq = equipment.find(e => e.id === a.equipmentId);

            return (
              <Card key={a.id} className="p-4 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-gray-800 text-sm">{a.title}</h3>
                      <StatusBadge status={a.status} />
                      {eq && <Badge color="blue"><Wrench size={12} className="inline mr-1" /> {eq.name}</Badge>}
                    </div>
                    <p className="text-xs text-gray-600">{a.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 pt-1">
                      {proj && <span><strong>Projeto:</strong> {proj.name}</span>}
                      {a.sector && <span><strong>Setor:</strong> {a.sector}</span>}
                      <span><strong>Responsável:</strong> {people.find(p => p.id === a.responsibleId)?.name || '—'}</span>
                      <span><strong>Prazo:</strong> {a.deadline || '—'}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(a)}><Edit2 size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(a.id)}><Trash2 size={14} className="text-red-500" /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Atividade' : 'Nova Atividade'} size="md">
        <div className="space-y-4">
          <Input label="Título *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <Textarea label="Descrição" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
          
          <div className="grid grid-cols-2 gap-4">
            <Select label="Equipamento Relacionado" value={form.equipmentId} onChange={e => setForm({ ...form, equipmentId: e.target.value })}>
              <option value="">Nenhum</option>
              {equipment.map(e => <option key={e.id} value={e.id}>{e.name} ({e.code})</option>)}
            </Select>

            <Select label="Projeto" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
              <option value="">Nenhum</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>

            <Input label="Setor" value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} />

            <Select label="Responsável" value={form.responsibleId} onChange={e => setForm({ ...form, responsibleId: e.target.value })}>
              <option value="">Selecione...</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>

            <Input label="Prazo" type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />

            <Select label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ProductionActivity['status'] })}>
              <option value="pending">Pendente</option>
              <option value="in_progress">Em Andamento</option>
              <option value="completed">Concluída</option>
              <option value="overdue">Atrasada</option>
            </Select>
          </div>

          <Textarea label="Observações" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Atividade</Button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)} title="Excluir Atividade" message="Tem certeza?" />
    </div>
  );
}
