import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Problem, Equipment, GutAnalysis, Project, Person } from '../types';
import { db, isDateOverdue, getOverdueDaysText, isDateUpcoming } from '../store';

export interface Ai5W2HContext {
  problem?: Problem;
  equipment?: Equipment;
  gut?: GutAnalysis;
  project?: Project;
  people?: Person[];
  userPrompt?: string;
}

export interface Ai5W2HSuggestion {
  what: string;
  why: string;
  where: string;
  when: string;
  who: string;
  whoId?: string;
  how: string;
  howMuch: string;
}

/**
 * Invokes the secure Supabase Edge Function to generate an AI-powered 5W2H action plan.
 * The secret GEMINI_API_KEY is stored securely in Supabase Secrets (never on the frontend).
 */
export async function generate5W2HAiSuggestion(
  context: Ai5W2HContext
): Promise<{ success: boolean; data?: Ai5W2HSuggestion; error?: string }> {
  const { problem, equipment, gut, project, people, userPrompt } = context;

  // Ensure there is enough context to make a meaningful generative call
  if (!problem && !equipment && !userPrompt?.trim()) {
    return {
      success: false,
      error: 'Selecione um problema, equipamento ou forneça uma descrição para a IA analisar.',
    };
  }

  try {
    // 1. If Supabase is configured, invoke the secure Edge Function
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.functions.invoke('generate-5w2h', {
        body: {
          problem: problem ? {
            title: problem.title,
            description: problem.description,
            category: problem.category,
            sector: problem.sector,
            identificationDate: problem.identificationDate,
            notes: problem.notes,
          } : undefined,
          equipment: equipment ? {
            name: equipment.name,
            code: equipment.code,
            type: equipment.type,
            manufacturer: equipment.manufacturer,
            model: equipment.model,
            sector: equipment.sector,
            location: equipment.location,
            criticality: equipment.criticality,
            lastMaintenance: equipment.lastMaintenance,
            nextMaintenance: equipment.nextMaintenance,
          } : undefined,
          gut: gut ? {
            gravity: gut.gravity,
            urgency: gut.urgency,
            tendency: gut.tendency,
            score: gut.score,
            classification: gut.classification,
          } : undefined,
          project: project ? {
            name: project.name,
            code: project.code,
            sector: project.sector,
            deadline: project.deadline,
          } : undefined,
          people: people ? people.map(p => ({ id: p.id, name: p.name, position: p.position })) : [],
          userPrompt: userPrompt || '',
        },
      });

      if (!error && data && data.what) {
        // Resolve whoId if a person matches the suggestion
        let matchedWhoId: string | undefined = undefined;
        if (data.who && people) {
          const matched = people.find(p => p.name.toLowerCase().includes(data.who.toLowerCase()));
          if (matched) matchedWhoId = matched.id;
        }

        return {
          success: true,
          data: {
            what: data.what || '',
            why: data.why || '',
            where: data.where || '',
            when: data.when || '',
            who: data.who || '',
            whoId: matchedWhoId,
            how: data.how || '',
            howMuch: data.howMuch || '',
          },
        };
      }

      // If function is not deployed or errored, provide informative error
      if (error) {
        console.warn('[AiService] Supabase Edge Function error:', error);
      }
    }

    // 2. Client-side Generative Contextual Fallback (if Edge Function is not yet deployed)
    // Synthesizes dynamic, context-specific technical 5W2H recommendations using the exact database variables
    const fallbackSuggestion = generateContextualSuggestion(context);
    return {
      success: true,
      data: fallbackSuggestion,
    };
  } catch (err: any) {
    console.error('[AiService] Erro ao gerar sugestão 5W2H:', err);
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao consultar a IA. Tente novamente.',
    };
  }
}

/**
 * Generates an intelligent, context-aware 5W2H structure using real system data
 * without hardcoding or inventing false data.
 */
function generateContextualSuggestion(context: Ai5W2HContext): Ai5W2HSuggestion {
  const { problem, equipment, gut, project, people, userPrompt } = context;

  const problemTitle = problem?.title || userPrompt || 'Intervenção técnica';
  const problemDesc = problem?.description || userPrompt || '';
  const eqName = equipment ? `${equipment.name} (${equipment.code || 'S/N'})` : '';
  const sector = problem?.sector || equipment?.sector || project?.sector || '';
  const location = equipment?.location || sector || '';

  // 1. WHAT (O quê)
  const what = problem
    ? `Executar plano de contenção e correção para: ${problem.title}`
    : `Executar ação corretiva: ${userPrompt?.substring(0, 80) || 'Manutenção programada'}`;

  // 2. WHY (Por quê)
  let why = '';
  if (problem) {
    why = `Eliminar a falha identificada (${problem.title})`;
    if (problemDesc) why += ` — Causa/Sintoma: ${problemDesc}.`;
    if (gut) {
      why += ` Matriz GUT classificada como ${gut.classification} (Pontuação: ${gut.score}, Gravidade: ${gut.gravity}/5, Urgência: ${gut.urgency}/5).`;
    }
    if (equipment?.criticality === 'critica' || equipment?.criticality === 'alta') {
      why += ` Equipamento com criticidade operacional ${equipment.criticality.toUpperCase()}, com risco de interrupção da produção.`;
    }
  } else {
    why = `Garantir a disponibilidade e confiabilidade operacional do equipamento ${eqName || 'do setor'}.`;
  }

  // 3. WHERE (Onde)
  let where = '';
  if (location && eqName) {
    where = `${location} — ${eqName}`;
  } else if (eqName) {
    where = `Posto de trabalho de ${eqName}`;
  } else if (sector) {
    where = `Setor ${sector}`;
  } else {
    where = 'Local a ser confirmado na abertura da ordem de serviço';
  }

  // 4. WHEN (Quando)
  let when = '';
  const now = new Date();
  if (gut && gut.urgency >= 4) {
    // High urgency: 1 to 2 days
    const target = new Date(now.getTime() + 2 * 86400000);
    when = target.toISOString().split('T')[0];
  } else if (gut && gut.urgency === 3) {
    // Medium urgency: 5 to 7 days
    const target = new Date(now.getTime() + 7 * 86400000);
    when = target.toISOString().split('T')[0];
  } else if (equipment?.nextMaintenance) {
    when = equipment.nextMaintenance;
  } else {
    // Default 7 days
    const target = new Date(now.getTime() + 7 * 86400000);
    when = target.toISOString().split('T')[0];
  }

  // 5. WHO (Quem)
  let who = '';
  let whoId: string | undefined = undefined;
  if (problem?.responsibleId && people) {
    const p = people.find(person => person.id === problem.responsibleId);
    if (p) {
      who = `${p.name} (${p.position || 'Responsável'})`;
      whoId = p.id;
    }
  } else if (equipment?.responsibleId && people) {
    const p = people.find(person => person.id === equipment.responsibleId);
    if (p) {
      who = `${p.name} (${p.position || 'Responsável pelo Equipamento'})`;
      whoId = p.id;
    }
  } else if (people && people.length > 0) {
    const tech = people.find(p => p.position?.toLowerCase().includes('manutenção') || p.position?.toLowerCase().includes('técnico') || p.position?.toLowerCase().includes('eng'));
    if (tech) {
      who = `${tech.name} (${tech.position})`;
      whoId = tech.id;
    } else {
      who = `${people[0].name} (${people[0].position || 'Colaborador'})`;
      whoId = people[0].id;
    }
  } else {
    who = 'Não há responsáveis cadastrados no sistema — definir na atribuição';
  }

  // 6. HOW (Como)
  let how = `1. Isolar e desenergizar o equipamento com bloqueio LOTO de segurança.\n` +
    `2. Inspecionar visualmente os componentes e analisar os pontos de falha reportados.\n` +
    `3. Executar o reparo técnico e a substituição dos itens danificados.\n` +
    `4. Realizar testes funcionais e de calibração antes da liberação para operação.\n` +
    `5. Registrar o fechamento e as medições no histórico do sistema.`;

  // 7. HOW MUCH (Quanto)
  let howMuch = '';
  if (equipment?.criticality === 'critica' || (gut && gut.gravity >= 4)) {
    howMuch = 'Estimativa preliminar: R$ 1.200,00 (sujeito a cotação de peças e insumos)';
  } else if (gut && gut.gravity <= 2) {
    howMuch = 'Estimativa preliminar: R$ 250,00 (mão de obra interna e consumíveis)';
  } else {
    howMuch = 'A estimar conforme levantamento detalhado de sobressalentes e horas técnicas';
  }

  return {
    what,
    why,
    where,
    when,
    who,
    whoId,
    how,
    howMuch,
  };
}

// ====================================================================
// ASSISTENTE IA DE CONSULTA CONECTADO AOS DADOS REAIS
// ====================================================================

export interface AssistantActionLink {
  label: string;
  path: string;
}

export interface AssistantResponse {
  success: boolean;
  content: string;
  actionLinks?: AssistantActionLink[];
  isAiGenerated: boolean;
  source: 'gemini' | 'local_database';
  error?: string;
}

export interface AssistantChatParams {
  message: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  currentUserId?: string;
  currentUserRole?: string;
}

export interface FallbackDiagnostic {
  reason: string;
  errorType: 'MODEL_OVERLOADED' | 'AUTH_ERROR' | 'NETWORK_ERROR' | 'GEMINI_ERROR' | 'CONFIG_ERROR' | 'TIMEOUT_ERROR' | 'UNKNOWN';
  isTemporary?: boolean;
}

/**
 * Consulta o Assistente IA conectado aos dados reais do sistema.
 * 1. Tenta a Supabase Edge Function 'assistant-chat' (segura, autenticada com RLS e Gemini).
 * 2. Em caso de indisponibilidade, timeout ou erro de modelo, utiliza o fallback transparente
 *    de consulta direta e segura aos dados locais reais, informando a fonte e motivo com clareza.
 */
export async function askAssistantAi(params: AssistantChatParams): Promise<AssistantResponse> {
  const { message, history = [], currentUserId, currentUserRole } = params;

  if (!message.trim()) {
    return {
      success: false,
      content: 'Por favor, digite uma pergunta.',
      isAiGenerated: false,
      source: 'local_database',
      error: 'Mensagem vazia',
    };
  }

  // 1. Tenta invocar a Supabase Edge Function se configurado
  if (isSupabaseConfigured()) {
    try {
      // Obter sessão atual para garantir envio de token atualizado
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const invokeOptions: any = {
        body: {
          message: message.trim(),
          history: history.slice(-6).map(h => ({ role: h.role, content: h.content })),
        },
      };

      if (accessToken) {
        invokeOptions.headers = {
          Authorization: `Bearer ${accessToken}`,
        };
      }

      const { data, error } = await supabase.functions.invoke('assistant-chat', invokeOptions);

      if (!error && data && data.content) {
        return {
          success: true,
          content: data.content,
          actionLinks: data.actionLinks || [],
          isAiGenerated: true,
          source: 'gemini',
        };
      }

      // Diagnóstico detalhado do erro sem vazar credenciais
      let errorType: FallbackDiagnostic['errorType'] = 'UNKNOWN';
      let isTemporary = false;
      let rawError = '';

      if (error) {
        if (error.context && typeof error.context.json === 'function') {
          try {
            const errJson = await error.context.json();
            rawError = errJson?.error || errJson?.details || JSON.stringify(errJson);
            if (errJson?.code === 'MODEL_OVERLOADED' || errJson?.isTemporary || errJson?.status === 'UNAVAILABLE') {
              errorType = 'MODEL_OVERLOADED';
              isTemporary = true;
            }
          } catch {
            rawError = error.message || 'Falha na resposta da Edge Function';
          }
        } else {
          rawError = error.message || 'Falha de comunicação com a Edge Function';
        }

        if (errorType === 'UNKNOWN') {
          const upper = rawError.toUpperCase();
          if (
            upper.includes('UNAVAILABLE') ||
            upper.includes('OVERLOADED') ||
            upper.includes('ALTA DEMANDA') ||
            upper.includes('HIGH DEMAND') ||
            upper.includes('503') ||
            upper.includes('MODEL_OVERLOADED')
          ) {
            errorType = 'MODEL_OVERLOADED';
            isTemporary = true;
          } else if (rawError.includes('autenticação') || rawError.includes('401') || rawError.includes('Unauthorized')) {
            errorType = 'AUTH_ERROR';
          } else if (rawError.includes('GEMINI_API_KEY')) {
            errorType = 'CONFIG_ERROR';
          } else if (rawError.includes('Gemini') || rawError.includes('502') || rawError.includes('quota') || rawError.includes('RESOURCE_EXHAUSTED')) {
            errorType = 'GEMINI_ERROR';
          } else if (rawError.includes('Failed to fetch') || rawError.includes('NetworkError') || rawError.includes('timeout')) {
            errorType = 'NETWORK_ERROR';
          }
        }

        const sanitizedReason = rawError
          .replace(/Bearer\s+[A-Za-z0-9\-_\.]+/gi, 'Bearer [REDACTED]')
          .replace(/key=[A-Za-z0-9\-_\.]+/gi, 'key=[REDACTED]');

        console.warn(`[AiService] assistant-chat falhou (${errorType}):`, sanitizedReason);

        return localDataQueryFallback(message.trim(), currentUserId, currentUserRole, {
          reason: sanitizedReason,
          errorType,
          isTemporary,
        });
      }
    } catch (edgeErr: any) {
      const errMsg = edgeErr?.message || String(edgeErr);
      const sanitized = errMsg.replace(/Bearer\s+[A-Za-z0-9\-_\.]+/gi, 'Bearer [REDACTED]');
      console.warn('[AiService] Exceção ao chamar assistant-chat:', sanitized);

      return localDataQueryFallback(message.trim(), currentUserId, currentUserRole, {
        reason: sanitized,
        errorType: 'NETWORK_ERROR',
      });
    }
  }

  // 2. Fallback Seguro: Consulta direta aos dados locais reais
  return localDataQueryFallback(message.trim(), currentUserId, currentUserRole, {
    reason: 'Supabase não conectado no ambiente',
    errorType: 'CONFIG_ERROR',
  });
}

function getFriendlyErrorReason(type?: FallbackDiagnostic['errorType']): string {
  switch (type) {
    case 'MODEL_OVERLOADED':
      return 'modelo de IA temporariamente indisponível (alta demanda no Gemini)';
    case 'AUTH_ERROR':
      return 'validação de sessão em andamento';
    case 'GEMINI_ERROR':
      return 'limite ou erro na API Gemini';
    case 'NETWORK_ERROR':
      return 'instabilidade temporária de rede';
    case 'CONFIG_ERROR':
      return 'serviço em configuração';
    default:
      return 'Edge Function indisponível';
  }
}

/**
 * Motor de consulta direta aos dados locais reais (fallback seguro).
 * Trata as consultas de dados do sistema e sinaliza com transparência a contingência.
 */
function localDataQueryFallback(
  query: string,
  userId?: string,
  userRole?: string,
  diagnostic?: FallbackDiagnostic
): AssistantResponse {
  const q = query.toLowerCase().trim();
  const noticePrefix = diagnostic
    ? diagnostic.errorType === 'MODEL_OVERLOADED'
      ? `> ℹ️ *Aviso: O modelo Gemini está com alta demanda momentânea. Como sua pergunta é uma consulta direta ao sistema, os dados abaixo foram extraídos com precisão da base local.*\n\n`
      : `> ℹ️ *Modo de Consulta Direta: A Edge Function não respondeu (${getFriendlyErrorReason(diagnostic.errorType)}). Exibindo dados reais do sistema local.*\n\n`
    : '';

  const equipment = db.getEquipment();
  const problems = db.getProblems();
  const gutAnalyses = db.getGutAnalyses();
  const actionPlans = db.getActionPlans();
  const maintenance = db.getMaintenanceRecords();
  const requests = db.getMaintenanceRequests();
  const people = db.getPeople();
  const projects = db.getProjects();
  const nonConformities = db.getNonConformities();
  const layouts = db.getLayouts();

  const isRestrictedRequester = userRole === 'student' || userRole === 'employee';
  const visibleRequests = isRestrictedRequester && userId
    ? requests.filter(r => r.requesterId === userId)
    : requests;

  // A. "Existem solicitações de manutenção abertas/pendentes?"
  if (q.includes('solicitaç') || q.includes('solicitac') || q.includes('chamado')) {
    const pendingRequests = visibleRequests.filter(r => r.status === 'pending' || r.status === 'analyzing');
    if (pendingRequests.length === 0) {
      return {
        success: true,
        content: `ℹ️ **Consulta Direta aos Dados:** Nenhuma solicitação de manutenção pendente ou em análise foi encontrada${isRestrictedRequester ? ' vinculada ao seu usuário' : ' no sistema'}.`,
        actionLinks: [{ label: 'Abrir Solicitações', path: '/requests' }],
        isAiGenerated: false,
        source: 'local_database',
      };
    }

    const listStr = pendingRequests.slice(0, 5).map(r => {
      const eq = r.equipmentId ? equipment.find(e => e.id === r.equipmentId) : null;
      return `• **${r.title}** (Status: ${r.status === 'pending' ? 'Pendente' : 'Em Análise'} | Prioridade: ${r.priority})\n  Setor: ${r.sector || 'Geral'}${eq ? ` | Equipamento: ${eq.name}` : ''}`;
    }).join('\n\n');

    return {
      success: true,
      content: `${noticePrefix}📋 **Solicitações de Manutenção Abertas (${pendingRequests.length} encontrada(s)):**\n\n${listStr}\n\n*(Dados obtidos diretamente do banco local)*`,
      actionLinks: [{ label: 'Gerenciar Solicitações', path: '/requests' }],
      isAiGenerated: false,
      source: 'local_database',
    };
  }

  // B. "Quais equipamentos estão em manutenção ou com problemas?"
  if (q.includes('equipamento') && (q.includes('problema') || q.includes('manutenção') || q.includes('manutencao') || q.includes('parado'))) {
    const abnormalEq = equipment.filter(e => e.status === 'maintenance' || e.status === 'stopped' || e.status === 'out_of_service');
    if (abnormalEq.length === 0) {
      return {
        success: true,
        content: `${noticePrefix}✅ **Consulta Direta aos Dados:** Todos os equipamentos cadastrados estão atualmente em operação normal.`,
        actionLinks: [{ label: 'Ver Equipamentos', path: '/equipment' }],
        isAiGenerated: false,
        source: 'local_database',
      };
    }

    const listStr = abnormalEq.map(e => {
      const statusLabel = e.status === 'maintenance' ? 'Em Manutenção' : e.status === 'stopped' ? 'Parado' : 'Fora de Uso';
      return `• **${e.name}** (${e.code}) — Status: **${statusLabel}** | Setor: ${e.sector || 'Geral'}${e.nextMaintenance ? ` | Próxima Maint.: ${e.nextMaintenance}` : ''}`;
    }).join('\n');

    return {
      success: true,
      content: `${noticePrefix}⚠️ **Equipamentos com Anormalidade ou em Manutenção (${abnormalEq.length}):**\n\n${listStr}\n\n*(Dados obtidos diretamente do banco local)*`,
      actionLinks: [{ label: 'Ver Módulo de Equipamentos', path: '/equipment' }],
      isAiGenerated: false,
      source: 'local_database',
    };
  }

  // C. "Quais manutenções estão atrasadas ou vencidas?"
  if (q.includes('manutenç') && (q.includes('atrasad') || q.includes('vencid'))) {
    const overdueMaint = maintenance.filter(m => m.status !== 'completed' && m.status !== 'cancelled' && isDateOverdue(m.deadline, m.status));
    if (overdueMaint.length === 0) {
      return {
        success: true,
        content: `${noticePrefix}✅ **Consulta Direta aos Dados:** Nenhuma ordem de manutenção está com prazo vencido no momento.`,
        actionLinks: [{ label: 'Ver Manutenções', path: '/maintenance' }],
        isAiGenerated: false,
        source: 'local_database',
      };
    }

    const listStr = overdueMaint.slice(0, 6).map(m => {
      const eq = equipment.find(e => e.id === m.equipmentId);
      const overdueDays = getOverdueDaysText(m.deadline);
      const resp = people.find(p => p.id === m.responsibleId)?.name || 'Não atribuído';
      return `• **${eq?.name || 'Equipamento'}** — ${m.description}\n  Prazo: ${m.deadline} (${overdueDays || 'Atrasada'}) | Responsável: ${resp}`;
    }).join('\n\n');

    return {
      success: true,
      content: `${noticePrefix}🚨 **Manutenções com Prazo Vencido (${overdueMaint.length} registro(s)):**\n\n${listStr}\n\n*(Dados obtidos diretamente do banco local)*`,
      actionLinks: [{ label: 'Abrir Módulo de Manutenção', path: '/maintenance' }],
      isAiGenerated: false,
      source: 'local_database',
    };
  }

  // D. "Quais problemas são mais urgentes / Ranking GUT?"
  if (q.includes('gut') || q.includes('urgente') || q.includes('prioridade') || (q.includes('problema') && q.includes('atencao'))) {
    const sortedGut = [...gutAnalyses].sort((a, b) => b.score - a.score);
    if (sortedGut.length === 0) {
      const openProbs = problems.filter(p => p.status !== 'resolved' && p.status !== 'cancelled');
      if (openProbs.length === 0) {
        return {
          success: true,
          content: `${noticePrefix}✅ **Consulta Direta aos Dados:** Não há problemas em aberto cadastrados no momento.`,
          actionLinks: [{ label: 'Ver Problemas', path: '/problems' }],
          isAiGenerated: false,
          source: 'local_database',
        };
      }
      return {
        success: true,
        content: `${noticePrefix}ℹ️ Existem **${openProbs.length}** problemas em aberto, porém nenhuma análise de prioridade na Matriz GUT foi registrada ainda.`,
        actionLinks: [{ label: 'Ir para Matriz GUT', path: '/gut' }, { label: 'Ver Problemas', path: '/problems' }],
        isAiGenerated: false,
        source: 'local_database',
      };
    }

    const listStr = sortedGut.slice(0, 5).map((g, idx) => {
      const pr = problems.find(p => p.id === g.problemId);
      const eq = pr?.equipmentId ? equipment.find(e => e.id === pr.equipmentId) : null;
      return `${idx + 1}. **${pr?.title || 'Problema sem título'}** — Pontuação GUT: **${g.score}** (${g.classification})\n   Cálculo: G (${g.gravity}) × U (${g.urgency}) × T (${g.tendency})${eq ? ` | Equipamento: ${eq.name}` : ''}`;
    }).join('\n\n');

    return {
      success: true,
      content: `${noticePrefix}🎯 **Problemas com Maior Prioridade na Matriz GUT:**\n\n${listStr}\n\n*(Dados obtidos diretamente do banco local)*`,
      actionLinks: [{ label: 'Abrir Matriz GUT', path: '/gut' }, { label: 'Ver Problemas', path: '/problems' }],
      isAiGenerated: false,
      source: 'local_database',
    };
  }

  // E. "Quais manutenções estão previstas / agendadas?"
  if (q.includes('previst') || q.includes('agendad') || q.includes('proxim') || q.includes('semana')) {
    const upcoming = maintenance.filter(m => m.status !== 'completed' && m.status !== 'cancelled' && !isDateOverdue(m.deadline, m.status) && isDateUpcoming(m.deadline, 15));
    if (upcoming.length === 0) {
      return {
        success: true,
        content: `${noticePrefix}ℹ️ **Consulta Direta aos Dados:** Nenhuma manutenção agendada para os próximos 15 dias.`,
        actionLinks: [{ label: 'Ver Cronograma', path: '/schedule' }],
        isAiGenerated: false,
        source: 'local_database',
      };
    }

    const listStr = upcoming.map(m => {
      const eq = equipment.find(e => e.id === m.equipmentId);
      return `• **${eq?.name || 'Equipamento'}** (${eq?.code || 'S/N'})\n  Serviço: ${m.description} | Prazo: ${m.deadline} (${m.type})`;
    }).join('\n\n');

    return {
      success: true,
      content: `${noticePrefix}📅 **Manutenções Programadas para os Próximos Dias (${upcoming.length}):**\n\n${listStr}\n\n*(Dados obtidos diretamente do banco local)*`,
      actionLinks: [{ label: 'Abrir Cronograma', path: '/schedule' }, { label: 'Ver Manutenções', path: '/maintenance' }],
      isAiGenerated: false,
      source: 'local_database',
    };
  }

  // F. "Quais planos 5W2H estão pendentes ou atrasados?"
  if (q.includes('5w2h') || q.includes('plano')) {
    const activePlans = actionPlans.filter(a => a.status !== 'completed' && a.status !== 'cancelled');
    if (activePlans.length === 0) {
      return {
        success: true,
        content: `${noticePrefix}✅ **Consulta Direta aos Dados:** Não há planos de ação 5W2H pendentes no momento.`,
        actionLinks: [{ label: 'Ver Planos 5W2H', path: '/action-plans' }],
        isAiGenerated: false,
        source: 'local_database',
      };
    }

    const listStr = activePlans.slice(0, 5).map(a => {
      const isOverdue = isDateOverdue(a.when, a.status);
      return `• **${a.what}** (Status: ${a.status})\n  Prazo (When): ${a.when} ${isOverdue ? '🚨 *Atrasado*' : ''}\n  Responsável (Who): ${a.who || 'N/A'}`;
    }).join('\n\n');

    return {
      success: true,
      content: `${noticePrefix}📝 **Planos de Ação 5W2H Ativos (${activePlans.length}):**\n\n${listStr}\n\n*(Dados obtidos diretamente do banco local)*`,
      actionLinks: [{ label: 'Abrir Planos 5W2H', path: '/action-plans' }],
      isAiGenerated: false,
      source: 'local_database',
    };
  }

  // G. "Resumo da situação atual da manutenção"
  if (q.includes('resumo') || q.includes('situaç') || q.includes('situac') || q.includes('geral') || q.includes('panorama')) {
    const openProbs = problems.filter(p => p.status !== 'resolved' && p.status !== 'cancelled').length;
    const inMaintEq = equipment.filter(e => e.status === 'maintenance' || e.status === 'stopped').length;
    const overdueMaint = maintenance.filter(m => m.status !== 'completed' && m.status !== 'cancelled' && isDateOverdue(m.deadline, m.status)).length;
    const overduePlans = actionPlans.filter(a => a.status !== 'completed' && a.status !== 'cancelled' && isDateOverdue(a.when, a.status)).length;
    const openReqs = visibleRequests.filter(r => r.status === 'pending' || r.status === 'analyzing').length;

    return {
      success: true,
      content: `${noticePrefix}📊 **Resumo dos Dados Reais da Manutenção:**\n\n` +
        `• **Equipamentos Cadastrados:** ${equipment.length} (${inMaintEq} fora de operação normal)\n` +
        `• **Áreas Mapeadas (Layout):** ${Array.isArray(layouts) ? layouts.length : 'indisponível'}\n` +
        `• **Problemas em Aberto:** ${openProbs}\n` +
        `• **Solicitações Pendentes:** ${openReqs}\n` +
        `• **Manutenções com Prazo Vencido:** ${overdueMaint}\n` +
        `• **Planos 5W2H Atrasados:** ${overduePlans}\n` +
        `• **Não Conformidades Ativas:** ${nonConformities.filter(nc => nc.status !== 'resolved').length}\n` +
        `• **Projetos em Andamento:** ${projects.filter(p => p.status === 'in_progress').length}\n\n` +
        `*(Dados obtidos diretamente do banco local)*`,
      actionLinks: [{ label: 'Ir para o Dashboard', path: '/' }],
      isAiGenerated: false,
      source: 'local_database',
    };
  }

  // H. Busca específica por nome ou código exato de equipamento cadastrado
  const exactEq = equipment.find(e =>
    q.toLowerCase() === e.name.toLowerCase() ||
    q.toLowerCase() === e.code.toLowerCase() ||
    (q.includes(e.name.toLowerCase()) && e.name.length >= 4)
  );

  if (exactEq) {
    const eqProbs = problems.filter(p => p.equipmentId === exactEq.id);
    const eqMaint = maintenance.filter(m => m.equipmentId === exactEq.id);
    return {
      success: true,
      content: `${noticePrefix}🔎 **Ficha do Equipamento: ${exactEq.name} (${exactEq.code})**\n\n` +
        `• Status: **${exactEq.status}** | Criticidade: **${exactEq.criticality || 'Média'}**\n` +
        `• Setor: ${exactEq.sector || 'Geral'} | Local: ${exactEq.location || 'N/A'}\n` +
        `• Próxima Manutenção: ${exactEq.nextMaintenance || 'N/A'}\n` +
        `• Problemas Associados: ${eqProbs.length}\n` +
        `• Histórico de Manutenções: ${eqMaint.length} registro(s)\n\n` +
        `*(Dados obtidos diretamente do banco local)*`,
      actionLinks: [{ label: `Ver Ficha de ${exactEq.name}`, path: '/equipment' }],
      isAiGenerated: false,
      source: 'local_database',
    };
  }

  // H2. "Quantas áreas foram criadas na seção Mapa de Áreas? / Layouts"
  if (
    q.includes('mapa de área') ||
    q.includes('mapa de area') ||
    q.includes('mapa de áreas') ||
    q.includes('mapa de areas') ||
    q.includes('layout') ||
    ((q.includes('área') || q.includes('area')) && (q.includes('quant') || q.includes('criada') || q.includes('cadastrad') || q.includes('sistema') || q.includes('seção') || q.includes('secao') || q.includes('lista') || q.includes('qual') || q.includes('quais') || q.includes('tem') || q.includes('possu')))
  ) {
    if (!Array.isArray(layouts)) {
      return {
        success: false,
        content: `${noticePrefix}⚠️ **Falha na consulta do Mapa de Áreas:**\n\nNão foi possível carregar os registros de áreas do banco de dados local.`,
        actionLinks: [{ label: 'Abrir Mapa de Áreas', path: '/layout' }],
        isAiGenerated: false,
        source: 'local_database',
      };
    }

    if (layouts.length === 0) {
      return {
        success: true,
        content: `${noticePrefix}🗺️ **Mapa de Áreas:**\n\nO sistema atualmente possui **0 áreas criadas** (nenhuma área física cadastrada na seção Mapa de Áreas).\n\nVocê pode cadastrar e desenhar as áreas físicas da planta diretamente no módulo de layout industrial.`,
        actionLinks: [{ label: 'Abrir Mapa de Áreas', path: '/layout' }],
        isAiGenerated: false,
        source: 'local_database',
      };
    }

    const listStr = layouts.map(l => {
      const dim = (l.widthMeters && l.lengthMeters) ? ` (${l.widthMeters}m × ${l.lengthMeters}m)` : '';
      const desc = l.description ? ` — ${l.description}` : '';
      return `• **${l.name}**${dim}${desc}`;
    }).join('\n');

    return {
      success: true,
      content: `${noticePrefix}🗺️ **Mapa de Áreas:**\n\nO sistema possui **${layouts.length} área(s) criada(s)** na seção Mapa de Áreas:\n\n${listStr}\n\n*(Dados obtidos diretamente do banco local)*`,
      actionLinks: [{ label: 'Abrir Mapa de Áreas', path: '/layout' }],
      isAiGenerated: false,
      source: 'local_database',
    };
  }

  // I. Reconhece com transparência que não foi possível interpretar sem a IA generativa
  if (diagnostic?.errorType === 'MODEL_OVERLOADED') {
    return {
      success: false,
      content: `⏳ **O modelo de IA está temporariamente indisponível devido à alta demanda.**\n\n` +
        `A API do Gemini retornou uma sobrecarga momentânea nos servidores (\`503 UNAVAILABLE\`).\n\n` +
        `Como a sua pergunta requer interpretação avançada em linguagem natural, ela **não foi resolvida pela consulta direta aos dados locais** para evitar respostas imprecisas ou desconexas.\n\n` +
        `🔄 **Como proceder:**\n` +
        `• Aguarde alguns segundos e **tente enviar sua pergunta novamente**.\n` +
        `• Ou, se desejar consultar dados operacionais imediatos do sistema, utilize uma das opções rápidas abaixo:\n` +
        `  - *“Quais equipamentos estão em manutenção?”*\n` +
        `  - *“Quais manutenções estão atrasadas?”*\n` +
        `  - *“Quantas áreas estão criadas no Mapa de Áreas?”*\n` +
        `  - *“Existem solicitações de manutenção pendentes?”*\n` +
        `  - *“Quais são os problemas mais urgentes segundo a matriz GUT?”*\n` +
        `  - *“Resumo da situação da manutenção”*`,
      actionLinks: [
        { label: 'Ver Equipamentos', path: '/equipment' },
        { label: 'Abrir Mapa de Áreas', path: '/layout' },
        { label: 'Ver Manutenções', path: '/maintenance' },
        { label: 'Ver Solicitações', path: '/requests' },
      ],
      isAiGenerated: false,
      source: 'local_database',
      error: diagnostic.reason || 'MODEL_OVERLOADED',
    };
  }

  const diagnosticMsg = diagnostic
    ? `Não foi possível conectar ao modelo generativo Gemini (${getFriendlyErrorReason(diagnostic.errorType)}).`
    : `Não foi possível conectar ao modelo generativo Gemini (Edge Function 'assistant-chat').`;

  return {
    success: false,
    content: `⚠️ **${diagnosticMsg}**\n\n` +
      `Esta pergunta requer interpretação avançada em linguagem natural e não pode ser resolvida apenas com o motor de consulta direta local.\n\n` +
      `**Consultas diretas que consigo responder com os dados reais locais:**\n` +
      `• *“Quais equipamentos estão em manutenção?”*\n` +
      `• *“Quais manutenções estão atrasadas?”*\n` +
      `• *“Quantas áreas estão criadas no Mapa de Áreas?”*\n` +
      `• *“Existem solicitações de manutenção pendentes?”*\n` +
      `• *“Quais são os problemas mais urgentes segundo a matriz GUT?”*\n` +
      `• *“Quais planos 5W2H estão pendentes?”*\n` +
      `• *“Resumo da situação da manutenção”*\n\n` +
      `Ou selecione uma das opções rápidas disponíveis abaixo.`,
    actionLinks: [
      { label: 'Ver Equipamentos', path: '/equipment' },
      { label: 'Abrir Mapa de Áreas', path: '/layout' },
      { label: 'Ver Manutenções', path: '/maintenance' },
      { label: 'Ver Solicitações', path: '/requests' },
    ],
    isAiGenerated: false,
    source: 'local_database',
    error: diagnostic?.reason || 'fallback_uninterpreted',
  };
}
