import React, { useState, useMemo } from 'react';
import { db } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, Button, Modal, Card, EmptyState, showToast, Badge } from '../components/ui';
import { BarChart3, Plus, Trash2, Edit2, Info, HelpCircle } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Permissions } from '../lib/permissions';

export default function GUT() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const problemFilter = searchParams.get('problem') || '';
  const [analyses, setAnalyses] = useState(db.getGutAnalyses());
  const problems = db.getProblems();
  const actionPlans = db.getActionPlans();
  const maintenanceRecords = db.getMaintenanceRecords();

  const [modalOpen, setModalOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ problemId: problemFilter, gravity: 3, urgency: 3, tendency: 3 });
  const [sortBy, setSortBy] = useState<'score' | 'gravity' | 'urgency' | 'tendency'>('score');

  const canManage = Permissions.canManageGut(user);
  const canDelete = Permissions.canDeleteGut(user);

  const enriched = useMemo(() => {
    return analyses.map(g => {
      const problem = problems.find(p => p.id === g.problemId);
      const actionPlan = problem ? actionPlans.find(a => a.problemId === problem.id) : null;
      const maint = problem ? maintenanceRecords.find(m => m.problemId === problem.id) : null;
      return {
        ...g,
        problem,
        problemTitle: problem?.title || 'Problema removido',
        problemStatus: problem?.status || '',
        actionPlan,
        maint,
      };
    }).filter(g => g.problemTitle !== 'Problema removido');
  }, [analyses, problems, actionPlans, maintenanceRecords]);

  const sorted = useMemo(() => {
    return [...enriched].sort((a, b) => b[sortBy] - a[sortBy]);
  }, [enriched, sortBy]);

  const chartData = sorted.slice(0, 10).map(g => ({
    name: g.problemTitle.length > 22 ? g.problemTitle.substring(0, 22) + '...' : g.problemTitle,
    score: g.score,
    gravity: g.gravity,
    urgency: g.urgency,
    tendency: g.tendency,
  }));

  const getScore = (g: number, u: number, t: number) => g * u * t;
  const getClassification = (score: number) => {
    if (score >= 60) return 'Crítico';
    if (score >= 36) return 'Alto';
    if (score >= 18) return 'Médio';
    if (score >= 8) return 'Baixo';
    return 'Mínimo';
  };
  const getClassColor = (score: number) => {
    if (score >= 60) return 'red';
    if (score >= 36) return 'orange';
    if (score >= 18) return 'yellow';
    if (score >= 8) return 'blue';
    return 'gray';
  };

  const problemsWithoutGut = problems.filter(p => !analyses.some(a => a.problemId === p.id) && p.status !== 'resolved' && p.status !== 'cancelled');

  const openCreate = () => {
    if (!canManage) {
      showToast('error', 'Apenas Gestores e Técnicos podem cadastrar análises GUT.');
      return;
    }
    setEditingId(null);
    setForm({ problemId: problemFilter || '', gravity: 3, urgency: 3, tendency: 3 });
    setModalOpen(true);
  };

  const openEdit = (g: any) => {
    if (!canManage) {
      showToast('error', 'Apenas Gestores e Técnicos podem editar análises GUT.');
      return;
    }
    setEditingId(g.id);
    setForm({ problemId: g.problemId, gravity: g.gravity, urgency: g.urgency, tendency: g.tendency });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!canManage) {
      showToast('error', 'Operação não permitida para o seu perfil');
      return;
    }
    if (!form.problemId) { showToast('error', 'Selecione um problema'); return; }
    const score = getScore(form.gravity, form.urgency, form.tendency);
    const classification = getClassification(score);
    if (editingId) {
      db.updateGutAnalysis(editingId, { gravity: form.gravity, urgency: form.urgency, tendency: form.tendency, score, classification });
      showToast('success', 'Análise atualizada');
    } else {
      db.createGutAnalysis({ problemId: form.problemId, gravity: form.gravity, urgency: form.urgency, tendency: form.tendency, score, classification });
      db.addHistory({ userId: user!.id, action: 'Análise GUT criada', entity: 'gut', entityId: 'new', details: `Score: ${score}` });
      showToast('success', 'Análise GUT criada');
    }
    setAnalyses(db.getGutAnalyses());
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!canDelete) {
      showToast('error', 'Apenas administradores podem excluir análises GUT.');
      return;
    }
    db.deleteGutAnalysis(id);
    setAnalyses(db.getGutAnalyses());
    showToast('success', 'Análise removida');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matriz GUT — Priorização de Problemas"
        subtitle="Cálculo determinístico: Gravidade × Urgência × Tendência = Pontuação"
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus size={16} className="inline mr-1" /> Nova Análise
            </Button>
          ) : undefined
        }
      />

      {!canManage && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-xs text-blue-800">
          <Info size={16} className="shrink-0 text-blue-600" />
          <span>
            <strong>Modo Consulta Educacional:</strong> Visualização da Matriz GUT para acompanhamento da priorização técnica.
          </span>
        </div>
      )}

      {enriched.length === 0 ? (
        <EmptyState
          icon={<BarChart3 size={48} />}
          title="Nenhuma análise GUT"
          description="A Matriz GUT prioriza os problemas registrados no sistema através de Gravidade, Urgência e Tendência."
          action={canManage ? <Button onClick={openCreate}>Criar Análise</Button> : undefined}
        />
      ) : (
        <>
          {/* Chart or Compact Ranking Header */}
          {sorted.length >= 3 ? (
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Priorização Visual de Problemas</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 125]} />
                  <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.score >= 60 ? '#EF4444' : entry.score >= 36 ? '#F97316' : entry.score >= 18 ? '#EAB308' : '#3B82F6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          ) : (
            <Card className="p-4 bg-purple-50/60 border border-purple-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">Ranking da Matriz GUT</h3>
                  <p className="text-xs text-purple-900">
                    Calculando prioridade para {sorted.length} {sorted.length === 1 ? 'problema cadastrado' : 'problemas cadastrados'}. Exibição em formato de tabela detalhada.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Table */}
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Problema</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-600 cursor-pointer hover:text-blue-600" onClick={() => setSortBy('gravity')}>Gravidade {sortBy === 'gravity' && '↓'}</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-600 cursor-pointer hover:text-blue-600" onClick={() => setSortBy('urgency')}>Urgência {sortBy === 'urgency' && '↓'}</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-600 cursor-pointer hover:text-blue-600" onClick={() => setSortBy('tendency')}>Tendência {sortBy === 'tendency' && '↓'}</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-600 cursor-pointer hover:text-blue-600" onClick={() => setSortBy('score')}>Fórmula & Pontuação {sortBy === 'score' && '↓'}</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-600">Classificação</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-600">Conexões</th>
                  {canManage && <th className="text-center px-3 py-3 font-medium text-gray-600">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map(g => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{g.problemTitle}</td>
                    <td className="text-center px-3 py-3 font-mono">{g.gravity}</td>
                    <td className="text-center px-3 py-3 font-mono">{g.urgency}</td>
                    <td className="text-center px-3 py-3 font-mono">{g.tendency}</td>
                    <td className="text-center px-3 py-3">
                      <span className="text-xs text-gray-500 font-mono">({g.gravity} × {g.urgency} × {g.tendency}) = </span>
                      <span className="font-bold text-gray-900 text-sm">{g.score}</span>
                    </td>
                    <td className="text-center px-3 py-3"><Badge color={getClassColor(g.score)}>{g.classification}</Badge></td>
                    <td className="text-center px-3 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {g.actionPlan ? (
                          <button onClick={() => navigate('/action-plans')} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-100" title="Ver Plano 5W2H">
                            5W2H
                          </button>
                        ) : Permissions.canCreate5W2H(user) ? (
                          <button onClick={() => navigate('/action-plans')} className="text-[11px] text-gray-400 hover:text-blue-600" title="Criar Plano 5W2H">
                            + 5W2H
                          </button>
                        ) : null}
                        {g.maint ? (
                          <button onClick={() => navigate('/maintenance')} className="text-xs bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200 hover:bg-amber-100" title="Ver Manutenção">
                            Manutenção
                          </button>
                        ) : null}
                      </div>
                    </td>
                    {canManage && (
                      <td className="text-center px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(g)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Editar">
                            <Edit2 size={14} />
                          </button>
                          {canDelete && (
                            <button onClick={() => handleDelete(g.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Excluir">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Editar Análise GUT" : "Nova Análise GUT"}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Problema *</label>
            <select value={form.problemId} onChange={e => setForm({ ...form, problemId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              <option value="">Selecione um problema...</option>
              {(editingId ? problems : problemsWithoutGut).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Critérios de Avaliação</span>
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
              >
                <HelpCircle size={14} /> Como avaliar? ❔
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Gravidade (1-5)</label>
                <input type="number" min={1} max={5} value={form.gravity} onChange={e => setForm({ ...form, gravity: Math.min(5, Math.max(1, Number(e.target.value))) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Urgência (1-5)</label>
                <input type="number" min={1} max={5} value={form.urgency} onChange={e => setForm({ ...form, urgency: Math.min(5, Math.max(1, Number(e.target.value))) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Tendência (1-5)</label>
                <input type="number" min={1} max={5} value={form.tendency} onChange={e => setForm({ ...form, tendency: Math.min(5, Math.max(1, Number(e.target.value))) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl text-center space-y-1">
            <p className="text-xs text-purple-700 font-medium uppercase tracking-wider">Cálculo de Pontuação GUT</p>
            <p className="text-xs text-purple-900 font-mono font-semibold">
              {form.gravity} (Gravidade) × {form.urgency} (Urgência) × {form.tendency} (Tendência)
            </p>
            <p className="text-3xl font-extrabold text-purple-900">{getScore(form.gravity, form.urgency, form.tendency)}</p>
            <Badge color={getClassColor(getScore(form.gravity, form.urgency, form.tendency))}>
              {getClassification(getScore(form.gravity, form.urgency, form.tendency))}
            </Badge>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Análise</Button>
        </div>
      </Modal>

      {/* Modal de Ajuda: Como avaliar a Matriz GUT */}
      <Modal isOpen={helpOpen} onClose={() => setHelpOpen(false)} title="Como avaliar a Matriz GUT?" size="md">
        <div className="space-y-4 text-xs text-gray-700">
          <p className="text-gray-600">
            Está com dúvidas sobre como definir os valores? Consulte abaixo uma orientação para cada critério.
          </p>

          <div className="space-y-3">
            <div className="p-3 bg-red-50/60 border border-red-200 rounded-lg">
              <h4 className="font-bold text-red-900 mb-1">GRAVIDADE</h4>
              <p className="text-gray-600 mb-2">Mede o impacto que o problema causa.</p>
              <ul className="space-y-0.5 text-gray-800">
                <li><strong>1</strong> — impacto mínimo</li>
                <li><strong>2</strong> — impacto baixo</li>
                <li><strong>3</strong> — impacto moderado</li>
                <li><strong>4</strong> — impacto alto</li>
                <li><strong>5</strong> — impacto crítico</li>
              </ul>
            </div>

            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
              <h4 className="font-bold text-amber-900 mb-1">URGÊNCIA</h4>
              <p className="text-gray-600 mb-2">Mede o quanto é necessário agir rapidamente.</p>
              <ul className="space-y-0.5 text-gray-800">
                <li><strong>1</strong> — pode aguardar</li>
                <li><strong>2</strong> — pouco urgente</li>
                <li><strong>3</strong> — requer atenção em breve</li>
                <li><strong>4</strong> — requer ação rápida</li>
                <li><strong>5</strong> — ação imediata</li>
              </ul>
            </div>

            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg">
              <h4 className="font-bold text-blue-900 mb-1">TENDÊNCIA</h4>
              <p className="text-gray-600 mb-2">Mede a velocidade com que o problema tende a piorar.</p>
              <ul className="space-y-0.5 text-gray-800">
                <li><strong>1</strong> — não tende a piorar</li>
                <li><strong>2</strong> — piora lentamente</li>
                <li><strong>3</strong> — pode piorar gradualmente</li>
                <li><strong>4</strong> — piora rapidamente</li>
                <li><strong>5</strong> — piora muito rapidamente</li>
              </ul>
            </div>
          </div>

          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-purple-900">
            <p className="font-semibold">Pontuação GUT = Gravidade × Urgência × Tendência.</p>
            <p className="text-purple-700 mt-0.5">Quanto maior a pontuação, maior a prioridade de tratamento.</p>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="secondary" onClick={() => setHelpOpen(false)}>Fechar</Button>
        </div>
      </Modal>
    </div>
  );
}
