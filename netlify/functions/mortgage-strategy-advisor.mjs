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

const LANG_NAME = { en: 'English', ru: 'Russian', es: 'Spanish', zh: 'Simplified Chinese' };

const cents = (n) => Math.round(n * 100) / 100;

export function recomputeMonthlyFromProfile(profile = {}) {
  const price = Number(profile.purchasePrice);
  const down = Number(profile.downPayment);
  const rate = Number(profile.interestRate);
  const years = Number(profile.termYears ?? 30);
  if (![price, down, rate, years].every(Number.isFinite) || price <= 0 || down < 0 || down > price || years <= 0) {
    return null;
  }
  const loan = price - down;
  const months = years * 12;
  const r = rate / 100 / 12;
  const monthlyPI = r === 0
    ? loan / months
    : loan * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
  const taxes = profile.propertyTaxAnnual != null
    ? Number(profile.propertyTaxAnnual) / 12
    : price * 0.0125 / 12;
  const insurance = profile.hazardInsuranceAnnual != null
    ? Number(profile.hazardInsuranceAnnual) / 12
    : price * 0.0025 / 12;
  const hoa = Number(profile.hoaMonthly ?? 0);
  const pmi = Number(profile.pmiMonthly ?? 0);
  if (![taxes, insurance, hoa, pmi].every(Number.isFinite)) return null;
  return {
    loanAmount: cents(loan),
    ltv: price > 0 ? loan / price * 100 : 0,
    monthlyPI: cents(monthlyPI),
    monthlyHousing: cents(monthlyPI + taxes + insurance + hoa + pmi),
    ...(profile.closingCosts != null && Number.isFinite(Number(profile.closingCosts))
      ? {
          totalCashToClose: cents(down + Number(profile.closingCosts)),
          additionalFundsNeeded: cents(Number(profile.closingCosts)),
        }
      : {}),
  };
}

export function validateEnginePayload(payload = {}) {
  const client = payload.cashToCloseEstimate || {};
  if (!client.hasBoth) return { ok: true, recomputed: null };
  const recomputed = recomputeMonthlyFromProfile(payload.profile);
  if (!recomputed) return { ok: false, error: 'missing_or_invalid_calculation_inputs' };
  const close = (a, b) => Number.isFinite(Number(a)) && Math.abs(Number(a) - Number(b)) <= 0.02;
  if (!close(client.monthlyPI, recomputed.monthlyPI) ||
      !close(client.monthlyHousing, recomputed.monthlyHousing) ||
      !close(client.ltv, recomputed.ltv) ||
      (recomputed.totalCashToClose != null && !close(client.totalCashToClose, recomputed.totalCashToClose)) ||
      (recomputed.additionalFundsNeeded != null && !close(client.additionalFundsNeeded, recomputed.additionalFundsNeeded))) {
    return { ok: false, error: 'client_calculation_mismatch', recomputed };
  }
  return { ok: true, recomputed, cashVerified: recomputed.totalCashToClose != null };
}

export function responseUsesOnlyAllowedNumbers(message, payload) {
  const tokens = String(message).match(/\$\s?[\d,]+(?:\.\d+)?|\b\d+(?:\.\d+)?%/g) || [];
  if (!tokens.length) return true;
  const c = payload.cashToCloseEstimate || {};
  const allowed = [
    c.downPayment, c.totalCashToClose, c.additionalFundsNeeded, c.ltv,
    c.monthlyPI, c.monthlyHousing, payload.profile?.interestRate,
  ].filter(Number.isFinite).map((n) => cents(Number(n)));
  return tokens.every((token) => {
    const n = Number(token.replace(/[$,%\s]/g, ''));
    return allowed.some((v) => Math.abs(v - n) <= 0.02 || Math.abs(Math.round(v) - n) <= 0.02);
  });
}

function systemPrompt(langCode) {
  const langName = LANG_NAME[langCode] || 'English';
  return `You are the voice of "Wallet WCCM — AI Mortgage Strategy Advisor". You guide borrowers and realtors like a sharp, warm mortgage strategy advisor.

RESPOND ENTIRELY IN ${langName.toUpperCase()}. Regardless of what language the context is written in, your reply must be in ${langName}.

HARD RULES:
- The numbers in the CONTEXT block come from a verified calculation engine. They are the ONLY numbers you may state. NEVER invent, estimate, recompute, or change any dollar amount, rate, LTV, or percentage. If a number is not present, ask for the missing input instead of guessing.
- If "hasBoth" is false, the figures are an example scenario, NOT the user's. Do not present them as the user's numbers; ask for whatever is missing (usually the down payment or price).
- INTAKE ORDER — establish the fundamentals first, in this order, before anything else: (1) purchase price, (2) down payment — accept a dollar amount OR a percent like "20%", (3) state or ZIP, (4) occupancy (primary / second home / investment), (5) how income is earned. Ask exactly ONE missing fundamental per turn — the "Next best question to ask" provided in CONTEXT — and do not skip the down payment.
- Until BOTH the purchase price AND the down payment (a dollar amount or a percent) are known, do NOT discuss, estimate, itemize, or ask preferences about closing costs, cash to close, fees, or "what matters most". If the user asks about closing costs before giving their down payment, answer in one short sentence that you need their down payment first (a dollar amount or a percent), then ask for it.
- A down payment may be given as a percent ("20%", "20 percent", "put 20 down"). Accept it and never claim you don't know it once it has been provided.
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
  if (!c.hasBoth) {
    lines.push(
      'INTAKE INCOMPLETE: the purchase price and/or down payment are not both known. Do NOT discuss, estimate, or itemize closing costs or cash to close as the borrower\'s own. This turn, capture the missing fundamental — ask the Next best question above (the down payment accepts a dollar amount OR a percent).',
    );
  }
  return `CONTEXT (engine-computed — the only numbers you may use):\n${lines.join('\n')}`;
}

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

  const validation = validateEnginePayload(payload);
  if (!validation.ok) {
    return json({ error: validation.error, recomputed: validation.recomputed ?? null }, 422);
  }
  if (validation.recomputed) {
    payload.cashToCloseEstimate = {
      ...payload.cashToCloseEstimate,
      ...validation.recomputed,
    };
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
    let assistantMessage;
    try {
      assistantMessage = await phraseWithAI({
        system: systemPrompt(payload.language || 'en'),
        messages,
        maxTokens: 800,
      });
    } catch (e) {
      const status = e && e.status === 501 ? 501 : 502;
      if (status === 501) return json({ error: 'not_configured' }, 501);
      return json({ error: 'upstream_error', detail: String(e && e.detail ? e.detail : e).slice(0, 500) }, 502);
    }
    if (!assistantMessage) return json({ error: 'empty_reply' }, 502);
    if (!responseUsesOnlyAllowedNumbers(assistantMessage, payload)) {
      return json({ error: 'ungrounded_numeric_reply' }, 502);
    }

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
