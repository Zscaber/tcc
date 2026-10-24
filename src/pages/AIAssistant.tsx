import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, Card, Button, Badge } from '../components/ui';
import {
  BrainCircuit,
  Send,
  Bot,
  User as UserIcon,
  ArrowRight,
  Sparkles,
  Database,
  RefreshCw,
  Trash2,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { askAssistantAi, AssistantActionLink } from '../services/aiService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  actionLinks?: AssistantActionLink[];
  isAiGenerated?: boolean;
  source?: 'gemini' | 'local_database';
}

export default function AIAssistant() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);
  const activeRequestIdRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendQuery = async (queryText: string) => {
    const text = queryText.trim();
    if (!text || isSubmittingRef.current || isLoading) return;

    // Bloqueio síncrono imediato para evitar submissões concorrentes / duplo clique
    isSubmittingRef.current = true;
    setIsLoading(true);
    setInput('');

    const currentRequestId = ++activeRequestIdRef.current;
    const userMsg: Message = { role: 'user', content: text };

    // Captura histórico anterior antes de adicionar a nova mensagem
    const previousMessages = messages;
    setMessages(prev => [...prev, userMsg]);

    try {
      // Envia histórico recente sanitizado para contexto de follow-up questions
      const historyPayload = previousMessages.slice(-6).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await askAssistantAi({
        message: text,
        history: historyPayload,
        currentUserId: user?.id,
        currentUserRole: user?.role,
      });

      // Se a conversa foi reiniciada durante a requisição, descarta a resposta órfã
      if (activeRequestIdRef.current !== currentRequestId) return;

      const assistantMsg: Message = {
        role: 'assistant',
        content: response.content,
        actionLinks: response.actionLinks,
        isAiGenerated: response.isAiGenerated,
        source: response.source,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      if (activeRequestIdRef.current !== currentRequestId) return;

      const errorMsg: Message = {
        role: 'assistant',
        content: 'Ocorreu uma falha inesperada ao consultar o assistente. Por favor, tente novamente.',
        isAiGenerated: false,
        source: 'local_database',
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      if (activeRequestIdRef.current === currentRequestId) {
        setIsLoading(false);
        isSubmittingRef.current = false;
      }
    }
  };

  const handleClearChat = () => {
    activeRequestIdRef.current++;
    setMessages([]);
    setIsLoading(false);
    isSubmittingRef.current = false;
  };

  const suggestions = [
    'Quais equipamentos estão em manutenção?',
    'Existem solicitações de manutenção pendentes?',
    'Quais manutenções estão atrasadas?',
    'Quais são os problemas mais urgentes segundo a matriz GUT?',
    'Quais manutenções estão previstas para esta semana?',
    'Resuma a situação atual da manutenção.',
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assistente IA de Consulta"
        subtitle="Inteligência conectada aos dados operacionais reais de equipamentos, problemas, solicitações e manutenções"
        actions={
          messages.length > 0 ? (
            <Button variant="secondary" size="sm" onClick={handleClearChat}>
              <Trash2 size={14} className="mr-1.5" /> Nova Conversa
            </Button>
          ) : undefined
        }
      />

      <Card className="flex flex-col h-[calc(100vh-230px)] min-h-[500px] border border-gray-200">
        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold shadow-sm">
                <BrainCircuit size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Consulta Inteligente aos Dados Reais</h3>
              <p className="text-xs text-gray-500 mb-6 max-w-md mx-auto">
                O assistente analisa em tempo real os registros do sistema: status de equipamentos, prazos de manutenção, solicitações, ranking GUT e planos 5W2H.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-w-3xl mx-auto text-left">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendQuery(s)}
                    disabled={isLoading}
                    className="p-3 bg-slate-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl text-xs font-semibold text-gray-700 hover:text-blue-700 transition-all flex items-center justify-between group text-left"
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
                {/* Header da mensagem do assistente */}
                {m.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-200/60 text-[10px] text-gray-500">
                    {m.source === 'gemini' ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        <Sparkles size={11} /> Gemini 3.8 Flash • Dados Reais
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        <Database size={11} /> Consulta Direta ao Banco
                      </span>
                    )}
                  </div>
                )}

                <div className="whitespace-pre-line leading-relaxed">{m.content}</div>

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
                  <UserIcon size={18} />
                </div>
              )}
            </div>
          ))}

          {/* Indicador de carregamento */}
          {isLoading && (
            <div className="flex gap-3 items-center">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                <Bot size={18} />
              </div>
              <div className="bg-slate-100 border border-gray-200 px-4 py-2.5 rounded-2xl rounded-bl-sm text-xs text-gray-600 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-blue-600" />
                <span>Consultando e interpretando os dados do sistema...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isLoading && handleSendQuery(input)}
              placeholder="Digite sua dúvida sobre equipamentos, manutenções, problemas, GUT ou solicitações..."
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50"
            />
            <Button onClick={() => handleSendQuery(input)} disabled={isLoading || !input.trim()}>
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
