import React, { useState } from 'react';
import { db } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, Button, Modal, Input, Select, Textarea, StatusBadge, SearchInput, EmptyState, Card, showToast, ConfirmDialog, Badge } from '../components/ui';
import { Plus, BarChart3, Edit2, Trash2, Wrench } from 'lucide-react';
import { NonConformity, CriticalityLevel } from '../types';
import { Permissions } from '../lib/permissions';

export default function Quality() {
  const { user } = useAuth();
  const [items, setItems] = useState(db.getNonConformities());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NonConformity | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const canManage = Permissions.canManageQuality(user);
  const canDelete = Permissions.canDeleteQuality(user);

  const people = db.getPeople();
  const projects = db.getProjects();
  const problems = db.getProblems();
  const actionPlans = db.getActionPlans();
  const equipment = db.getEquipment();

  const emptyForm = {
    title: '',
    description: '',
    cause: '',
    responsibleId: '',
    projectId: '',
    equipmentId: '',
    sector: '',
    severity: 'media' as CriticalityLevel,
    problemId: '',
    actionPlanId: '',
    status: 'identified' as NonConformity['status'],
    evidence: '',
    identificationDate: new Date().toISOString().split('T')[0],
  };
  const [form, setForm] = useState(emptyForm);

  const filtered = items.filter(n => {
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || n.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (n: NonConformity) => {
    setEditing(n);
    setForm({
      title: n.title,
      description: n.description,
      cause: n.cause,
      responsibleId: n.responsibleId,
      projectId: n.projectId,
      equipmentId: n.equipmentId || '',
      sector: n.sector || '',
      severity: n.severity || 'media',
      problemId: n.problemId,
      actionPlanId: n.actionPlanId,
      status: n.status,
      evidence: n.evidence,
      identificationDate: n.identificationDate,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) { showToast('error', 'Título é obrigatório'); return; }
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
    db.addHistory({ userId: user!.id, action: 'Não conformidade excluída', entity: 'nonConformity', entityId: id, details: 'Não conformidade removida' });
    setItems(db.getNonConformities());
    showToast('success', 'Registro excluído');
  };

  const severityColors: Record<string, string> = { baixa: 'gray', media: 'blue', alta: 'orange', critica: 'red' };

  return (
    <div className="space-y-6">
      <PageHeader title="Qualidade" subtitle="Gestão de Não Conformidades integrada a Equipamentos e Planos de Ação" actions={canManage ? <Button onClick={openCreate}><Plus size={16} className="inline mr-1" /> Nova Não Conformidade</Button> : undefined} />

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Pesquisar por título ou causa..." />
        <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-40 text-xs">
          <option value="">Todos os status</option>
          <option value="identified">Identificado</option>
          <option value="analyzing">Em Análise</option>
          <option value="treating">Em Tratamento</option>
          <option value="resolved">Resolvido</option>
          <option value="cancelled">Cancelado</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<BarChart3 size={48} />} title="Nenhuma não conformidade registrada" description="Registre ocorrências de qualidade para controle e planos de tratamento." action={canManage ? <Button onClick={openCreate}>Registrar Não Conformidade</Button> : undefined} />
      ) : (
        <div className="space-y-3">
          {filtered.map(n => {
            const problem = problems.find(p => p.id === n.problemId);
            const plan = actionPlans.find(a => a.id === n.actionPlanId);
            const eq = equipment.find(e => e.id === n.equipmentId);

            return (
              <Card key={n.id} className="p-4 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-gray-800 text-sm">{n.title}</h3>
                      <StatusBadge status={n.status} />
                      <Badge color={severityColors[n.severity || 'media']}>
                        Severidade: {(n.severity || 'Média').toUpperCase()}
                      </Badge>
                      {eq && <Badge color="blue"><Wrench size={12} className="inline mr-1" /> {eq.name}</Badge>}
                    </div>

                    <p className="text-xs text-gray-600">{n.description}</p>
                    {n.cause && <p className="text-xs text-gray-500"><span className="font-semibold text-gray-700">Causa Raiz:</span> {n.cause}</p>}

                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 pt-2 border-t border-gray-100 mt-2">
                      <span><strong>Responsável:</strong> {people.find(p => p.id === n.responsibleId)?.name || '—'}</span>
                      <span><strong>Data:</strong> {n.identificationDate}</span>
                      {n.sector && <span><strong>Setor:</strong> {n.sector}</span>}
                      {problem && <span><strong>Problema:</strong> {problem.title}</span>}
                      {plan && <span><strong>Plano 5W2H:</strong> {plan.what?.substring(0, 30)}...</span>}
                    </div>
                  </div>

                  <div className="flex gap-1 shrink-0">
                    {canManage && (
                      <Button variant="ghost" size="sm" onClick={() => openEdit(n)} title="Editar">
                        <Edit2 size={14} />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(n.id)} title="Excluir">
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Não Conformidade' : 'Nova Não Conformidade'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><Input label="Título *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div className="md:col-span-2"><Textarea label="Descrição" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
          <div className="md:col-span-2"><Textarea label="Causa Raiz" value={form.cause} onChange={e => setForm({ ...form, cause: e.target.value })} rows={2} /></div>

          <Select label="Severidade" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value as CriticalityLevel })}>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </Select>

          <Select label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as NonConformity['status'] })}>
            <option value="identified">Identificado</option>
            <option value="analyzing">Em Análise</option>
            <option value="treating">Em Tratamento</option>
            <option value="resolved">Resolvido</option>
            <option value="cancelled">Cancelado</option>
          </Select>

          <Select label="Equipamento Relacionado" value={form.equipmentId} onChange={e => setForm({ ...form, equipmentId: e.target.value })}>
            <option value="">Nenhum</option>
            {equipment.map(e => <option key={e.id} value={e.id}>{e.name} ({e.code})</option>)}
          </Select>

          <Input label="Setor" value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} />

          <Select label="Responsável" value={form.responsibleId} onChange={e => setForm({ ...form, responsibleId: e.target.value })}>
            <option value="">Selecione...</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>

          <Select label="Projeto" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
            <option value="">Nenhum</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>

          <Select label="Problema Vinculado" value={form.problemId} onChange={e => setForm({ ...form, problemId: e.target.value })}>
            <option value="">Nenhum</option>
            {problems.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>

          <Select label="Plano 5W2H" value={form.actionPlanId} onChange={e => setForm({ ...form, actionPlanId: e.target.value })}>
            <option value="">Nenhum</option>
            {actionPlans.map(a => <option key={a.id} value={a.id}>{a.what?.substring(0, 40) || 'Plano'}</option>)}
          </Select>

          <Input label="Data Identificação" type="date" value={form.identificationDate} onChange={e => setForm({ ...form, identificationDate: e.target.value })} />
          <div className="md:col-span-2"><Textarea label="Evidências" value={form.evidence} onChange={e => setForm({ ...form, evidence: e.target.value })} rows={2} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Registros</Button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)} title="Excluir Registro" message="Tem certeza?" />
    </div>
  );
}
