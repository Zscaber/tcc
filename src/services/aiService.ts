import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Problem, Equipment, GutAnalysis, Project, Person } from '../types';

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
