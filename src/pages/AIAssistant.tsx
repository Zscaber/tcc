import React, { useState } from 'react';
import { db, isDateOverdue, getOverdueDaysText, isDateUpcoming } from '../store';
import { PageHeader, Card, Button, Badge } from '../components/ui';
import { BrainCircuit, Send, Bot, User, ArrowRight, Wrench, Settings, AlertTriangle, ClipboardList, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActionLink {
  label: string;
  path: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  actionLinks?: ActionLink[];
}

export default function AIAssistant() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  const processQuery = (query: string): { content: string; actionLinks?: ActionLink[] } => {
    const q = query.toLowerCase().trim();
    const equipment = db.getEquipment();
    const problems = db.getProblems();
    const actionPlans = db.getActionPlans();
    const maintenance = db.getMaintenanceRecords();
    const projects = db.getProjects();
    const people = db.getPeople();
    const gutAnalyses = db.getGutAnalyses();
    const nonConformities = db.getNonConformities();

    // 1. "Quais equipamentos estão em manutenção?"
    if (q.includes('equipamento') && q.includes('manutenção') && !q.includes('próxima') && !q.includes('proxima')) {
      const inMaint = equipment.filter(e => e.status === 'maintenance');
      if (inMaint.length === 0) {
        return { content: '✅ Nenhum equipamento está marcado em manutenção no momento.' };
      }
      const listStr = inMaint.map(e => `• ${e.name} (${e.code}) — Setor: ${e.sector || 'Geral'} | Local: ${e.location || 'N/A'}`).join('\n');
      return {
        content: `Encontrei ${inMaint.length} equipamento(s) atualmente em manutenção:\n\n${listStr}`,
        actionLinks: [{ label: 'Abrir Módulo de Equipamentos', path: '/equipment' }, { label: 'Abrir Mapa de Áreas', path: '/layout' }],
      };
    }

    // 2. "Quais manutenções estão atrasadas?"
    if (q.includes('manutenção') && (q.includes('atrasad') || q.includes('vencid'))) {
      const overdueMaint = maintenance.filter(m => m.status !== 'completed' && m.status !== 'cancelled' && isDateOverdue(m.deadline, m.status));
      if (overdueMaint.length === 0) {
        return { content: '✅ Nenhuma manutenção com prazo vencido/atrasada no momento.' };
      }
      const listStr = overdueMaint.map(m => {
        const eq = equipment.find(e => e.id === m.equipmentId);
        const overdueDays = getOverdueDaysText(m.deadline);
        return `• ${eq?.name || 'Equipamento'} — ${m.description}\n  Prazo limite era: ${m.deadline} (${overdueDays || 'Atrasada'})\n  Responsável: ${people.find(p => p.id === m.responsibleId)?.name || 'N/A'}`;
      }).join('\n\n');

      return {
        content: `Encontrei ${overdueMaint.length} manutenção(ões) atrasada(s):\n\n${listStr}`,
        actionLinks: [{ label: 'Abrir Módulo de Manutenção', path: '/maintenance' }],
      };
    }

    // 3. "Quais problemas possuem maior pontuação GUT?"
    if (q.includes('gut') || q.includes('maior pontuação') || q.includes('prioridade')) {
      const sortedGut = [...gutAnalyses].sort((a, b) => b.score - a.score);
      if (sortedGut.length === 0) {
        return { content: 'Nenhuma análise GUT registrada no sistema.' };
      }
      const listStr = sortedGut.slice(0, 5).map((g, idx) => {
        const pr = problems.find(p => p.id === g.problemId);
        return `${idx + 1}. ${pr?.title || 'Problema'} — Pontuação GUT: ${g.score} (${g.classification})\n   Cálculo: Gravidade (${g.gravity}) × Urgência (${g.urgency}) × Tendência (${g.tendency})`;
      }).join('\n\n');

      return {
        content: `Ranking de problemas com maior pontuação na Matriz GUT:\n\n${listStr}`,
        actionLinks: [{ label: 'Abrir Matriz GUT', path: '/gut' }, { label: 'Abrir Módulo de Problemas', path: '/problems' }],
      };
    }

    // 4. "Quais planos 5W2H estão atrasados?"
    if ((q.includes('plano') || q.includes('5w2h')) && (q.includes('atrasad') || q.includes('vencid'))) {
      const overduePlans = actionPlans.filter(a => a.status !== 'completed' && a.status !== 'cancelled' && isDateOverdue(a.when, a.status));
      if (overduePlans.length === 0) {
        return { content: '✅ Nenhum plano de ação 5W2H está atrasado no momento.' };
      }
      const listStr = overduePlans.map(a => {
        const overdueDays = getOverdueDaysText(a.when);
        return `• ${a.what}\n  Por quê: ${a.why}\n  Prazo (When): ${a.when} (${overdueDays || 'Atrasado'})`;
      }).join('\n\n');

      return {
        content: `Encontrei ${overduePlans.length} plano(s) de ação 5W2H atrasado(s):\n\n${listStr}`,
        actionLinks: [{ label: 'Abrir Planos 5W2H', path: '/action-plans' }],
      };
    }

    // 5. "Quais equipamentos possuem manutenção próxima?"
    if (q.includes('manutenção próxima') || q.includes('manutencao proxima') || q.includes('vencer')) {
      const upcoming = maintenance.filter(m => m.status !== 'completed' && m.status !== 'cancelled' && !isDateOverdue(m.deadline, m.status) && isDateUpcoming(m.deadline, 15));
      if (upcoming.length === 0) {
        return { content: 'Nenhuma manutenção preventiva ou corretiva agendada para os próximos 15 dias.' };
      }
      const listStr = upcoming.map(m => {
        const eq = equipment.find(e => e.id === m.equipmentId);
        return `• ${eq?.name || 'Equipamento'} (${eq?.code || 'N/A'})\n  Serviço: ${m.description}\n  Data limite agendada: ${m.deadline}`;
      }).join('\n\n');

      return {
        content: `Equipamentos com manutenção agendada nos próximos dias:\n\n${listStr}`,
        actionLinks: [{ label: 'Ver Manutenções Agendadas', path: '/maintenance' }],
      };
    }

    // 6. "Faça um resumo da situação atual da manutenção." / Resumo geral
    if (q.includes('resumo') || q.includes('situação') || q.includes('situacao') || q.includes('geral')) {
      const openProbs = problems.filter(p => p.status !== 'resolved' && p.status !== 'cancelled').length;
      const inMaintEq = equipment.filter(e => e.status === 'maintenance').length;
      const overdueMaint = maintenance.filter(m => m.status !== 'completed' && m.status !== 'cancelled' && isDateOverdue(m.deadline, m.status)).length;
      const overduePlans = actionPlans.filter(a => a.status !== 'completed' && a.status !== 'cancelled' && isDateOverdue(a.when, a.status)).length;

      return {
        content: `📊 **Resumo em Tempo Real da Gestão de Manutenção:**\n\n` +
          `• **Equipamentos Cadastrados:** ${equipment.length} (${inMaintEq} em manutenção)\n` +
          `• **Problemas em Aberto:** ${openProbs}\n` +
          `• **Manutenções Atrasadas:** ${overdueMaint}\n` +
          `• **Planos 5W2H Atrasados:** ${overduePlans}\n` +
          `• **Não Conformidades Registradas:** ${nonConformities.length}\n` +
          `• **Projetos em Andamento:** ${projects.filter(p => p.status === 'in_progress').length}`,
        actionLinks: [{ label: 'Ir para o Dashboard', path: '/' }],
      };
    }

    // Search by equipment name
    for (const eq of equipment) {
      if (q.includes(eq.name.toLowerCase()) || q.includes(eq.code.toLowerCase())) {
        const eqProbs = problems.filter(p => p.equipmentId === eq.id);
        const eqMaint = maintenance.filter(m => m.equipmentId === eq.id);
        return {
          content: `🔎 **Ficha do Equipamento: ${eq.name} (${eq.code})**\n\n` +
            `• Status: **${eq.status}** | Criticidade: **${eq.criticality || 'Média'}**\n` +
            `• Setor: ${eq.sector || 'Geral'} | Local: ${eq.location || 'N/A'}\n` +
            `• Próxima Manutenção: ${eq.nextMaintenance || 'N/A'}\n` +
            `• Problemas Associados: ${eqProbs.length}\n` +
            `• Histórico de Manutenções: ${eqMaint.length} registro(s)`,
          actionLinks: [{ label: `Ver Ficha de ${eq.name}`, path: '/equipment' }],
        };
      }
    }

    return {
      content: 'Não encontrei uma resposta exata para essa consulta. Você pode selecionar uma das perguntas frequentes recomendadas abaixo ou perguntar por nome de equipamentos.',
      actionLinks: [{ label: 'Ver Todos os Equipamentos', path: '/equipment' }, { label: 'Ver Manutenção', path: '/maintenance' }],
    };
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    const queryResult = processQuery(input.trim());
    const assistantMsg: Message = { role: 'assistant', content: queryResult.content, actionLinks: queryResult.actionLinks };
    setMessages([...messages, userMsg, assistantMsg]);
    setInput('');
  };

  const suggestions = [
    'Quais equipamentos estão em manutenção?',
    'Quais manutenções estão atrasadas?',
    'Quais problemas possuem maior pontuação GUT?',
    'Quais planos 5W2H estão atrasados?',
    'Quais equipamentos possuem manutenção próxima?',
    'Faça um resumo da situação atual da manutenção.',
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Assistente IA de Consulta" subtitle="Motor de consulta inteligente em tempo real sobre a base de dados do sistema" />

      <Card className="flex flex-col h-[calc(100vh-230px)] min-h-[460px] border border-gray-200">
        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold">
                <BrainCircuit size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Consulta Inteligente aos Dados</h3>
              <p className="text-xs text-gray-500 mb-6 max-w-md mx-auto">
                Selecione uma das perguntas rápidas abaixo para consultar o estado atual dos equipamentos, manutenções, matriz GUT e prazos 5W2H.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-w-3xl mx-auto text-left">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const userMsg: Message = { role: 'user', content: s };
                      const result = processQuery(s);
                      const assistantMsg: Message = { role: 'assistant', content: result.content, actionLinks: result.actionLinks };
                      setMessages([userMsg, assistantMsg]);
                    }}
                    className="p-3 bg-slate-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl text-xs font-semibold text-gray-700 hover:text-blue-700 transition-all flex items-center justify-between group"
                  >
                    <span>{s}</span>
                    <ArrowRight size={14} className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
              {m.role === 'assistant' && (
                <div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                  <Bot size={18} />
                </div>
              )}

              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white font-medium rounded-br-sm shadow-sm'
                  : 'bg-slate-100 text-gray-800 rounded-bl-sm border border-gray-200'
              }`}>
                <div className="whitespace-pre-line">{m.content}</div>

                {m.actionLinks && m.actionLinks.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-gray-200">
                    {m.actionLinks.map((link, idx) => (
                      <button
                        key={idx}
                        onClick={() => navigate(link.path)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm inline-flex items-center gap-1"
                      >
                        {link.label} <ArrowRight size={12} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {m.role === 'user' && (
                <div className="w-8 h-8 bg-gray-700 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                  <User size={18} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Digite sua dúvida (ex: Manutenções atrasadas, Equipamentos em manutenção...)"
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <Button onClick={handleSend}>
              <Send size={16} />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
