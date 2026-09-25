import React, { useState } from 'react';
import { db } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, Button, Modal, Input, Select, Textarea, StatusBadge, SearchInput, EmptyState, Card, showToast, ConfirmDialog } from '../components/ui';
import { Plus, BarChart3, Edit2, Trash2 } from 'lucide-react';
import { NonConformity } from '../types';

export default function Quality() {
  const { user } = useAuth();
  const [items, setItems] = useState(db.getNonConformities());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NonConformity | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const people = db.getPeople();
  const projects = db.getProjects();
  const problems = db.getProblems();
  const actionPlans = db.getActionPlans();

  const emptyForm = { title: '', description: '', cause: '', responsibleId: '', projectId: '', problemId: '', actionPlanId: '', status: 'identified' as NonConformity['status'], evidence: '', identificationDate: new Date().toISOString().split('T')[0] };
  const [form, setForm] = useState(emptyForm);

  const filtered = items.filter(n => {
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || n.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (n: NonConformity) => { setEditing(n); setForm({ title: n.title, description: n.description, cause: n.cause, responsibleId: n.responsibleId, projectId: n.projectId, problemId: n.problemId, actionPlanId: n.actionPlanId, status: n.status, evidence: n.evidence, identificationDate: n.identificationDate }); setModalOpen(true); };

  const handleSave = () => {
    if (!form.title) { showToast('error', 'Título é obrigatório'); return; }
    if (editing) {
      db.updateNonConformity(editing.id, form);
      db.addHistory({ userId: user!.id, action: 'Não conformidade atualizada', entity: 'nonConformity', entityId: editing.id, details: form.title });
      showToast('success', 'Não conformidade atualizada');
    } else {
      db.createNonConformity(form);
      db.addHistory({ userId: user!.id, action: 'Não conformidade registrada', entity: 'nonConformity', entityId: 'new', details: form.title });
      showToast('success', 'Não conformidade registrada');
    }
    setItems(db.getNonConformities());
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    db.deleteNonConformity(id);
    setItems(db.getNonConformities());
    showToast('success', 'Registro excluído');
  };

  return (
    <div>
      <PageHeader title="Qualidade" subtitle="Não conformidades e controle de qualidade" actions={<Button onClick={openCreate}><Plus size={16} className="inline mr-1" /> Nova Não Conformidade</Button>} />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Pesquisar..." />
        <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-40">
          <option value="">Todos status</option>
          <option value="identified">Identificado</option>
          <option value="analyzing">Em Análise</option>
          <option value="treating">Em Tratamento</option>
          <option value="resolved">Resolvido</option>
          <option value="cancelled">Cancelado</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<BarChart3 size={48} />} title="Nenhuma não conformidade" description="Registre a primeira não conformidade." action={<Button onClick={openCreate}>Registrar</Button>} />
      ) : (
        <div className="space-y-3">
          {filtered.map(n => {
            const problem = problems.find(p => p.id === n.problemId);
            const plan = actionPlans.find(a => a.id === n.actionPlanId);
            return (
              <Card key={n.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-800">{n.title}</h3>
                      <StatusBadge status={n.status} />
                    </div>
                    <p className="text-sm text-gray-600">{n.description}</p>
                    {n.cause && <p className="text-sm text-gray-500 mt-1"><span className="font-medium">Causa:</span> {n.cause}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-2">
                      <span>Responsável: {people.find(p => p.id === n.responsibleId)?.name || '—'}</span>
                      <span>Data: {n.identificationDate}</span>
                      {problem && <span>Problema: {problem.title}</span>}
                      {plan && <span>Plano: {plan.what?.substring(0, 30)}...</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(n)}><Edit2 size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(n.id)}><Trash2 size={14} className="text-red-500" /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Não Conformidade' : 'Nova Não Conformidade'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><Input label="Título *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div className="md:col-span-2"><Textarea label="Descrição" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
          <div className="md:col-span-2"><Textarea label="Causa" value={form.cause} onChange={e => setForm({ ...form, cause: e.target.value })} rows={2} /></div>
          <Select label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as NonConformity['status'] })}>
            <option value="identified">Identificado</option>
            <option value="analyzing">Em Análise</option>
            <option value="treating">Em Tratamento</option>
            <option value="resolved">Resolvido</option>
            <option value="cancelled">Cancelado</option>
          </Select>
          <Select label="Responsável" value={form.responsibleId} onChange={e => setForm({ ...form, responsibleId: e.target.value })}>
            <option value="">Selecione...</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select label="Projeto" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
            <option value="">Nenhum</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select label="Problema vinculado" value={form.problemId} onChange={e => setForm({ ...form, problemId: e.target.value })}>
            <option value="">Nenhum</option>
            {problems.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>
          <Select label="Plano de Ação" value={form.actionPlanId} onChange={e => setForm({ ...form, actionPlanId: e.target.value })}>
            <option value="">Nenhum</option>
            {actionPlans.map(a => <option key={a.id} value={a.id}>{a.what?.substring(0, 40) || 'Plano'}</option>)}
          </Select>
          <Input label="Data Identificação" type="date" value={form.identificationDate} onChange={e => setForm({ ...form, identificationDate: e.target.value })} />
          <div className="md:col-span-2"><Textarea label="Evidências" value={form.evidence} onChange={e => setForm({ ...form, evidence: e.target.value })} rows={2} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)} title="Excluir Registro" message="Tem certeza?" />
    </div>
  );
}
