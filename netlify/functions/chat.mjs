// Wallet WCCM — live "brain" for the AI Cash-to-Close chat.
//
// This is a thin, safe proxy to the Anthropic Messages API. It exists so the
// API key lives on the server (Netlify env var), never in the browser.
//
// IMPORTANT DESIGN RULE: the deterministic cash-to-close engine is the ONLY
// source of numbers. This function receives the already-computed figures and
// the model's job is strictly to PHRASE them like a sharp human loan advisor —
// it must never invent, recompute, or alter a dollar amount, rate, or percent.
//
// If ANTHROPIC_API_KEY is not set the function returns 501 { error:
// 'not_configured' } and the client silently falls back to the local brain.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

// A fast, inexpensive phrasing tier is the right default here — the model only
// rewords numbers the engine already produced. Override with WWCCM_MODEL.
const DEFAULT_MODEL = 'claude-haiku-4-5';

const SYSTEM_PROMPT = `You are the live voice of "Wallet WCCM", an AI Cash-to-Close mortgage advisor. You speak with borrowers and realtors in a chat on the website.

Your job: answer the user's latest message in a warm, sharp, concise way — like a top human loan advisor who respects the person's time.

HARD RULES:
- The numbers in the CONTEXT block are computed by a verified calculation engine. They are the ONLY numbers you may state. NEVER invent, estimate, recompute, or change any dollar amount, rate, LTV, or percentage. If a number you'd want is not in the context, do not make one up — ask for the missing input instead.
- If "hasBoth" is false, the numbers are just an example scenario, NOT the user's. Do not present them as the user's numbers; instead ask for whatever is missing (usually the down payment or price).
- Never ask for SSN, date of birth, full bank/account numbers, or document uploads. Never promise a rate, approval, or loan commitment.
- Keep it to 1–4 short sentences. No markdown headers, no bullet dumps, no emoji. Plain conversational text.
- If the user asked a question, answer it first with the real number, then (if one is provided) ask the single next question.
- Acknowledge any newly captured facts briefly and naturally.`;

function buildContext(payload) {
  const n = payload.numbers || {};
  const money = (v) =>
    typeof v === 'number' && isFinite(v)
      ? '$' + Math.round(v).toLocaleString('en-US')
      : 'unknown';
  const lines = [
    `hasBoth (are these the user's real numbers?): ${n.hasBoth ? 'true' : 'false'}`,
    `Purchase price: ${money(n.purchasePrice)}`,
    `Down payment: ${money(n.downPayment)}`,
    `Loan amount: ${money(n.loanAmount)}`,
    `Total cash to close: ${money(n.totalCashToClose)}`,
    `Extra needed beyond down payment: ${money(n.additionalFundsNeeded)}`,
    `LTV: ${typeof n.ltv === 'number' ? n.ltv.toFixed(1) + '%' : 'unknown'}`,
    `Loan type: ${n.loanType || 'unknown'}`,
    `Monthly principal & interest: ${money(n.monthlyPI)}`,
    `Monthly housing (w/ taxes & insurance): ${money(n.monthlyHousing)}`,
  ];
  if (Array.isArray(payload.captured) && payload.captured.length) {
    lines.push(`Newly captured this turn: ${payload.captured.join('; ')}`);
  }
  if (payload.nextQuestion) {
    lines.push(`The single next question to ask (only if the user isn't asking their own): ${payload.nextQuestion}`);
  }
  return `CONTEXT (engine-computed — the only numbers you may use):\n${lines.join('\n')}`;
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'not_configured' }), {
      status: 501,
      headers: { 'content-type': 'application/json' },
    });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'bad_request' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const history = Array.isArray(payload.history) ? payload.history.slice(-8) : [];
  const messages = [
    ...history
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.text)
      .map((m) => ({ role: m.role, content: String(m.text).slice(0, 2000) })),
    {
      role: 'user',
      content: `${buildContext(payload)}\n\nUser's latest message: ${String(payload.userText || '').slice(0, 2000)}`,
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
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      return new Response(
        JSON.stringify({ error: 'upstream_error', status: resp.status, detail: detail.slice(0, 500) }),
        { status: 502, headers: { 'content-type': 'application/json' } },
      );
    }

    const data = await resp.json();
    const reply = Array.isArray(data.content)
      ? data.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
      : '';
    if (!reply) {
      return new Response(JSON.stringify({ error: 'empty_reply' }), {
        status: 502,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'proxy_failure', detail: String(err).slice(0, 300) }),
      { status: 502, headers: { 'content-type': 'application/json' } },
    );
  }
};

export const config = { path: '/api/chat' };
