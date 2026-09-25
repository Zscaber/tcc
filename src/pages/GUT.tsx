import React, { useState, useMemo } from 'react';
import { db } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, Button, Modal, Input, Card, EmptyState, showToast, Badge } from '../components/ui';
import { BarChart3, Plus, Trash2, ArrowUpDown } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function GUT() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const problemFilter = searchParams.get('problem') || '';
  const [analyses, setAnalyses] = useState(db.getGutAnalyses());
  const problems = db.getProblems();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ problemId: problemFilter, gravity: 3, urgency: 3, tendency: 3 });
  const [sortBy, setSortBy] = useState<'score' | 'gravity' | 'urgency' | 'tendency'>('score');

  const enriched = useMemo(() => {
    return analyses.map(g => {
      const problem = problems.find(p => p.id === g.problemId);
      return { ...g, problemTitle: problem?.title || 'Problema removido', problemStatus: problem?.status || '' };
    }).filter(g => g.problemTitle !== 'Problema removido');
  }, [analyses, problems]);

  const sorted = useMemo(() => {
    return [...enriched].sort((a, b) => b[sortBy] - a[sortBy]);
  }, [enriched, sortBy]);

  const chartData = sorted.slice(0, 10).map(g => ({ name: g.problemTitle.substring(0, 20), score: g.score, gravity: g.gravity, urgency: g.urgency, tendency: g.tendency }));

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

  const openCreate = () => { setEditingId(null); setForm({ problemId: problemFilter || '', gravity: 3, urgency: 3, tendency: 3 }); setModalOpen(true); };

  const handleSave = () => {
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
    db.deleteGutAnalysis(id);
    setAnalyses(db.getGutAnalyses());
    showToast('success', 'Análise removida');
  };

  return (
    <div>
      <PageHeader title="Matriz GUT" subtitle="Priorização de problemas por Gravidade, Urgência e Tendência" actions={<Button onClick={openCreate}><Plus size={16} className="inline mr-1" /> Nova Análise</Button>} />

      {enriched.length === 0 ? (
        <EmptyState icon={<BarChart3 size={48} />} title="Nenhuma análise GUT" description="Crie uma análise GUT para priorizar problemas." action={<Button onClick={openCreate}>Criar Análise</Button>} />
      ) : (
        <>
          {/* Chart */}
          <Card className="p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Priorização Visual</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 125]} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.score >= 60 ? '#EF4444' : entry.score >= 36 ? '#F97316' : entry.score >= 18 ? '#EAB308' : '#3B82F6'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Table */}
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Problema</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-600 cursor-pointer hover:text-blue-600" onClick={() => setSortBy('gravity')}>Gravidade {sortBy === 'gravity' && '↓'}</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-600 cursor-pointer hover:text-blue-600" onClick={() => setSortBy('urgency')}>Urgência {sortBy === 'urgency' && '↓'}</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-600 cursor-pointer hover:text-blue-600" onClick={() => setSortBy('tendency')}>Tendência {sortBy === 'tendency' && '↓'}</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-600 cursor-pointer hover:text-blue-600" onClick={() => setSortBy('score')}>Pontuação {sortBy === 'score' && '↓'}</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-600">Classificação</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map(g => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{g.problemTitle}</td>
                    <td className="text-center px-3 py-3">{g.gravity}</td>
                    <td className="text-center px-3 py-3">{g.urgency}</td>
                    <td className="text-center px-3 py-3">{g.tendency}</td>
                    <td className="text-center px-3 py-3 font-bold">{g.score}</td>
                    <td className="text-center px-3 py-3"><Badge color={getClassColor(g.score)}>{g.classification}</Badge></td>
                    <td className="text-center px-3 py-3">
                      <button onClick={() => handleDelete(g.id)} className="p-1 rounded hover:bg-red-50"><Trash2 size={14} className="text-red-500" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Análise GUT">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Problema *</label>
            <select value={form.problemId} onChange={e => setForm({ ...form, problemId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              <option value="">Selecione um problema...</option>
              {(editingId ? problems : problemsWithoutGut).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gravidade (1-5)</label>
              <input type="number" min={1} max={5} value={form.gravity} onChange={e => setForm({ ...form, gravity: Math.min(5, Math.max(1, Number(e.target.value))) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Urgência (1-5)</label>
              <input type="number" min={1} max={5} value={form.urgency} onChange={e => setForm({ ...form, urgency: Math.min(5, Math.max(1, Number(e.target.value))) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tendência (1-5)</label>
              <input type="number" min={1} max={5} value={form.tendency} onChange={e => setForm({ ...form, tendency: Math.min(5, Math.max(1, Number(e.target.value))) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <p className="text-sm text-gray-500">Pontuação GUT</p>
            <p className="text-3xl font-bold text-gray-800">{getScore(form.gravity, form.urgency, form.tendency)}</p>
            <Badge color={getClassColor(getScore(form.gravity, form.urgency, form.tendency))}>{getClassification(getScore(form.gravity, form.urgency, form.tendency))}</Badge>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </div>
      </Modal>
    </div>
  );
}
