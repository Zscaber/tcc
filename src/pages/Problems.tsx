import React, { useState } from 'react';
import { db } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, Button, Modal, Input, Select, Textarea, StatusBadge, SearchInput, EmptyState, Card, showToast, ConfirmDialog } from '../components/ui';
import { Plus, AlertTriangle, Edit2, Trash2, BarChart3, ClipboardList } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { Problem, ProblemCategory, ProblemStatus } from '../types';

export default function Problems() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const projectFilter = searchParams.get('project') || '';
  const [items, setItems] = useState(db.getProblems());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Problem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const people = db.getPeople();
  const projects = db.getProjects();
  const equipment = db.getEquipment();

  const emptyForm = { title: '', description: '', category: 'maintenance' as ProblemCategory, projectId: projectFilter, equipmentId: '', sector: '', responsibleId: '', identificationDate: new Date().toISOString().split('T')[0], status: 'identified' as ProblemStatus, notes: '' };
  const [form, setForm] = useState(emptyForm);

  const filtered = items.filter(p => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || p.status === filterStatus;
    const matchCategory = !filterCategory || p.category === filterCategory;
    return matchSearch && matchStatus && matchCategory;
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (p: Problem) => { setEditing(p); setForm({ title: p.title, description: p.description, category: p.category, projectId: p.projectId, equipmentId: p.equipmentId, sector: p.sector, responsibleId: p.responsibleId, identificationDate: p.identificationDate, status: p.status, notes: p.notes }); setModalOpen(true); };

  const handleSave = () => {
    if (!form.title) { showToast('error', 'Título é obrigatório'); return; }
    if (editing) {
      db.updateProblem(editing.id, form);
      db.addHistory({ userId: user!.id, action: 'Problema atualizado', entity: 'problem', entityId: editing.id, details: form.title });
      showToast('success', 'Problema atualizado');
    } else {
      const newProblem = db.createProblem(form);
      db.addHistory({ userId: user!.id, action: 'Problema registrado', entity: 'problem', entityId: newProblem.id, details: form.title });
      showToast('success', 'Problema registrado');
    }
    setItems(db.getProblems());
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const p = db.getProblemById(id);
    db.deleteProblem(id);
    db.addHistory({ userId: user!.id, action: 'Problema excluído', entity: 'problem', entityId: id, details: p?.title || '' });
    setItems(db.getProblems());
    showToast('success', 'Problema excluído');
  };

  const categoryLabels: Record<string, string> = { maintenance: 'Manutenção', production: 'Produção', quality: 'Qualidade', safety: 'Segurança', other: 'Outro' };
  const categoryColors: Record<string, string> = { maintenance: 'orange', production: 'blue', quality: 'purple', safety: 'red', other: 'gray' };

  return (
    <div>
      <PageHeader title="Problemas e Ocorrências" subtitle="Registro e acompanhamento de problemas" actions={<Button onClick={openCreate}><Plus size={16} className="inline mr-1" /> Novo Problema</Button>} />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Pesquisar problemas..." />
        <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-40">
          <option value="">Todos status</option>
          <option value="identified">Identificado</option>
          <option value="analyzing">Em Análise</option>
          <option value="treating">Em Tratamento</option>
          <option value="resolved">Resolvido</option>
          <option value="cancelled">Cancelado</option>
        </Select>
        <Select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-40">
          <option value="">Todas categorias</option>
          <option value="maintenance">Manutenção</option>
          <option value="production">Produção</option>
          <option value="quality">Qualidade</option>
          <option value="safety">Segurança</option>
          <option value="other">Outro</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<AlertTriangle size={48} />} title="Nenhum problema registrado" description="Registre o primeiro problema para começar o acompanhamento." action={<Button onClick={openCreate}>Registrar Problema</Button>} />
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const gut = db.getGutByProblem(p.id);
            const eq = equipment.find(e => e.id === p.equipmentId);
            const proj = projects.find(pr => pr.id === p.projectId);
            return (
              <Card key={p.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-gray-800">{p.title}</h3>
                      <StatusBadge status={p.status} />
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-${categoryColors[p.category]}-100 text-${categoryColors[p.category]}-700`}>{categoryLabels[p.category]}</span>
                      {gut && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">GUT: {gut.score}</span>}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{p.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      {proj && <span>Projeto: {proj.name}</span>}
                      {eq && <span>Equipamento: {eq.name}</span>}
                      {p.sector && <span>Setor: {p.sector}</span>}
                      <span>Responsável: {people.find(pe => pe.id === p.responsibleId)?.name || '—'}</span>
                      <span>Data: {p.identificationDate}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Link to={`/gut?problem=${p.id}`}><Button variant="ghost" size="sm" title="Análise GUT"><BarChart3 size={14} /></Button></Link>
                    <Link to={`/action-plans?problem=${p.id}`}><Button variant="ghost" size="sm" title="Plano 5W2H"><ClipboardList size={14} /></Button></Link>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Edit2 size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(p.id)}><Trash2 size={14} className="text-red-500" /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Problema' : 'Novo Problema'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><Input label="Título *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div className="md:col-span-2"><Textarea label="Descrição" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
          <Select label="Categoria" value={form.category} onChange={e => setForm({ ...form, category: e.target.value as ProblemCategory })}>
            <option value="maintenance">Manutenção</option>
            <option value="production">Produção</option>
            <option value="quality">Qualidade</option>
            <option value="safety">Segurança</option>
            <option value="other">Outro</option>
          </Select>
          <Select label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ProblemStatus })}>
            <option value="identified">Identificado</option>
            <option value="analyzing">Em Análise</option>
            <option value="treating">Em Tratamento</option>
            <option value="resolved">Resolvido</option>
            <option value="cancelled">Cancelado</option>
          </Select>
          <Select label="Projeto" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
            <option value="">Nenhum</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select label="Equipamento" value={form.equipmentId} onChange={e => setForm({ ...form, equipmentId: e.target.value })}>
            <option value="">Nenhum</option>
            {equipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
          <Input label="Setor" value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} />
          <Select label="Responsável" value={form.responsibleId} onChange={e => setForm({ ...form, responsibleId: e.target.value })}>
            <option value="">Selecione...</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Input label="Data Identificação" type="date" value={form.identificationDate} onChange={e => setForm({ ...form, identificationDate: e.target.value })} />
          <div className="md:col-span-2"><Textarea label="Observações" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)} title="Excluir Problema" message="Tem certeza? A análise GUT associada também será removida." />
    </div>
  );
}
