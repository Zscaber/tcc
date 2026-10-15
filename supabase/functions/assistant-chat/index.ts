// Supabase Edge Function: assistant-chat
// Assistente IA inteligente conectado aos dados reais do Manutenção Flexível
// Autenticação obrigatória com RLS e chamada segura ao Google Gemini (GEMINI_API_KEY)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Cabeçalho de autorização não fornecido." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Configuração do Supabase ausente no servidor." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Cliente autenticado com o token do usuário (respeita RLS estritamente)
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace(/^Bearer\s+/i, "");
const { data: { user }, error: userError } =
  await supabaseClient.auth.getUser(token);
    if (userError || !user) {
  console.error("Falha na autenticação:", {
    message: userError?.message,
    status: userError?.status,
    hasUser: !!user,
  });

  return new Response(
    JSON.stringify({
      error: "Falha na autenticação.",
      details: userError?.message || "Usuário não encontrado.",
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    }
  );
}

    // Perfil real do usuário autenticado
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("id, name, role")
      .eq("id", user.id)
      .maybeSingle();

    const userRole = profile?.role || "student";
    const userName = profile?.name || user.email || "Usuário";

    // Receber payload
    const body = await req.json().catch(() => ({}));
    const message: string = (body.message || "").trim();
    const history: Array<{ role: "user" | "assistant"; content: string }> = Array.isArray(body.history)
      ? body.history.slice(-6) // últimas 6 mensagens para manter contexto sem estourar tokens
      : [];

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Mensagem não pode ser vazia." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Buscar dados reais respeitando RLS via supabaseClient
    const [
      { data: equipmentData },
      { data: problemsData },
      { data: gutData },
      { data: actionPlansData },
      { data: maintenanceData },
      { data: requestsData },
      { data: projectsData },
      { data: peopleData },
      { data: layoutsData, error: layoutsError },
    ] = await Promise.all([
      supabaseClient.from("equipment").select("id, name, code, type, sector, location, status, criticality, next_maintenance, last_maintenance"),
      supabaseClient.from("problems").select("id, title, description, category, sector, status, equipment_id, identification_date, notes"),
      supabaseClient.from("gut_analyses").select("id, problem_id, gravity, urgency, tendency, score, classification"),
      supabaseClient.from("action_plans").select("id, problem_id, what, why, where, when, who, how, how_much, status"),
      supabaseClient.from("maintenance_records").select("id, equipment_id, type, description, date, deadline, status, cost, notes"),
      supabaseClient.from("maintenance_requests").select("id, title, description, sector, location, equipment_id, requester_id, priority, status, notes, rejection_reason, linked_problem_id, created_at"),
      supabaseClient.from("projects").select("id, name, code, sector, status, deadline, progress"),
      supabaseClient.from("people").select("id, name, department, role, shift"),
      supabaseClient.from("layouts").select("id, name, description, width_meters, length_meters"),
    ]);

    const equipment = equipmentData || [];
    const problems = problemsData || [];
    const gutAnalyses = gutData || [];
    const actionPlans = actionPlansData || [];
    const maintenance = maintenanceData || [];
    const requests = requestsData || [];
    const projects = projectsData || [];
    const people = peopleData || [];
    const layouts = layoutsData || [];
    const layoutsLoadFailed = !!layoutsError;

    const todayStr = new Date().toISOString().split("T")[0];

    // Preparar resumo operacional real direcionado
    const openProblems = problems.filter(p => p.status !== "resolved" && p.status !== "cancelled");
    const inMaintEq = equipment.filter(e => e.status === "maintenance" || e.status === "stopped" || e.status === "out_of_service");
    const overdueMaint = maintenance.filter(m => m.status !== "completed" && m.status !== "cancelled" && m.deadline && m.deadline < todayStr);
    const scheduledMaint = maintenance.filter(m => m.status !== "completed" && m.status !== "cancelled");
    const openRequests = requests.filter(r => r.status === "pending" || r.status === "analyzing");
    const overduePlans = actionPlans.filter(a => a.status !== "completed" && a.status !== "cancelled" && a.when && a.when < todayStr);

    // Mapeamento enriquecido de GUT com títulos de problemas e equipamentos
    const rankedGut = [...gutAnalyses]
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 10)
      .map(g => {
        const prob = problems.find(p => p.id === g.problem_id);
        const eq = prob?.equipment_id ? equipment.find(e => e.id === prob.equipment_id) : null;
        return {
          problema: prob?.title || "Não identificado",
          status_problema: prob?.status,
          equipamento: eq ? `${eq.name} (${eq.code})` : "Geral / Não vinculado",
          setor: prob?.sector,
          gravidade: g.gravity,
          urgencia: g.urgency,
          tendencia: g.tendency,
          score_gut: g.score,
          classificacao: g.classification,
        };
      });

    const systemContext = {
      data_atual: todayStr,
      usuario_autenticado: {
        nome: userName,
        perfil: userRole,
      },
      metricas_gerais: {
        total_equipamentos: equipment.length,
        total_areas_mapeadas: layoutsLoadFailed ? "indisponível (erro na consulta)" : layouts.length,
        equipamentos_fora_operacao: inMaintEq.length,
        problemas_em_aberto: openProblems.length,
        manutenções_atrasadas: overdueMaint.length,
        solicitacoes_abertas: openRequests.length,
        planos_5w2h_atrasados: overduePlans.length,
      },
      mapa_de_areas: {
        carregado_com_sucesso: !layoutsLoadFailed,
        total_areas_cadastradas: layoutsLoadFailed ? null : layouts.length,
        areas: layouts.map(l => ({
          nome: l.name,
          dimensoes: `${l.width_meters || 20}m x ${l.length_meters || 15}m`,
          descricao: l.description || undefined,
        })),
      },
      equipamentos_com_anormalidade_ou_manutencao: inMaintEq.map(e => ({
        nome: e.name,
        codigo: e.code,
        setor: e.sector,
        status: e.status,
        criticidade: e.criticality,
        proxima_manutencao: e.next_maintenance,
      })),
      problemas_recentes_abertos: openProblems.slice(0, 8).map(p => {
        const eq = equipment.find(e => e.id === p.equipment_id);
        return {
          titulo: p.title,
          descricao: p.description,
          setor: p.sector,
          status: p.status,
          equipamento: eq ? `${eq.name} (${eq.code})` : "Sem equipamento",
          data_identificacao: p.identification_date,
        };
      }),
      ranking_matriz_gut: rankedGut,
      solicitacoes_manutencao: requests.slice(0, 10).map(r => {
        const eq = equipment.find(e => e.id === r.equipment_id);
        return {
          titulo: r.title,
          status: r.status,
          prioridade: r.priority,
          setor: r.sector,
          equipamento: eq ? eq.name : "N/A",
          motivo_rejeicao: r.rejection_reason || undefined,
        };
      }),
      manutencoes_relevantes: scheduledMaint.slice(0, 10).map(m => {
        const eq = equipment.find(e => e.id === m.equipment_id);
        return {
          descricao: m.description,
          tipo: m.type,
          status: m.status,
          prazo: m.deadline,
          atrasada: !!(m.deadline && m.deadline < todayStr),
          equipamento: eq ? `${eq.name} (${eq.code})` : "N/A",
        };
      }),
      planos_5w2h_ativos: actionPlans.filter(a => a.status !== "completed" && a.status !== "cancelled").slice(0, 8).map(a => ({
        o_que: a.what,
        por_que: a.why,
        responsavel: a.who,
        prazo: a.when,
        status: a.status,
        atrasado: !!(a.when && a.when < todayStr),
      })),
      projetos_ativos: projects.filter(p => p.status === "in_progress").map(p => ({
        nome: p.name,
        codigo: p.code,
        prazo: p.deadline,
        progresso: `${p.progress}%`,
      })),
    };

    // Obter chave do Gemini
    const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "GEMINI_API_KEY não configurada no Supabase Secrets.",
          fallbackAvailable: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 }
      );
    }

    const systemInstruction = `Você é o Assistente IA do sistema Manutenção Flexível, um especialista técnico em gestão e engenharia de manutenção industrial.
Seu objetivo é responder com precisão, clareza e autoridade técnica às perguntas dos usuários.

REGRAS FUNDAMENTAIS:
1. Responda ESTRITAMENTE com base nos dados reais do sistema fornecidos no JSON de contexto.
2. NUNCA invente equipamentos, nomes, códigos, números de solicitações, datas, responsáveis ou pontuações GUT.
3. Se o usuário perguntar sobre dados que não existem no sistema (por exemplo, um equipamento ou problema não cadastrado), declare claramente que não há esse registro no banco de dados.
4. Diferencie ausência de dados de problemas do sistema (ex: "Não há manutenções atrasadas cadastradas no momento" vs erro de consulta).
5. Se a pergunta for conceitual ou de engenharia (ex: "O que é manutenção preditiva?", "Como calcular MTBF?"), responda normalmente com alto rigor técnico sem forçar analogia com equipamentos específicos.
6. A Matriz GUT calcula prioridade por: Gravidade (G) x Urgência (U) x Tendência (T), variando de 1 a 125. Use os valores reais fornecidos.
7. As áreas físicas/mapas de layout da planta correspondem ao campo 'mapa_de_areas' no contexto e são gerenciadas na seção Mapa de Áreas (/layout). Não confunda áreas mapeadas com setores ou equipamentos.
8. Para datas e prazos, considere que a data de hoje é: ${todayStr}.
9. Mantenha um tom profissional, direto e industrial (estilo Lean/TPM).
10. Use Markdown para formatar títulos, listas e destaques quando útil.
11. Ao final, se fizer sentido para a ação do usuário, indique links de navegação para as páginas do sistema:
    - /equipment (Módulo de Equipamentos)
    - /problems (Módulo de Problemas)
    - /gut (Matriz GUT)
    - /action-plans (Planos 5W2H)
    - /maintenance (Ordens de Manutenção)
    - /requests (Solicitações de Manutenção)
    - /layout (Módulo Mapa de Áreas / Layout Industrial)
    - /dashboard (Dashboard Geral)`;

    // Montar histórico de conversação de forma estrita para a API do Gemini
    // Regras obrigatórias do Gemini:
    // 1. O primeiro item deve ter role "user"
    // 2. Os turnos devem alternar estritamente entre "user" e "model"
    // 3. Nenhum texto pode ser vazio
    const sanitizedHistory: Array<{ role: "user" | "model"; text: string }> = [];

    for (const h of history) {
      const role = h.role === "assistant" ? "model" : "user";
      const text = (h.content || "").trim();
      if (!text) continue;

      const prev = sanitizedHistory[sanitizedHistory.length - 1];
      if (prev && prev.role === role) {
        prev.text += `\n\n${text}`;
      } else {
        sanitizedHistory.push({ role, text });
      }
    }

    // O Gemini exige que a conversa comece com role "user"
    while (sanitizedHistory.length > 0 && sanitizedHistory[0].role !== "user") {
      sanitizedHistory.shift();
    }

    // Se o último item do histórico já for "user", remove para não duplicar com o turno atual
    if (sanitizedHistory.length > 0 && sanitizedHistory[sanitizedHistory.length - 1].role === "user") {
      sanitizedHistory.pop();
    }

    const contents: any[] = sanitizedHistory.map(item => ({
      role: item.role,
      parts: [{ text: item.text }],
    }));

    // Adiciona a mensagem atual acompanhada do contexto atualizado de dados reais como turno final do usuário
    contents.push({
      role: "user",
      parts: [
        {
          text: `[DADOS REAIS DO SISTEMA - DATA ATUAL: ${todayStr}]:\n${JSON.stringify(systemContext, null, 2)}\n\n[PERGUNTA DO USUÁRIO]:\n${message}`,
        },
      ],
    });

    // Helper para identificar erros temporários do Gemini (503, UNAVAILABLE, alta demanda, 429)
    const isTemporaryGeminiError = (status: number, errorText: string): boolean => {
      if (status === 503 || status === 429) return true;
      const upper = errorText.toUpperCase();
      return (
        upper.includes("UNAVAILABLE") ||
        upper.includes("OVERLOADED") ||
        upper.includes("HIGH DEMAND") ||
        upper.includes("ALTA DEMANDA") ||
        upper.includes("RESOURCE_EXHAUSTED") ||
        upper.includes("TRY AGAIN LATER")
      );
    };

    // Modelos a tentar: modelo configurado ou gemini-1.5-flash como primário estável da API oficial
    const configuredModel = Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash";
    const modelsToTry = [configuredModel, "gemini-1.5-flash", "gemini-2.0-flash", "gemini-3.8-flash"].filter(
      (m, idx, arr) => arr.indexOf(m) === idx
    );

    let geminiText: string | null = null;
    let lastError: string = "";
    let isTemporaryFailure = false;

    for (const model of modelsToTry) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const fetchOptions = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemInstruction }],
            },
            contents,
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 1000,
            },
          }),
        };

        let res = await fetch(geminiUrl, fetchOptions);

        if (res.ok) {
          const data = await res.json();
          geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
          if (geminiText) break;
        } else {
          const errText = await res.text();
          lastError = errText;

          // Se for erro temporário de indisponibilidade/alta demanda, executa no máximo 1 nova tentativa com espera curta
          if (isTemporaryGeminiError(res.status, errText)) {
            isTemporaryFailure = true;
            console.warn(`[assistant-chat] Indisponibilidade temporária (${res.status} UNAVAILABLE). Tentando 1 recuperação em 1.5s...`);
            await new Promise((resolve) => setTimeout(resolve, 1500));

            try {
              res = await fetch(geminiUrl, fetchOptions);
              if (res.ok) {
                const data = await res.json();
                geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
                if (geminiText) break;
              } else {
                lastError = await res.text();
              }
            } catch (retryErr: any) {
              lastError = retryErr?.message || String(retryErr);
            }
          }
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
      }
    }

    if (!geminiText) {
      // Sanitizar lastError para nunca vazar chaves da API ou tokens
      const sanitizedError = lastError
        .replace(/key=[A-Za-z0-9\-_\.]+/gi, "key=[REDACTED]")
        .replace(/Bearer\s+[A-Za-z0-9\-_\.]+/gi, "Bearer [REDACTED]");

      // Resposta estruturada para indisponibilidade temporária confirmada
      if (isTemporaryFailure || isTemporaryGeminiError(503, lastError)) {
        return new Response(
          JSON.stringify({
            error: "O modelo de IA está temporariamente indisponível devido à alta demanda nos servidores. Por favor, tente novamente em alguns instantes.",
            code: "MODEL_OVERLOADED",
            status: "UNAVAILABLE",
            isTemporary: true,
            details: sanitizedError,
            fallbackAvailable: true,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 503,
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: `Erro ao comunicar com a API do Gemini: ${sanitizedError}`,
          code: "GEMINI_ERROR",
          fallbackAvailable: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 }
      );
    }

    // Detectar links de ação relevantes sugeridos na resposta
    const actionLinks: Array<{ label: string; path: string }> = [];
    if (geminiText.includes("/equipment")) actionLinks.push({ label: "Abrir Equipamentos", path: "/equipment" });
    if (geminiText.includes("/problems")) actionLinks.push({ label: "Abrir Problemas", path: "/problems" });
    if (geminiText.includes("/gut")) actionLinks.push({ label: "Abrir Matriz GUT", path: "/gut" });
    if (geminiText.includes("/action-plans")) actionLinks.push({ label: "Abrir Planos 5W2H", path: "/action-plans" });
    if (geminiText.includes("/maintenance")) actionLinks.push({ label: "Abrir Manutenções", path: "/maintenance" });
    if (geminiText.includes("/requests")) actionLinks.push({ label: "Abrir Solicitações", path: "/requests" });
    if (geminiText.includes("/layout") || geminiText.toLowerCase().includes("mapa de áreas") || geminiText.toLowerCase().includes("mapa de areas")) {
      actionLinks.push({ label: "Abrir Mapa de Áreas", path: "/layout" });
    }
    if (geminiText.includes("/dashboard")) actionLinks.push({ label: "Ir para o Dashboard", path: "/" });

    return new Response(
      JSON.stringify({
        content: geminiText,
        actionLinks: actionLinks.slice(0, 3), // até 3 atalhos mais relevantes
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno no servidor." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
