// Wallet WCCM — AI Mortgage Strategy Advisor route.
//
// A thin, safe proxy to the Anthropic Messages API. The API key lives here on
// the server (Netlify env var), never in the browser.
//
// DESIGN RULE: the deterministic calculators are the ONLY source of numbers.
// The client computes every figure with its verified tools and passes them in;
// this route's model job is strictly to PHRASE an assistant message, in the
// selected language, grounded only in the numbers provided. It must never
// invent, recompute, or alter a dollar amount, rate, LTV, or percent, and must
// use cautious language (possible / estimated / subject to lender guidelines) —
// never "approved", "qualified", or "guaranteed".
//
// If the selected AI provider is not configured the route returns 501 { error:
// 'not_configured' } and the client falls back to local advisor mode.
//
// The actual phrasing call is provider-agnostic (see _shared/aiProvider.mjs):
// it goes to Anthropic directly OR through the Measured Decision V2 Cloudflare AI
// Gateway (OpenAI / Anthropic / Google), selected by WWCCM_AI_PROVIDER. None of
// the advisor logic or compliance rules below depend on which backend is used.

import { phraseWithAI, isAiConfigured } from './_shared/aiProvider.mjs';
import { advisorSystemPrompt, buildAdvisorContext, plainText } from './_shared/advisorContext.mjs';

// The system prompt and CONTEXT block live in _shared/advisorContext.mjs so the
// chat route and the voice route apply the same rules: the model only sees
// figures that belong to this borrower (never the demo scenario), and intake
// follows the loan purpose (a refinance has no down payment).

export default async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  if (!isAiConfigured()) {
    return json({ error: 'not_configured' }, 501);
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const history = Array.isArray(payload.historySummary) ? payload.historySummary.slice(-8) : [];
  const messages = [
    ...history
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.text)
      .map((m) => ({ role: m.role, content: String(m.text).slice(0, 2000) })),
    {
      role: 'user',
      content: `${buildAdvisorContext(payload)}\n\nUser's latest message: ${String(payload.userMessage || '').slice(0, 2000)}`,
    },
  ];

  try {
    let assistantMessage;
    try {
      assistantMessage = await phraseWithAI({
        system: advisorSystemPrompt(payload.language || 'en'),
        messages,
        maxTokens: 500,
      });
    } catch (e) {
      const status = e && e.status === 501 ? 501 : 502;
      if (status === 501) return json({ error: 'not_configured' }, 501);
      return json({ error: 'upstream_error', detail: String(e && e.detail ? e.detail : e).slice(0, 500) }, 502);
    }
    assistantMessage = plainText(assistantMessage);
    if (!assistantMessage) return json({ error: 'empty_reply' }, 502);

    // Return the full structured contract: deterministic fields are echoed back
    // (the engine remains authoritative) plus the model's phrased message.
    return json({
      assistantMessage,
      parsedScenario: payload.profile ?? {},
      updatedProfile: payload.profile ?? {},
      missingFields: payload.missingFields ?? [],
      nextQuestions: payload.nextQuestions ?? [],
      possibleLoanPaths: payload.possibleLoanPaths ?? [],
      cashToCloseEstimate: payload.cashToCloseEstimate && payload.cashToCloseEstimate.hasBoth === true ? payload.cashToCloseEstimate : null,
      warnings: payload.warnings ?? [],
      suggestedActions: payload.suggestedActions ?? [],
      requiresHumanReview: payload.requiresHumanReview ?? true,
    });
  } catch (err) {
    return json({ error: 'proxy_failure', detail: String(err).slice(0, 300) }, 502);
  }
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const config = { path: '/api/mortgage-strategy-advisor' };
