import React, { useState } from 'react';
import { db } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, Button, Modal, Input, Select, Textarea, StatusBadge, SearchInput, EmptyState, Card, showToast, ConfirmDialog } from '../components/ui';
import { Plus, FolderKanban, Edit2, Trash2, Eye, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Project, ProjectStatus } from '../types';
import { Permissions } from '../lib/permissions';

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState(db.getProjects());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const people = db.getPeople();

  const canCreate = Permissions.canCreateProject(user);
  const canEdit = Permissions.canEditProject(user);
  const canDelete = Permissions.canDeleteProject(user);

  const [form, setForm] = useState({ name: '', code: '', description: '', sector: '', responsibleId: '', teamIds: [] as string[], startDate: '', deadline: '', status: 'planning' as ProjectStatus, notes: '' });

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openCreate = () => {
    if (!canCreate) return;
    setEditingProject(null);
    setForm({ name: '', code: '', description: '', sector: '', responsibleId: '', teamIds: [], startDate: '', deadline: '', status: 'planning', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (p: Project) => {
    if (!canEdit) return;
    setEditingProject(p);
    setForm({ name: p.name, code: p.code, description: p.description, sector: p.sector, responsibleId: p.responsibleId, teamIds: p.teamIds, startDate: p.startDate, deadline: p.deadline, status: p.status, notes: p.notes });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name) { showToast('error', 'Nome é obrigatório'); return; }
    if (editingProject) {
      if (!canEdit) { showToast('error', 'Sem permissão'); return; }
      db.updateProject(editingProject.id, form);
      db.addHistory({ userId: user!.id, action: 'Projeto atualizado', entity: 'project', entityId: editingProject.id, details: `${form.name}` });
      showToast('success', 'Projeto atualizado');
    } else {
      if (!canCreate) { showToast('error', 'Sem permissão'); return; }
      db.createProject(form);
      db.addHistory({ userId: user!.id, action: 'Projeto criado', entity: 'project', entityId: 'new', details: `${form.name}` });
      showToast('success', 'Projeto criado');
    }
    setProjects(db.getProjects());
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!canDelete) { showToast('error', 'Apenas administradores podem excluir projetos'); return; }
    const p = db.getProjectById(id);
    db.deleteProject(id);
    db.addHistory({ userId: user!.id, action: 'Projeto excluído', entity: 'project', entityId: id, details: `${p?.name}` });
    setProjects(db.getProjects());
    showToast('success', 'Projeto excluído');
  };

  return (
    <div>
      <PageHeader
        title="Projetos"
        subtitle="Acompanhamento e gestão de projetos industriais"
        actions={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus size={16} className="inline mr-1" /> Novo Projeto
            </Button>
          ) : undefined
        }
      />

      {!canCreate && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-xs text-blue-800 mb-4">
          <Info size={16} className="shrink-0 text-blue-600" />
          <span>
            <strong>Modo Consulta:</strong> Visualização de projetos industriais cadastrados pela gestão.
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Pesquisar projetos..." />
        <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-48">
          <option value="">Todos os status</option>
          <option value="planning">Planejamento</option>
          <option value="in_progress">Em Andamento</option>
          <option value="paused">Pausado</option>
          <option value="completed">Concluído</option>
          <option value="cancelled">Cancelado</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={48} />}
          title="Nenhum projeto encontrado"
          description="Acompanhamento e controle de iniciativas e projetos da planta."
          action={canCreate ? <Button onClick={openCreate}>Criar Projeto</Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-800">{p.name}</h3>
                  <p className="text-xs text-gray-500">{p.code}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{p.description}</p>
              <div className="text-xs text-gray-500 space-y-1 mb-3">
                <p>Setor: {p.sector || '—'}</p>
                <p>Responsável: {people.find(pe => pe.id === p.responsibleId)?.name || '—'}</p>
                <p>Prazo: {p.deadline || '—'}</p>
              </div>
              <div className="flex gap-2">
                <Link to={`/projects/${p.id}`} className="flex-1"><Button variant="secondary" size="sm" className="w-full"><Eye size={14} className="inline mr-1" /> Ver</Button></Link>
                {canEdit && <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Edit2 size={14} /></Button>}
                {canDelete && <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(p.id)}><Trash2 size={14} className="text-red-500" /></Button>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingProject ? 'Editar Projeto' : 'Novo Projeto'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nome *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Código" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
          <Input label="Setor" value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} />
          <Select label="Responsável" value={form.responsibleId} onChange={e => setForm({ ...form, responsibleId: e.target.value })}>
            <option value="">Selecione...</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Input label="Data de Início" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
          <Input label="Prazo" type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
          <Select label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ProjectStatus })}>
            <option value="planning">Planejamento</option>
            <option value="in_progress">Em Andamento</option>
            <option value="paused">Pausado</option>
            <option value="completed">Concluído</option>
            <option value="cancelled">Cancelado</option>
          </Select>
          <div className="md:col-span-2">
            <Textarea label="Descrição" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <div className="md:col-span-2">
            <Textarea label="Observações" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)} title="Excluir Projeto" message="Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita." />
    </div>
  );
}
