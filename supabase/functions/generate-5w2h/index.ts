// Supabase Edge Function: generate-5w2h
// Secure backend runner for Generative AI (Gemini / LLM) without exposing API keys to the frontend.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { problem, equipment, gut, project, people, userPrompt } = await req.json();

    const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "GEMINI_API_KEY not configured in Supabase Secrets.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Build the prompt context using real system data
    const systemInstruction = `Você é um engenheiro sênior especialista em Manutenção Industrial e Metodologia 5W2H.
Sua missão é analisar o problema, equipamento, matriz GUT e contexto industrial fornecidos e gerar uma sugestão técnica, profissional, precisa e acionável para os 7 campos da matriz 5W2H.

Regras Estritas:
1. Responda ESTRITAMENTE em formato JSON com a seguinte estrutura:
{
  "what": "O que deve ser feito (ação técnica clara)",
  "why": "Por que a ação é necessária (fundamentação técnica baseada nos riscos e impacto)",
  "where": "Local/Setor/Equipamento onde será executada",
  "when": "Data ou prazo sugerido no formato YYYY-MM-DD",
  "who": "Nome ou cargo do responsável técnico recomendado com base na equipe fornecida",
  "how": "Passo a passo detalhado e numerado de como executar",
  "howMuch": "Estimativa de custo preliminar em R$ ou indicação clara de necessidade de orçamento"
}
2. Não invente informações fictícias sem base nos dados. Se faltarem informações para responsável ou custo, declare isso explicitamente.
3. Use linguagem técnica de engenharia industrial em Português do Brasil.`;

    const userContent = JSON.stringify({
      problema: problem || "Não especificado",
      equipamento: equipment || "Não especificado",
      analise_gut: gut || "Não especificado",
      projeto: project || "Não especificado",
      equipe_disponivel: people || [],
      observacoes_usuario: userPrompt || "",
    });

    // Call Google Gemini API (gemini-3.8-flash)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemInstruction },
              { text: `Analise os dados abaixo e retorne o JSON do 5W2H:\n\n${userContent}` },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.2,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      return new Response(
        JSON.stringify({ error: `Gemini API error: ${errText}` }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 502,
        }
      );
    }

    const geminiData = await geminiResponse.json();
    const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return new Response(
        JSON.stringify({ error: "No response text received from Gemini API." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 502,
        }
      );
    }

    const parsed5W2H = JSON.parse(candidateText);

    return new Response(JSON.stringify(parsed5W2H), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
