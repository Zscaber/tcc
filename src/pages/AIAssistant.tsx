import React, { useState } from 'react';
import { db } from '../store';
import { PageHeader, Card, Button, Input } from '../components/ui';
import { BrainCircuit, Send, Bot, User } from 'lucide-react';

interface Message { role: 'user' | 'assistant'; content: string; }

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  const processQuery = (query: string): string => {
    const q = query.toLowerCase();
    const equipment = db.getEquipment();
    const problems = db.getProblems();
    const actionPlans = db.getActionPlans();
    const maintenance = db.getMaintenanceRecords();
    const projects = db.getProjects();
    const people = db.getPeople();
    const gutAnalyses = db.getGutAnalyses();

    // Equipment queries
    if (q.includes('equipamento') && (q.includes('manutenção') || q.includes('manutencao'))) {
      const inMaint = equipment.filter(e => e.status === 'maintenance');
      if (inMaint.length === 0) return 'Nenhum equipamento está em manutenção no momento.';
      return `Existem ${inMaint.length} equipamento(s) em manutenção:\n${inMaint.map(e => `• ${e.name} (${e.code}) — Setor: ${e.sector}`).join('\n')}`;
    }

    if (q.includes('equipamento') && (q.includes('parado') || q.includes('operação') || q.includes('operacao'))) {
      const operating = equipment.filter(e => e.status === 'operating');
      const stopped = equipment.filter(e => e.status === 'stopped');
      return `Equipamentos em operação: ${operating.length}\nEquipamentos parados: ${stopped.length}\n${stopped.map(e => `• ${e.name}`).join('\n')}`;
    }

    if (q.includes('equipamento')) {
      return `Total de equipamentos cadastrados: ${equipment.length}\n${equipment.map(e => `• ${e.name} — Status: ${e.status}`).join('\n')}`;
    }

    // Action plans
    if (q.includes('plano') && (q.includes('atrasado') || q.includes('vencido'))) {
      const overdue = actionPlans.filter(a => a.status === 'overdue' || (a.when && new Date(a.when) < new Date() && a.status !== 'completed' && a.status !== 'cancelled'));
      if (overdue.length === 0) return 'Nenhum plano de ação atrasado no momento.';
      return `Existem ${overdue.length} plano(s) de ação atrasado(s):\n${overdue.map(a => `• ${a.what || 'Sem descrição'} — Prazo: ${a.when}`).join('\n')}`;
    }

    if (q.includes('plano') || q.includes('5w2h') || q.includes('ação') || q.includes('acao')) {
      return `Total de planos de ação: ${actionPlans.length}\n• Pendentes: ${actionPlans.filter(a => a.status === 'pending').length}\n• Em andamento: ${actionPlans.filter(a => a.status === 'in_progress').length}\n• Concluídos: ${actionPlans.filter(a => a.status === 'completed').length}\n• Atrasados: ${actionPlans.filter(a => a.status === 'overdue').length}`;
    }

    // GUT
    if (q.includes('gut') || q.includes('prioridade') || q.includes('priorizacao') || q.includes('priorização')) {
      const sorted = [...gutAnalyses].sort((a, b) => b.score - a.score);
      if (sorted.length === 0) return 'Nenhuma análise GUT registrada.';
      const top = sorted.slice(0, 5);
      return `Análises GUT por prioridade:\n${top.map((g, i) => {
        const p = problems.find(pr => pr.id === g.problemId);
        return `${i + 1}. ${p?.title || 'Problema'} — Score: ${g.score} (${g.classification})`;
      }).join('\n')}`;
    }

    // Problems
    if (q.includes('problema')) {
      const open = problems.filter(p => p.status !== 'resolved' && p.status !== 'cancelled');
      if (open.length === 0) return 'Nenhum problema em aberto.';
      return `Problemas em aberto: ${open.length}\n${open.map(p => `• ${p.title} — Status: ${p.status} — Categoria: ${p.category}`).join('\n')}`;
    }

    // Maintenance
    if (q.includes('manutenção') || q.includes('manutencao')) {
      const pending = maintenance.filter(m => m.status !== 'completed' && m.status !== 'cancelled');
      return `Manutenções pendentes: ${pending.length}\n${pending.map(m => {
        const eq = equipment.find(e => e.id === m.equipmentId);
        return `• ${eq?.name || 'Equipamento'} — ${m.description} (${m.type}) — Status: ${m.status}`;
      }).join('\n')}`;
    }

    // Projects
    if (q.includes('projeto')) {
      return `Total de projetos: ${projects.length}\n• Planejamento: ${projects.filter(p => p.status === 'planning').length}\n• Em andamento: ${projects.filter(p => p.status === 'in_progress').length}\n• Pausados: ${projects.filter(p => p.status === 'paused').length}\n• Concluídos: ${projects.filter(p => p.status === 'completed').length}\n• Cancelados: ${projects.filter(p => p.status === 'cancelled').length}`;
    }

    // Activities
    if (q.includes('atividade') || q.includes('tarefa')) {
      const activities = db.getProductionActivities();
      const pending = activities.filter(a => a.status === 'pending' || a.status === 'in_progress');
      if (pending.length === 0) return 'Nenhuma atividade pendente.';
      return `Atividades pendentes: ${pending.length}\n${pending.map(a => `• ${a.title} — Status: ${a.status} — Prazo: ${a.deadline || 'N/A'}`).join('\n')}`;
    }

    // People
    if (q.includes('pessoa') || q.includes('pessoal') || q.includes('equipe')) {
      return `Total de pessoas cadastradas: ${people.length}\n${people.map(p => `• ${p.name} — ${p.position}`).join('\n')}`;
    }

    // General
    if (q.includes('resumo') || q.includes('geral') || q.includes('overview')) {
      return `📊 Resumo do Sistema:\n• Projetos: ${projects.length}\n• Equipamentos: ${equipment.length}\n• Problemas abertos: ${problems.filter(p => p.status !== 'resolved' && p.status !== 'cancelled').length}\n• Planos de ação: ${actionPlans.length}\n• Manutenções pendentes: ${maintenance.filter(m => m.status !== 'completed').length}\n• Pessoas: ${people.length}`;
    }

    // Equipment-specific
    for (const eq of equipment) {
      if (q.includes(eq.name.toLowerCase())) {
        const eqProblems = problems.filter(p => p.equipmentId === eq.id);
        const eqMaintenance = maintenance.filter(m => m.equipmentId === eq.id);
        return `Informações sobre "${eq.name}":\n• Status: ${eq.status}\n• Setor: ${eq.sector}\n• Problemas relacionados: ${eqProblems.length}\n• Manutenções: ${eqMaintenance.length}\n${eqProblems.map(p => `  - Problema: ${p.title}`).join('\n')}`;
      }
    }

    return 'Não encontrei informações suficientes para responder essa pergunta. Tente perguntar sobre:\n• Equipamentos em manutenção\n• Planos de ação atrasados\n• Problemas com maior pontuação GUT\n• Resumo geral do sistema\n• Projetos ativos\n• Atividades pendentes';
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: 'user', content: input };
    const response = processQuery(input);
    const assistantMsg: Message = { role: 'assistant', content: response };
    setMessages([...messages, userMsg, assistantMsg]);
    setInput('');
  };

  const suggestions = [
    'Quais equipamentos estão em manutenção?',
    'Quais planos de ação estão atrasados?',
    'Quais são os problemas com maior pontuação GUT?',
    'Resumo geral do sistema',
    'Quais atividades precisam ser realizadas?',
  ];

  return (
    <div>
      <PageHeader title="Assistente IA" subtitle="Consulte dados do sistema usando linguagem natural" />

      <Card className="flex flex-col h-[calc(100vh-220px)] min-h-[400px]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <BrainCircuit size={48} className="mx-auto text-blue-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Como posso ajudar?</h3>
              <p className="text-sm text-gray-500 mb-4">Faça perguntas sobre os dados do sistema</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => { setInput(s); }} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs hover:bg-blue-100 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
              {m.role === 'assistant' && <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0"><Bot size={16} className="text-blue-600" /></div>}
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-line ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                {m.content}
              </div>
              {m.role === 'user' && <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center shrink-0"><User size={16} className="text-gray-600" /></div>}
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Pergunte algo sobre o sistema..."
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <Button onClick={handleSend}><Send size={18} /></Button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            A IA utiliza dados reais do sistema. Integração com API de linguagem natural pode ser configurada futuramente.
          </p>
        </div>
      </Card>
    </div>
  );
}
