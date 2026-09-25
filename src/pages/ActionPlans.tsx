import React, { useState } from 'react';
import { db } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, Button, Modal, Input, Select, Textarea, StatusBadge, SearchInput, EmptyState, Card, showToast, ConfirmDialog, Badge } from '../components/ui';
import { Plus, ClipboardList, Edit2, Trash2, Copy, BrainCircuit } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { ActionPlan, ActionPlanStatus } from '../types';

export default function ActionPlans() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const problemFilter = searchParams.get('problem') || '';
  const projectFilter = searchParams.get('project') || '';
  const [items, setItems] = useState(db.getActionPlans());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [editing, setEditing] = useState<ActionPlan | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const people = db.getPeople();
  const problems = db.getProblems();
  const projects = db.getProjects();
  const equipment = db.getEquipment();

  const emptyForm = { what: '', why: '', where: '', when: '', who: [] as string[], how: '', howMuch: '', problemId: problemFilter, equipmentId: '', projectId: projectFilter, status: 'pending' as ActionPlanStatus };
  const [form, setForm] = useState(emptyForm);
  const [aiPrompt, setAiPrompt] = useState('');

  // Check overdue
  const checkOverdue = (plan: ActionPlan) => {
    if (plan.status === 'completed' || plan.status === 'cancelled') return;
    if (plan.when && new Date(plan.when) < new Date()) {
      db.updateActionPlan(plan.id, { status: 'overdue' });
    }
  };
  items.forEach(checkOverdue);

  const filtered = items.filter(a => {
    const matchSearch = !search || a.what.toLowerCase().includes(search.toLowerCase()) || a.why.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (a: ActionPlan) => { setEditing(a); setForm({ what: a.what, why: a.why, where: a.where, when: a.when, who: a.who, how: a.how, howMuch: a.howMuch, problemId: a.problemId, equipmentId: a.equipmentId, projectId: a.projectId, status: a.status }); setModalOpen(true); };

  const handleSave = () => {
    if (!form.what && !form.why) { showToast('error', 'Preencha pelo menos o campo "O quê"'); return; }
    if (editing) {
      db.updateActionPlan(editing.id, form);
      db.addHistory({ userId: user!.id, action: 'Plano 5W2H atualizado', entity: 'actionPlan', entityId: editing.id, details: form.what.substring(0, 50) });
      showToast('success', 'Plano atualizado');
    } else {
      db.createActionPlan(form);
      db.addHistory({ userId: user!.id, action: 'Plano 5W2H criado', entity: 'actionPlan', entityId: 'new', details: form.what.substring(0, 50) });
      showToast('success', 'Plano criado');
    }
    setItems(db.getActionPlans());
    setModalOpen(false);
  };

  const handleDuplicate = (a: ActionPlan) => {
    db.createActionPlan({ ...a, id: '', status: 'pending', createdAt: '' } as any);
    setItems(db.getActionPlans());
    showToast('success', 'Plano duplicado');
  };

  const handleDelete = (id: string) => {
    db.deleteActionPlan(id);
    setItems(db.getActionPlans());
    showToast('success', 'Plano excluído');
  };

  // Simple AI suggestion (template-based, ready for API integration)
  const generateAiSuggestion = () => {
    const problem = problems.find(p => p.id === form.problemId);
    const description = problem?.description || form.what || aiPrompt;
    if (!description) { showToast('error', 'Descreva o problema primeiro'); return; }

    // Template-based AI (replaceable with real API)
    const suggestions = {
      what: `Resolver: ${description.substring(0, 60)}`,
      why: `Eliminar a causa raiz do problema identificado`,
      where: problem ? `${equipment.find(e => e.id === problem.equipmentId)?.name || 'Setor'} — ${problem.sector || 'área indicada'}` : 'Local a definir',
      when: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      how: '1. Analisar causa raiz\n2. Definir solução\n3. Executar ação\n4. Verificar resultado',
      howMuch: 'A definir',
    };
    setForm({ ...form, ...suggestions });
    setAiModalOpen(false);
    showToast('info', 'Sugestão gerada — edite conforme necessário');
  };

  return (
    <div>
      <PageHeader title="Planos de Ação 5W2H" subtitle="Gerenciamento de planos de ação" actions={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setAiPrompt(''); setAiModalOpen(true); }}><BrainCircuit size={16} className="inline mr-1" /> IA</Button>
          <Button onClick={openCreate}><Plus size={16} className="inline mr-1" /> Novo Plano</Button>
        </div>
      } />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Pesquisar planos..." />
        <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-40">
          <option value="">Todos status</option>
          <option value="pending">Pendente</option>
          <option value="in_progress">Em Andamento</option>
          <option value="completed">Concluído</option>
          <option value="overdue">Atrasado</option>
          <option value="cancelled">Cancelado</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<ClipboardList size={48} />} title="Nenhum plano de ação" description="Crie o primeiro plano de ação 5W2H." action={<Button onClick={openCreate}>Criar Plano</Button>} />
      ) : (
        <div className="space-y-4">
          {filtered.map(a => {
            const problem = problems.find(p => p.id === a.problemId);
            const project = projects.find(p => p.id === a.projectId);
            return (
              <Card key={a.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={a.status} />
                    {a.when && new Date(a.when) < new Date() && a.status !== 'completed' && a.status !== 'cancelled' && <Badge color="red">Atrasado</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(a)}><Edit2 size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDuplicate(a)}><Copy size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(a.id)}><Trash2 size={14} className="text-red-500" /></Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                  <div><span className="text-gray-500 font-medium">What:</span> <span className="text-gray-800">{a.what || '—'}</span></div>
                  <div><span className="text-gray-500 font-medium">Why:</span> <span className="text-gray-800">{a.why || '—'}</span></div>
                  <div><span className="text-gray-500 font-medium">Where:</span> <span className="text-gray-800">{a.where || '—'}</span></div>
                  <div><span className="text-gray-500 font-medium">When:</span> <span className="text-gray-800">{a.when || '—'}</span></div>
                  <div><span className="text-gray-500 font-medium">Who:</span> <span className="text-gray-800">{a.who.map(id => people.find(p => p.id === id)?.name).filter(Boolean).join(', ') || '—'}</span></div>
                  <div><span className="text-gray-500 font-medium">How Much:</span> <span className="text-gray-800">{a.howMuch || '—'}</span></div>
                </div>
                {a.how && <p className="mt-2 text-sm text-gray-600 whitespace-pre-line"><span className="text-gray-500 font-medium">How: </span>{a.how}</p>}
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                  {problem && <span>Problema: {problem.title}</span>}
                  {project && <span>Projeto: {project.name}</span>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* AI Modal */}
      <Modal isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} title="Assistente IA — Sugestão 5W2H">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Descreva o problema e a IA sugerirá uma estrutura 5W2H inicial.</p>
          <Textarea label="Descrição do problema" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={3} placeholder="Ex: A máquina apresenta vazamento de óleo..." />
          <Button onClick={generateAiSuggestion}><BrainCircuit size={16} className="inline mr-1" /> Gerar Sugestão</Button>
        </div>
      </Modal>

      {/* Form Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Plano 5W2H' : 'Novo Plano 5W2H'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><Textarea label="What — O quê?" value={form.what} onChange={e => setForm({ ...form, what: e.target.value })} rows={2} /></div>
          <div className="md:col-span-2"><Textarea label="Why — Por quê?" value={form.why} onChange={e => setForm({ ...form, why: e.target.value })} rows={2} /></div>
          <Input label="Where — Onde?" value={form.where} onChange={e => setForm({ ...form, where: e.target.value })} />
          <Input label="When — Quando?" type="date" value={form.when} onChange={e => setForm({ ...form, when: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Who — Quem?</label>
            <select multiple value={form.who} onChange={e => setForm({ ...form, who: Array.from(e.target.selectedOptions, o => o.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white h-20">
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">Segure Ctrl para selecionar vários</p>
          </div>
          <Input label="How Much — Quanto?" value={form.howMuch} onChange={e => setForm({ ...form, howMuch: e.target.value })} />
          <div className="md:col-span-2"><Textarea label="How — Como?" value={form.how} onChange={e => setForm({ ...form, how: e.target.value })} rows={3} /></div>
          <Select label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ActionPlanStatus })}>
            <option value="pending">Pendente</option>
            <option value="in_progress">Em Andamento</option>
            <option value="completed">Concluído</option>
            <option value="cancelled">Cancelado</option>
          </Select>
          <Select label="Problema vinculado" value={form.problemId} onChange={e => setForm({ ...form, problemId: e.target.value })}>
            <option value="">Nenhum</option>
            {problems.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>
          <Select label="Projeto" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
            <option value="">Nenhum</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select label="Equipamento" value={form.equipmentId} onChange={e => setForm({ ...form, equipmentId: e.target.value })}>
            <option value="">Nenhum</option>
            {equipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)} title="Excluir Plano" message="Tem certeza que deseja excluir este plano de ação?" />
    </div>
  );
}
