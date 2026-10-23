// Shared AI context for the Wallet WCCM advisor (chat + voice).
//
// Why this exists: until a borrower has given BOTH a purchase price and a down
// payment, the client runs the calculator on the built-in demo scenario
// ($1,399,000 price · $149,000 down · Non-QM) so the UI has something to show.
// Those demo figures used to be forwarded to the model with a "hasBoth: false"
// flag, and the model regularly read them back as the borrower's own numbers
// ("the figures I have here are for a purchase with $149,000 down"). A
// refinance never collects a down payment, so refinance chats were ALWAYS fed
// the demo purchase.
//
// Rule enforced here: the model only ever sees figures that belong to this
// borrower. When the engine numbers are not real, no dollar amount, LTV or
// payment reaches the prompt at all — and the intake instructions follow the
// loan purpose (a refinance has no down payment).

export const LANG_NAME = { en: 'English', ru: 'Russian', es: 'Spanish', zh: 'Simplified Chinese' };

/** 'purchase' | 'refinance' | null — taken from the deterministic profile. */
export function loanPurposeOf(profile) {
  const p = profile && typeof profile === 'object' ? profile.loanPurpose : null;
  return p === 'refinance' || p === 'purchase' ? p : null;
}

/** True only when the engine numbers are the borrower's own (price + down known). */
export function hasRealFigures(estimate) {
  return !!(estimate && typeof estimate === 'object' && estimate.hasBoth === true);
}

export function money(v) {
  return typeof v === 'number' && isFinite(v) ? '$' + Math.round(v).toLocaleString('en-US') : 'unknown';
}

const OCCUPANCY = { primary: 'primary residence', second: 'second home', investment: 'investment property' };

/**
 * Facts the borrower stated themselves (from the deterministic parser). Safe to
 * repeat back — they are the borrower's words, not engine output.
 */
export function knownFactLines(profile) {
  if (!profile || typeof profile !== 'object') return [];
  const purpose = loanPurposeOf(profile);
  const facts = [];
  if (typeof profile.purchasePrice === 'number' && profile.purchasePrice > 0) {
    facts.push(`${purpose === 'refinance' ? 'estimated home value' : 'purchase price'} ${money(profile.purchasePrice)}`);
  }
  if (purpose !== 'refinance' && typeof profile.downPayment === 'number') {
    const pct = typeof profile.downPaymentPercent === 'number' ? ` (${profile.downPaymentPercent}%)` : '';
    facts.push(`down payment ${money(profile.downPayment)}${pct}`);
  }
  const place = [profile.city, profile.stateCode || profile.state, profile.zipOrCounty].filter(Boolean).join(', ');
  if (place) facts.push(`location ${String(place).slice(0, 80)}`);
  if (profile.occupancy && OCCUPANCY[profile.occupancy]) facts.push(OCCUPANCY[profile.occupancy]);
  if (profile.employmentType) facts.push(`employment ${String(profile.employmentType).slice(0, 40)}`);
  if (profile.incomeDocPath) facts.push(`income documentation ${String(profile.incomeDocPath).slice(0, 40)}`);
  if (typeof profile.fico === 'number') facts.push(`credit score about ${profile.fico}`);
  if (profile.borrowerGoal) facts.push(`goal ${String(profile.borrowerGoal).slice(0, 40)}`);
  return facts.length ? [`Known from the borrower: ${facts.join('; ')}`] : [];
}

/**
 * Engine figures for the prompt. Returns the real numbers only when they are
 * the borrower's; otherwise a single line that forbids quoting any figure.
 */
export function figureLines(estimate) {
  if (!hasRealFigures(estimate)) {
    return [
      'Borrower figures: NOT AVAILABLE YET. You have no cash-to-close, payment, LTV, fee or loan-amount numbers for this borrower. Do not state, estimate or allude to any, and never mention an example or sample scenario.',
    ];
  }
  const e = estimate;
  return [
    'Borrower figures: AVAILABLE (computed from the borrower\'s own price and down payment)',
    `Down payment: ${money(e.downPayment)}`,
    `Total cash to close: ${money(e.totalCashToClose)}`,
    `Extra needed beyond down payment: ${money(e.additionalFundsNeeded)}`,
    `LTV: ${typeof e.ltv === 'number' ? e.ltv.toFixed(1) + '%' : 'unknown'}`,
    `Loan type: ${e.loanType || 'unknown'}`,
    `Monthly principal & interest: ${money(e.monthlyPI)}`,
    `Monthly housing (w/ taxes & insurance): ${money(e.monthlyHousing)}`,
  ];
}

/** Purpose-aware "what to do this turn" line when figures are not available. */
export function intakeLine(purpose, estimate) {
  if (hasRealFigures(estimate)) return [];
  if (purpose === 'refinance') {
    return [
      'INTAKE: this is a REFINANCE. There is no down payment — never ask for, mention or assume one. Capture the missing fundamental by asking the Next best question above.',
    ];
  }
  return [
    'INTAKE INCOMPLETE: the purchase price and/or down payment are not both known. Do NOT discuss or itemize closing costs or cash to close. Ask the Next best question above (a down payment may be a dollar amount OR a percent).',
  ];
}

export function advisorSystemPrompt(langCode) {
  const langName = LANG_NAME[langCode] || 'English';
  return `You are the voice of "Wallet WCCM — AI Mortgage Strategy Advisor". You guide borrowers and realtors like a sharp, warm mortgage strategy advisor.

RESPOND ENTIRELY IN ${langName.toUpperCase()}. Regardless of what language the context is written in, your reply must be in ${langName}.

HARD RULES:
- The only numbers you may state are (a) figures listed under "Borrower figures: AVAILABLE" in CONTEXT and (b) facts listed under "Known from the borrower". NEVER invent, estimate, recompute, or change any dollar amount, rate, LTV, or percentage. If CONTEXT says "Borrower figures: NOT AVAILABLE YET", you have no computed numbers — do not quote or hint at any, and never mention an example scenario.
- Follow the loan purpose in CONTEXT. PURCHASE intake order: (1) purchase price, (2) down payment — a dollar amount OR a percent like "20%", (3) state or ZIP, (4) occupancy, (5) how income is earned. REFINANCE: there is NO down payment — never ask for, mention, or assume one; the home's estimated value replaces the purchase price. If the purpose is unknown, do not assume a purchase.
- Ask exactly ONE missing fundamental per turn — the "Next best question to ask" in CONTEXT — unless the user asked their own question; answer theirs first.
- For a purchase, until BOTH the price AND the down payment are known, do NOT discuss, estimate, or itemize closing costs or cash to close. If asked, say in one short sentence you need the down payment first, then ask for it. Accept a percent ("20%", "put 20 down") and never claim you don't know it once given.
- Use cautious language: "possible", "estimated", "may", "subject to lender guidelines", "requires broker review". NEVER say "approved", "qualified", "guaranteed", "you qualify", or promise a rate.
- Never ask for SSN, date of birth, full bank/account numbers, or document uploads.
- Cash-to-close is only one part of the strategy — you compare possible loan paths, identify missing info, explain risks, and hand off to a licensed broker.
- Keep it to 1–5 short sentences. Plain conversational text only: no markdown (no **bold**, no headers, no bullet lists), no emoji.
- Acknowledge newly captured facts briefly, then ask the single next best question if one is provided.`;
}

/** Full CONTEXT block for the chat route. */
export function buildAdvisorContext(payload) {
  const p = payload && typeof payload === 'object' ? payload : {};
  const purpose = loanPurposeOf(p.profile);
  const estimate = p.cashToCloseEstimate;
  const lines = [
    `Loan purpose: ${purpose || 'not stated yet'}`,
    ...knownFactLines(p.profile),
    ...figureLines(estimate),
  ];
  if (Array.isArray(p.possibleLoanPaths) && p.possibleLoanPaths.length) {
    lines.push(
      `Possible loan paths: ${p.possibleLoanPaths.slice(0, 6).map((x) => `${String(x.name).slice(0, 60)} (${String(x.fit).slice(0, 30)})`).join('; ')}`,
    );
  }
  if (Array.isArray(p.missingFields) && p.missingFields.length) {
    lines.push(`Missing info: ${p.missingFields.slice(0, 10).map((x) => String(x).slice(0, 60)).join(', ')}`);
  }
  if (hasRealFigures(estimate) && Array.isArray(p.warnings) && p.warnings.length) {
    lines.push(`Warnings: ${p.warnings.slice(0, 4).map((x) => String(x).slice(0, 200)).join(' | ')}`);
  }
  if (Array.isArray(p.nextQuestions) && p.nextQuestions.length) {
    lines.push(`Next best question to ask (only if the user isn't asking their own): ${String(p.nextQuestions[0]).slice(0, 300)}`);
  }
  lines.push(...intakeLine(purpose, estimate));
  return `CONTEXT (engine-computed and borrower-stated — the only numbers you may use):\n${lines.join('\n')}`;
}

/** Strip markdown emphasis a model may still emit, so the UI never shows **asterisks**. */
export function plainText(s) {
  return String(s || '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .trim();
}
