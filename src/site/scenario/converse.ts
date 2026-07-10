import type { FieldKey, Question, ScenarioProfile } from './types';

// ---------------------------------------------------------------------------
// Conversational layer for the local (no-LLM) assistant. It makes the chat
// actually talk: it understands the user's question, answers it with the real
// numbers, acknowledges what it captured, and asks ONE next question — instead
// of silently filling a table. Pure and testable.
// ---------------------------------------------------------------------------

export type Intent =
  | 'cash' // how much do I need / cash to close
  | 'down' // what's my down payment
  | 'monthly' // monthly payment
  | 'ltv' // loan-to-value
  | 'lower' // how do I reduce cash / payment
  | 'why' // why is it more than the down payment
  | 'fees' // what's included / breakdown
  | 'greet'
  | 'statement'; // just providing info

export interface ReplyNumbers {
  hasBoth: boolean; // both price and down payment known → numbers are real
  downPayment: number;
  totalCashToClose: number;
  additionalFundsNeeded: number;
  ltv: number;
  monthlyPI: number;
  monthlyHousing: number;
}

export interface ReplyInput {
  userText: string;
  /** Human-readable descriptions of facts captured this turn (e.g. "$400,000 down"). */
  capturedText: string[];
  numbers: ReplyNumbers;
  nextQuestion: Question | null;
  isFirstMessage: boolean;
}

const money = (n: number): string => `$${Math.round(n).toLocaleString('en-US')}`;

export function classifyIntent(text: string): Intent {
  const t = text.toLowerCase();
  if (/^\s*(hi|hey|hello|yo|good (morning|afternoon|evening))\b/.test(t)) return 'greet';
  if (/(reduce|lower|less cash|cheaper|minimi[sz]e|save money|bring.*down)/.test(t)) return 'lower';
  if (/(month(ly)?\s*(payment|cost)?|per month|\/mo|mortgage payment)/.test(t)) return 'monthly';
  if (/(ltv|loan.to.value|loan to value)/.test(t)) return 'ltv';
  if (/(why|what.*(mean|difference)|explain)/.test(t)) return 'why';
  if (/(fee|closing cost|what.*(included|cover)|break ?down)/.test(t)) return 'fees';
  if (/(how much.*(need|close|cash|bring|total)|cash to close|total (cash|needed)|need to close|do i need)/.test(t))
    return 'cash';
  if (/(down payment|how much down|my down)/.test(t)) return 'down';
  return 'statement';
}

function answerIntent(intent: Intent, n: ReplyNumbers): string | null {
  switch (intent) {
    case 'cash':
      return n.hasBoth
        ? `You'd need about ${money(n.totalCashToClose)} to close — roughly ${money(n.additionalFundsNeeded)} more than your ${money(n.downPayment)} down payment. That's lender fees, title/escrow, prepaids, taxes and insurance on top of the down payment.`
        : `To give you an exact cash-to-close I just need your down payment. On top of it you'll have lender fees, title/escrow, prepaids, taxes and insurance — that's usually the surprise.`;
    case 'down':
      return n.hasBoth
        ? `Your down payment is ${money(n.downPayment)} (~${n.ltv.toFixed(0)}% loan-to-value). But total cash to close is about ${money(n.totalCashToClose)} — ${money(n.additionalFundsNeeded)} more than the down payment.`
        : null;
    case 'monthly':
      return n.hasBoth
        ? `Estimated principal & interest is about ${money(n.monthlyPI)}/mo (${money(n.monthlyHousing)}/mo with taxes & insurance).`
        : `Once I have your down payment I can estimate the monthly payment too.`;
    case 'ltv':
      return n.hasBoth
        ? `Your loan-to-value is about ${n.ltv.toFixed(1)}% — ${n.ltv > 80 ? 'below 20% down, so PMI/MI or pricing adjustments may apply' : 'at or under 80%, which helps your pricing'}.`
        : null;
    case 'lower':
      return `To lower your cash to close you can negotiate a seller credit, take a lender credit (slightly higher rate for lower upfront cost), or adjust your down payment. I can compare those once your scenario is complete.`;
    case 'why':
      return `Your down payment is only part of it. Closing also needs lender fees, title/escrow, prepaid interest, property taxes and insurance, plus escrow reserves — together that's your "cash to close".`;
    case 'fees':
      return n.hasBoth
        ? `It breaks down into lender fees, title/escrow/third-party, prepaids/taxes/insurance, minus any credits. The full line items are under "Show full breakdown".`
        : `Closing includes lender fees, title/escrow, prepaids, taxes, insurance and escrow reserves. Give me your down payment and I'll total it up.`;
    case 'greet':
      return `Hi! Tell me the home price, your down payment, and how you earn income — I'll compute your real cash to close as we talk.`;
    default:
      return null;
  }
}

function joinHuman(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/**
 * Compose the assistant's spoken reply: acknowledge captured facts, answer the
 * user's question with real numbers, voice the current estimate, then ask the
 * single next question.
 */
export function buildReply(inp: ReplyInput): string[] {
  const { userText, capturedText, numbers, nextQuestion, isFirstMessage } = inp;
  const intent = classifyIntent(userText);
  const lines: string[] = [];

  if (capturedText.length) {
    lines.push(`Got it — ${joinHuman(capturedText)}.`);
  }

  const answer = answerIntent(intent, numbers);
  if (answer) lines.push(answer);

  // Proactively voice the live estimate when numbers are real and we didn't
  // already say them in the answer above.
  const saidNumber = intent === 'cash' || intent === 'down';
  if (numbers.hasBoth && !saidNumber && capturedText.length > 0) {
    lines.push(
      `Right now that's about ${money(numbers.totalCashToClose)} to close — ${money(numbers.additionalFundsNeeded)} above your down payment.`,
    );
  }

  if (nextQuestion) {
    lines.push(nextQuestion.prompt);
  } else if (lines.length === 0) {
    lines.push(
      isFirstMessage
        ? `Tell me the home price and your down payment and I'll compute your cash to close.`
        : `Anything else you'd like to know, or should I put together your options?`,
    );
  }

  return lines;
}

/** Synonyms so short, natural answers ("self", "bank", "primary") are understood. */
const CHOICE_SYNONYMS: Partial<Record<FieldKey, [RegExp, string][]>> = {
  employmentType: [
    [/\bself\b|self.?employ/, 'self-employed'],
    [/\bw.?2\b/, 'w2'],
    [/\b1099\b/, '1099'],
    [/business|owner/, 'business-owner'],
    [/retire/, 'retired'],
    [/foreign/, 'foreign-national'],
    [/investor/, 'investor'],
  ],
  occupancy: [
    [/primary|main|live/, 'primary'],
    [/second|vacation|getaway/, 'second'],
    [/invest|rental|\brent\b/, 'investment'],
  ],
  incomeDocPath: [
    [/bank|statement/, 'bank-statements'],
    [/tax|full.?doc|w.?2/, 'full-doc'],
    [/p&l|p and l|profit/, 'p-and-l'],
    [/asset|deplet/, 'asset-depletion'],
    [/dscr/, 'dscr'],
    [/not sure|unsure|idk|dunno|don.t know/, 'unsure'],
  ],
  borrowerGoal: [
    [/lowest cash|least cash|minimi.*cash/, 'lowest-cash-to-close'],
    [/lowest payment|low(er|est)? payment|smallest payment|payment/, 'lowest-payment'],
    [/approval|approve|qualify/, 'easiest-approval'],
    [/long.?term|lifetime|overall/, 'best-long-term'],
    [/fast|quick|asap|speed/, 'fastest-close'],
    [/compare|all option|everything|options/, 'compare-all'],
  ],
};

/** Match a free-text answer to a choice field's value, including synonyms. */
export function matchChoiceValue(
  field: FieldKey,
  options: { value: string; label: string }[],
  text: string,
): string | null {
  const t = text.toLowerCase();
  const direct = options.find(
    (o) => t.includes(o.value.toLowerCase()) || t.includes(o.label.toLowerCase()),
  );
  if (direct) return direct.value;
  for (const [re, val] of CHOICE_SYNONYMS[field] ?? []) {
    if (re.test(t)) return val;
  }
  return null;
}

/** Human phrase for a captured field, e.g. "$400,000 down", "self-employed". */
export function humanCaptured(
  key: FieldKey,
  profile: ScenarioProfile,
  labelFor: (k: FieldKey, v: string) => string,
): string {
  const v = profile[key];
  if (v == null || v === '') return '';
  switch (key) {
    case 'purchasePrice':
      return `a ${money(Number(v))} purchase`;
    case 'downPayment':
      return `${money(Number(v))} down`;
    case 'reserves':
      return `${money(Number(v))} in reserves`;
    case 'fico':
      return `${v} FICO`;
    case 'state':
      return String(v);
    case 'zipOrCounty':
      return String(v);
    case 'occupancy':
    case 'employmentType':
    case 'incomeDocPath':
    case 'borrowerGoal':
      return labelFor(key, String(v)).toLowerCase();
    default:
      return '';
  }
}
