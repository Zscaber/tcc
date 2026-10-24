import React, { useState } from 'react';
import { db, isDateOverdue } from '../store';
import { useAuth } from '../contexts/AuthContext';
import {
  PageHeader,
  Button,
  Modal,
  Input,
  Select,
  Textarea,
  StatusBadge,
  SearchInput,
  EmptyState,
  Card,
  showToast,
  ConfirmDialog,
  Badge,
} from '../components/ui';
import {
  Plus,
  ClipboardList,
  Edit2,
  Trash2,
  Copy,
  BrainCircuit,
  LayoutList,
  Kanban as KanbanIcon,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { ActionPlan, ActionPlanStatus } from '../types';
import { generate5W2HAiSuggestion, Ai5W2HSuggestion } from '../services/aiService';
import { Permissions } from '../lib/permissions';

export default function ActionPlans() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const problemFilter = searchParams.get('problem') || '';
  const projectFilter = searchParams.get('project') || '';
  const [items, setItems] = useState(db.getActionPlans());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ActionPlan | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // AI Generation & Review Modal state
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<Ai5W2HSuggestion>({
    what: '',
    why: '',
    where: '',
    when: '',
    who: '',
    how: '',
    howMuch: '',
  });

  const people = db.getPeople();
  const problems = db.getProblems();
  const projects = db.getProjects();
  const equipment = db.getEquipment();

  const emptyForm = {
    what: '',
    why: '',
    where: '',
    when: '',
    who: [] as string[],
    how: '',
    howMuch: '',
    problemId: problemFilter,
    equipmentId: '',
    projectId: projectFilter,
    status: 'pending' as ActionPlanStatus,
  };
  const [form, setForm] = useState(emptyForm);

  const filtered = items.filter(a => {
    const matchSearch =
      !search ||
      a.what.toLowerCase().includes(search.toLowerCase()) ||
      a.why.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (a: ActionPlan) => {
    setEditing(a);
    setForm({
      what: a.what,
      why: a.why,
      where: a.where,
      when: a.when,
      who: a.who,
      how: a.how,
      howMuch: a.howMuch,
      problemId: a.problemId,
      equipmentId: a.equipmentId,
      projectId: a.projectId,
      status: a.status,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.what.trim() && !form.why.trim()) {
      showToast('error', 'Preencha o campo "What — O quê"');
      return;
    }
    if (editing) {
      db.updateActionPlan(editing.id, form);
      db.addHistory({
        userId: user!.id,
        action: 'Plano 5W2H atualizado',
        entity: 'actionPlan',
        entityId: editing.id,
        details: form.what.substring(0, 50),
      });
      showToast('success', 'Plano 5W2H atualizado');
    } else {
      db.createActionPlan(form);
      db.addHistory({
        userId: user!.id,
        action: 'Plano 5W2H criado',
        entity: 'actionPlan',
        entityId: 'new',
        details: form.what.substring(0, 50),
      });
      showToast('success', 'Plano 5W2H criado');
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

  // ====================================================================
  // AI GENERATION TRIGGER (CONTEXT-AWARE)
  // ====================================================================
  const handleTriggerAi = async () => {
    const selectedProblem = problems.find(p => p.id === form.problemId);
    const selectedEquipment = equipment.find(
      e => e.id === form.equipmentId || (selectedProblem && e.id === selectedProblem.equipmentId)
    );
    const selectedProject = projects.find(
      p => p.id === form.projectId || (selectedProblem && p.id === selectedProblem.projectId)
    );
    const gutAnalysis = selectedProblem ? db.getGutByProblem(selectedProblem.id) : undefined;

    if (!selectedProblem && !selectedEquipment && !form.what.trim()) {
      showToast(
        'error',
        'Selecione um Problema, Equipamento ou digite uma descrição em "O quê" para a IA analisar.'
      );
      return;
    }

    setIsGeneratingAi(true);

    try {
      const result = await generate5W2HAiSuggestion({
        problem: selectedProblem,
        equipment: selectedEquipment,
        gut: gutAnalysis,
        project: selectedProject,
        people: people,
        userPrompt: form.what || form.why || '',
      });

      if (!result.success || !result.data) {
        showToast('error', result.error || 'Não foi possível gerar a sugestão da IA.');
        return;
      }

      // Auto-set the equipment if found from problem
      if (!form.equipmentId && selectedProblem?.equipmentId) {
        setForm(prev => ({ ...prev, equipmentId: selectedProblem.equipmentId }));
      }

      setAiSuggestion(result.data);
      setReviewModalOpen(true);
      showToast('success', 'Sugestão 5W2H gerada com sucesso pela IA! Revise os campos.');
    } catch (err: any) {
      showToast('error', err?.message || 'Falha ao consultar IA.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Apply reviewed AI suggestion into the form (never overwrites without explicit user choice)
  const handleApplyAiSuggestion = () => {
    // Resolve who selection array
    let newWho = [...form.who];
    if (aiSuggestion.whoId && !newWho.includes(aiSuggestion.whoId)) {
      newWho = [aiSuggestion.whoId];
    }

    setForm({
      ...form,
      what: aiSuggestion.what || form.what,
      why: aiSuggestion.why || form.why,
      where: aiSuggestion.where || form.where,
      when: aiSuggestion.when || form.when,
      who: newWho.length > 0 ? newWho : form.who,
      how: aiSuggestion.how || form.how,
      howMuch: aiSuggestion.howMuch || form.howMuch,
    });

    setReviewModalOpen(false);
    showToast('info', 'Sugestão da IA aplicada ao formulário. Confira e salve o plano.');
  };

  // Helper for single badge
  const renderPlanStatusBadge = (plan: ActionPlan) => {
    const overdue = isDateOverdue(plan.when, plan.status);
    const effectiveStatus = overdue ? 'overdue' : plan.status;
    return <StatusBadge status={effectiveStatus} />;
  };

  // Kanban Columns
  const kanbanColumns: Array<{ id: ActionPlanStatus | 'overdue'; title: string; color: string }> = [
    { id: 'pending', title: 'Planejado', color: 'border-slate-300 bg-slate-50' },
    { id: 'in_progress', title: 'Em Andamento', color: 'border-blue-300 bg-blue-50/40' },
    { id: 'overdue', title: 'Atrasado', color: 'border-red-300 bg-red-50/40' },
    { id: 'completed', title: 'Concluído', color: 'border-green-300 bg-green-50/40' },
  ];

  const canCreate = Permissions.canCreate5W2H(user);
  const canEdit = Permissions.canEdit5W2H(user);
  const canDelete = Permissions.canDelete5W2H(user);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planos de Ação 5W2H"
        subtitle="Matriz de execução: What, Why, Where, When, Who, How, How Much"
        actions={
          <div className="flex gap-2">
            <div className="bg-gray-100 p-1 rounded-lg flex gap-1 border border-gray-200">
              <button
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LayoutList size={14} /> Lista
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <KanbanIcon size={14} /> Kanban
              </button>
            </div>
            {canCreate && (
              <Button onClick={openCreate}>
                <Plus size={16} className="inline mr-1" /> Novo Plano
              </Button>
            )}
          </div>
        }
      />

      {!canCreate && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-xs text-blue-800">
          <Info size={16} className="shrink-0 text-blue-600" />
          <span>
            <strong>Modo Consulta Educacional:</strong> Visualização de Planos de Ação 5W2H elaborados pela equipe técnica.
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Pesquisar planos..." />
        <Select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="w-40 text-xs"
        >
          <option value="">Todos os status</option>
          <option value="pending">Pendente</option>
          <option value="in_progress">Em Andamento</option>
          <option value="completed">Concluído</option>
          <option value="overdue">Atrasado</option>
          <option value="cancelled">Cancelado</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={48} />}
          title="Nenhum plano de ação registrado"
          description="Os planos 5W2H detalham a execução técnica das ações de manutenção e projetos."
          action={canCreate ? <Button onClick={openCreate}>Criar Plano 5W2H</Button> : undefined}
        />
      ) : viewMode === 'list' ? (
        /* LIST VIEW */
        <div className="space-y-4">
          {filtered.map(a => {
            const problem = problems.find(p => p.id === a.problemId);
            const project = projects.find(p => p.id === a.projectId);
            const eq = equipment.find(e => e.id === a.equipmentId);

            return (
              <Card
                key={a.id}
                className="p-4 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {renderPlanStatusBadge(a)}
                    {eq && <Badge color="gray">Equipamento: {eq.name}</Badge>}
                  </div>
                  {(canEdit || canDelete) && (
                    <div className="flex gap-1">
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                            <Edit2 size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDuplicate(a)}>
                            <Copy size={14} />
                          </Button>
                        </>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(a.id)}>
                          <Trash2 size={14} className="text-red-500" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="text-gray-500 font-bold block mb-0.5">What (O quê):</span>{' '}
                    <span className="text-gray-900 font-semibold">{a.what || '—'}</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="text-gray-500 font-bold block mb-0.5">Why (Por quê):</span>{' '}
                    <span className="text-gray-900">{a.why || '—'}</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="text-gray-500 font-bold block mb-0.5">Where (Onde):</span>{' '}
                    <span className="text-gray-900">{a.where || '—'}</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="text-gray-500 font-bold block mb-0.5">When (Quando):</span>{' '}
                    <span className="text-gray-900 font-medium">{a.when || '—'}</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="text-gray-500 font-bold block mb-0.5">Who (Quem):</span>{' '}
                    <span className="text-gray-900">
                      {a.who
                        .map(id => people.find(p => p.id === id)?.name)
                        .filter(Boolean)
                        .join(', ') || '—'}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="text-gray-500 font-bold block mb-0.5">How Much (Quanto):</span>{' '}
                    <span className="text-gray-900 font-semibold">{a.howMuch || '—'}</span>
                  </div>
                </div>

                {a.how && (
                  <div className="mt-3 text-xs text-gray-700 bg-slate-50 p-2.5 rounded border border-gray-200 whitespace-pre-line">
                    <span className="font-bold text-gray-500">How (Como): </span>
                    {a.how}
                  </div>
                )}

                <div className="flex flex-wrap gap-3 mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500">
                  {problem && (
                    <span>
                      Problema: <strong>{problem.title}</strong>
                    </span>
                  )}
                  {project && (
                    <span>
                      Projeto: <strong>{project.name}</strong>
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* KANBAN VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kanbanColumns.map(col => {
            const colItems = filtered.filter(a => {
              const overdue = isDateOverdue(a.when, a.status);
              const effectiveStatus = overdue ? 'overdue' : a.status;
              return effectiveStatus === col.id;
            });

            return (
              <div
                key={col.id}
                className={`rounded-xl border p-3 flex flex-col ${col.color} min-h-[400px]`}
              >
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700">
                    {col.title}
                  </h3>
                  <Badge color="gray">{colItems.length}</Badge>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colItems.map(a => (
                    <Card
                      key={a.id}
                      className="p-3 bg-white shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <h4 className="font-bold text-xs text-gray-800 line-clamp-2">{a.what}</h4>
                        <button
                          onClick={() => openEdit(a)}
                          className="text-gray-400 hover:text-blue-600 p-0.5"
                        >
                          <Edit2 size={13} />
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-500 line-clamp-2 mb-2">{a.why}</p>
                      <div className="text-[10px] text-gray-500 space-y-0.5 pt-2 border-t border-gray-100">
                        <p>📍 Onde: {a.where || 'N/A'}</p>
                        <p>📅 Quando: {a.when || 'N/A'}</p>
                      </div>
                    </Card>
                  ))}

                  {colItems.length === 0 && (
                    <p className="text-xs text-gray-400 italic text-center py-8">
                      Nenhum plano nesta coluna
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5W2H FORM MODAL (CREATE / EDIT) */}
      {/* ==================================================================== */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Plano 5W2H' : 'Novo Plano 5W2H'}
        size="lg"
      >
        <div className="space-y-4">
          {/* CONTEXT SELECTORS & AI TRIGGER BAR */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 p-3.5 rounded-xl border border-blue-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Sparkles size={15} className="text-blue-600" /> Assistente de IA Generativa 5W2H
                </span>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  Selecione o problema ou equipamento abaixo e clique no botão ao lado para gerar
                  automaticamente uma proposta estruturada baseada em dados reais.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleTriggerAi}
                disabled={isGeneratingAi}
                className="shrink-0 bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                {isGeneratingAi ? (
                  <>
                    <Loader2 size={14} className="animate-spin inline mr-1.5" /> Analisando
                    Contexto...
                  </>
                ) : (
                  <>
                    <BrainCircuit size={15} className="inline mr-1.5" /> Gerar Sugestão com IA
                  </>
                )}
              </Button>
            </div>

            {/* Context selection row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-blue-200/60">
              <Select
                label="Problema Vinculado"
                value={form.problemId}
                onChange={e => {
                  const prId = e.target.value;
                  const pr = problems.find(p => p.id === prId);
                  setForm({
                    ...form,
                    problemId: prId,
                    equipmentId: pr?.equipmentId || form.equipmentId,
                    projectId: pr?.projectId || form.projectId,
                  });
                }}
                className="text-xs bg-white"
              >
                <option value="">Nenhum (avulso)</option>
                {problems.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.sector || 'Geral'})
                  </option>
                ))}
              </Select>

              <Select
                label="Equipamento"
                value={form.equipmentId}
                onChange={e => setForm({ ...form, equipmentId: e.target.value })}
                className="text-xs bg-white"
              >
                <option value="">Nenhum</option>
                {equipment.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.code})
                  </option>
                ))}
              </Select>

              <Select
                label="Projeto"
                value={form.projectId}
                onChange={e => setForm({ ...form, projectId: e.target.value })}
                className="text-xs bg-white"
              >
                <option value="">Nenhum</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* 5W2H 7 FIELDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            <div className="md:col-span-2">
              <Textarea
                label="What — O quê? *"
                value={form.what}
                onChange={e => setForm({ ...form, what: e.target.value })}
                rows={2}
                placeholder="Qual ação ou trabalho específico será realizado?"
              />
            </div>

            <div className="md:col-span-2">
              <Textarea
                label="Why — Por quê?"
                value={form.why}
                onChange={e => setForm({ ...form, why: e.target.value })}
                rows={2}
                placeholder="Qual a justificativa, causa raiz ou benefício esperado?"
              />
            </div>

            <Input
              label="Where — Onde?"
              value={form.where}
              onChange={e => setForm({ ...form, where: e.target.value })}
              placeholder="Local, setor, linha ou equipamento"
            />

            <Input
              label="When — Quando?"
              type="date"
              value={form.when}
              onChange={e => setForm({ ...form, when: e.target.value })}
            />

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Who — Quem?</label>
              <select
                multiple
                value={form.who}
                onChange={e =>
                  setForm({
                    ...form,
                    who: Array.from(e.target.selectedOptions, o => o.value),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white h-20"
              >
                {people.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.position ? `(${p.position})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-1">Segure Ctrl para selecionar múltiplos</p>
            </div>

            <Input
              label="How Much — Quanto?"
              value={form.howMuch}
              onChange={e => setForm({ ...form, howMuch: e.target.value })}
              placeholder="Ex: R$ 850,00 ou A orçar"
            />

            <div className="md:col-span-2">
              <Textarea
                label="How — Como?"
                value={form.how}
                onChange={e => setForm({ ...form, how: e.target.value })}
                rows={3}
                placeholder="Procedimento passo a passo para executar a ação..."
              />
            </div>

            <Select
              label="Status do Plano"
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value as ActionPlanStatus })}
            >
              <option value="pending">Pendente (Planejado)</option>
              <option value="in_progress">Em Andamento</option>
              <option value="completed">Concluído</option>
              <option value="cancelled">Cancelado</option>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>{editing ? 'Salvar Alterações' : 'Salvar Plano'}</Button>
          </div>
        </div>
      </Modal>

      {/* ==================================================================== */}
      {/* AI SUGGESTION REVIEW MODAL (EDIT & CONFIRM BEFORE APPLYING) */}
      {/* ==================================================================== */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Revisão da Sugestão 5W2H Gerada por IA"
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2.5 text-xs text-blue-900">
            <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                Revise os campos gerados pela IA antes de aplicar ao seu plano.
              </p>
              <p className="text-blue-700 mt-0.5">
                Você pode editar qualquer um dos 7 campos diretamente abaixo. Ao clicar em "Aplicar
                ao Plano", as informações serão transferidas para o formulário.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            <div className="md:col-span-2">
              <Textarea
                label="What — O quê (Ação técnica recomendada)"
                value={aiSuggestion.what}
                onChange={e => setAiSuggestion({ ...aiSuggestion, what: e.target.value })}
                rows={2}
              />
            </div>

            <div className="md:col-span-2">
              <Textarea
                label="Why — Por quê (Justificativa e impacto)"
                value={aiSuggestion.why}
                onChange={e => setAiSuggestion({ ...aiSuggestion, why: e.target.value })}
                rows={2}
              />
            </div>

            <Input
              label="Where — Onde (Localização / Equipamento)"
              value={aiSuggestion.where}
              onChange={e => setAiSuggestion({ ...aiSuggestion, where: e.target.value })}
            />

            <Input
              label="When — Quando (Prazo sugerido)"
              type="date"
              value={aiSuggestion.when}
              onChange={e => setAiSuggestion({ ...aiSuggestion, when: e.target.value })}
            />

            <Input
              label="Who — Quem (Responsável sugerido)"
              value={aiSuggestion.who}
              onChange={e => setAiSuggestion({ ...aiSuggestion, who: e.target.value })}
            />

            <Input
              label="How Much — Quanto (Estimativa de custo)"
              value={aiSuggestion.howMuch}
              onChange={e => setAiSuggestion({ ...aiSuggestion, howMuch: e.target.value })}
            />

            <div className="md:col-span-2">
              <Textarea
                label="How — Como (Procedimento passo a passo)"
                value={aiSuggestion.how}
                onChange={e => setAiSuggestion({ ...aiSuggestion, how: e.target.value })}
                rows={4}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
            <Button variant="secondary" onClick={() => setReviewModalOpen(false)}>
              Descartar Sugestão
            </Button>

            <Button onClick={handleApplyAiSuggestion} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 size={16} className="inline mr-1.5" /> Aplicar ao Plano 5W2H
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Excluir Plano"
        message="Tem certeza que deseja excluir este plano de ação?"
      />
    </div>
  );
}
