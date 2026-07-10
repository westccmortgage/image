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
// If ANTHROPIC_API_KEY is not set the route returns 501 { error:
// 'not_configured' } and the client falls back to local advisor mode.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-haiku-4-5';

const LANG_NAME = { en: 'English', ru: 'Russian', es: 'Spanish', zh: 'Simplified Chinese' };

function systemPrompt(langCode) {
  const langName = LANG_NAME[langCode] || 'English';
  return `You are the voice of "Wallet WCCM — AI Mortgage Strategy Advisor". You guide borrowers and realtors like a sharp, warm mortgage strategy advisor.

RESPOND ENTIRELY IN ${langName.toUpperCase()}. Regardless of what language the context is written in, your reply must be in ${langName}.

HARD RULES:
- The numbers in the CONTEXT block come from a verified calculation engine. They are the ONLY numbers you may state. NEVER invent, estimate, recompute, or change any dollar amount, rate, LTV, or percentage. If a number is not present, ask for the missing input instead of guessing.
- If "hasBoth" is false, the figures are an example scenario, NOT the user's. Do not present them as the user's numbers; ask for whatever is missing (usually the down payment or price).
- Use cautious language: "possible", "estimated", "may", "subject to lender guidelines", "requires broker review". NEVER say "approved", "qualified", "guaranteed", "you qualify", or promise a rate.
- Never ask for SSN, date of birth, full bank/account numbers, or document uploads.
- Cash-to-close is only one part of the strategy — you compare possible loan paths, identify missing info, explain risks, and hand off to a licensed broker.
- Keep it to 1–5 short sentences. Plain conversational text — no markdown headers, no bullet dumps, no emoji.
- Answer the user's question first with the real number(s), acknowledge any newly captured facts, then ask the single next best question if one is provided.`;
}

function buildContext(payload) {
  const money = (v) =>
    typeof v === 'number' && isFinite(v)
      ? '$' + Math.round(v).toLocaleString('en-US')
      : 'unknown';
  const c = payload.cashToCloseEstimate || {};
  const lines = [
    `hasBoth (are these the user's real numbers?): ${c.hasBoth ? 'true' : 'false'}`,
    `Down payment: ${money(c.downPayment)}`,
    `Total cash to close: ${money(c.totalCashToClose)}`,
    `Extra needed beyond down payment: ${money(c.additionalFundsNeeded)}`,
    `LTV: ${typeof c.ltv === 'number' ? c.ltv.toFixed(1) + '%' : 'unknown'}`,
    `Loan type: ${c.loanType || 'unknown'}`,
    `Monthly principal & interest: ${money(c.monthlyPI)}`,
    `Monthly housing (w/ taxes & insurance): ${money(c.monthlyHousing)}`,
  ];
  if (Array.isArray(payload.possibleLoanPaths) && payload.possibleLoanPaths.length) {
    lines.push(
      `Possible loan paths: ${payload.possibleLoanPaths.map((p) => `${p.name} (${p.fit})`).join('; ')}`,
    );
  }
  if (Array.isArray(payload.missingFields) && payload.missingFields.length) {
    lines.push(`Missing info: ${payload.missingFields.join(', ')}`);
  }
  if (Array.isArray(payload.warnings) && payload.warnings.length) {
    lines.push(`Warnings: ${payload.warnings.join(' | ')}`);
  }
  if (Array.isArray(payload.nextQuestions) && payload.nextQuestions.length) {
    lines.push(`Next best question to ask (only if the user isn't asking their own): ${payload.nextQuestions[0]}`);
  }
  return `CONTEXT (engine-computed — the only numbers you may use):\n${lines.join('\n')}`;
}

export default async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
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
      content: `${buildContext(payload)}\n\nUser's latest message: ${String(payload.userMessage || '').slice(0, 2000)}`,
    },
  ];

  try {
    const resp = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.WWCCM_MODEL || DEFAULT_MODEL,
        max_tokens: 500,
        system: systemPrompt(payload.language || 'en'),
        messages,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      return json({ error: 'upstream_error', status: resp.status, detail: detail.slice(0, 500) }, 502);
    }

    const data = await resp.json();
    const assistantMessage = Array.isArray(data.content)
      ? data.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
      : '';
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
      cashToCloseEstimate: payload.cashToCloseEstimate ?? null,
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
