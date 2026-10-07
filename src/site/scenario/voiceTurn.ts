// Wallet WCCM — one complete advisor turn, as a pure function.
//
// This is the SAME brain the chat UI (SmartAdvisor) runs, extracted so the phone
// agent (separate WWCCM-Voice repo) can reuse it over HTTP via the
// /api/voice-advisor-turn route — instead of re-implementing parsing, question
// order, or the calculators. The deterministic engine stays the only source of
// numbers; this function never calls an LLM. A caller that wants an LLM to
// re-phrase `reply` must ground it strictly in `numbers` (see the route).

import { parseScenario, isLikelyPercent, MIN_PLAUSIBLE_PRICE, MIN_PLAUSIBLE_DOWN } from './parseScenario';
import { mergeProfile, isReadyForOptions, hasFullNumbers } from './profile';
import { matchChoiceValue, humanCaptured, buildReply } from './converse';
import type { ReplyNumbers } from './converse';
import { nextBestQuestion } from './questionEngine';
import { profileToEngineInput, calculateCashToClose } from './tools';
import { matchLoanPrograms } from './loanPrograms';
import { fieldQuestion } from './fieldsI18n';
import { labelForValue, FIELD_BY_KEY } from './fields';
import { defaultScenario } from '../../module/fixtures/defaultScenario';
import type { FieldKey, Language, Question, ScenarioProfile } from './types';

export interface VoiceTurnInput {
  /** The caller's latest utterance (from speech-to-text). */
  text: string;
  /** Everything captured so far this call. */
  profile?: ScenarioProfile;
  /** Spoken language for the reply + question prompts. */
  language?: Language;
  /** The field the previous turn asked about (so a bare answer is understood). */
  pendingField?: FieldKey | null;
  /** True for the very first caller utterance of the call. */
  isFirst?: boolean;
}

export interface VoiceTurnResult {
  /** Updated profile after merging what this turn captured. */
  profile: ScenarioProfile;
  /** Deterministic reply, ready to speak (single string). */
  reply: string;
  /** Same reply split into lines (for a chat transcript). */
  replyLines: string[];
  /** Human phrases for what was captured this turn (e.g. "$400,000 down"). */
  captured: string[];
  /** Engine-computed numbers — the ONLY figures any phrasing may use. */
  numbers: ReplyNumbers & { loanType: string };
  /** The next question to ask, or null when nothing essential is missing. */
  nextQuestion: Question | null;
  /** Convenience: the field the NEXT turn should treat as pending. */
  pendingField: FieldKey | null;
  language: Language;
  /** True once we have enough to show loan-path options. */
  readyForOptions: boolean;
}

// Local copies of SmartAdvisor's coercion helpers (not exported from the barrel).
function numberFromText(text: string): { value: number; hadDollarSign: boolean } | null {
  const hadDollarSign = text.includes('$');
  const m = text.replace(/\$/g, '').match(/([\d,]+(?:\.\d+)?)\s*(k|mm|m|million|thousand)?/i);
  if (!m) return null;
  const base = parseFloat(m[1].replace(/,/g, ''));
  if (!Number.isFinite(base)) return null;
  const suf = m[2]?.toLowerCase();
  const mult = suf === 'k' || suf === 'thousand' ? 1_000 : suf ? 1_000_000 : 1;
  return { value: base * mult, hadDollarSign };
}

/** Coerce a bare answer to the field the previous turn asked about. */
function coerceAnswer(q: Question, text: string, profile: ScenarioProfile): Partial<ScenarioProfile> {
  if (q.kind === 'choice' && q.options) {
    const val = matchChoiceValue(q.field, q.options, text);
    return val ? ({ [q.field]: val } as Partial<ScenarioProfile>) : {};
  }
  if (q.kind === 'money' || q.kind === 'number') {
    const parsed = numberFromText(text);
    if (parsed == null) return {};
    const { value, hadDollarSign } = parsed;
    if (q.field === 'fico') return { fico: Math.round(value) };
    if (q.field === 'purchasePrice') {
      return value >= MIN_PLAUSIBLE_PRICE ? { purchasePrice: value } : {};
    }
    if (q.field === 'downPayment') {
      if (isLikelyPercent(value, hadDollarSign)) {
        const patch: Partial<ScenarioProfile> = { downPaymentPercent: value };
        if (profile.purchasePrice) patch.downPayment = Math.round((profile.purchasePrice * value) / 100);
        return patch;
      }
      return value >= MIN_PLAUSIBLE_DOWN ? { downPayment: value } : {};
    }
    return value > 0 ? ({ [q.field]: value } as Partial<ScenarioProfile>) : {};
  }
  // A text field: don't capture a counter-question as the answer.
  if (/[?]|how much|what|why|when|which|can you|do i/i.test(text)) return {};
  return { [q.field]: text.trim() } as Partial<ScenarioProfile>;
}

const CAPTURE_KEYS: FieldKey[] = [
  'purchasePrice', 'downPayment', 'state', 'zipOrCounty', 'county', 'occupancy',
  'employmentType', 'incomeDocPath', 'fico', 'reserves', 'borrowerGoal', 'loanPurpose',
];

function newlyCaptured(prev: ScenarioProfile, next: ScenarioProfile): FieldKey[] {
  const has = (v: unknown) => v !== undefined && v !== null && v !== '';
  return CAPTURE_KEYS.filter((k) => has(next[k]) && (!has(prev[k]) || prev[k] !== next[k]));
}

/**
 * Run one full advisor turn. Pure and synchronous: parse the utterance, merge it
 * (coercing a bare answer against the pending question), recompute every number
 * from the verified engine, and compose the next reply + question in order.
 */
export function runAdvisorTurn(inp: VoiceTurnInput): VoiceTurnResult {
  const language: Language = inp.language || 'en';
  const prev: ScenarioProfile = inp.profile ? { ...inp.profile } : {};
  const text = String(inp.text || '');

  // 1) Free-form extraction, then 2) coerce a bare answer to the pending field.
  let patch = parseScenario(text);
  const pendingKey = inp.pendingField ?? null;
  if (pendingKey && FIELD_BY_KEY[pendingKey]) {
    const def = FIELD_BY_KEY[pendingKey];
    const q: Question = { field: def.key, prompt: def.question, kind: def.kind, options: def.options };
    const coerced = coerceAnswer(q, text, prev);
    // The free-form parse wins when it already found this field; otherwise the
    // coerced bare answer fills it (e.g. "20%" to a down-payment question).
    patch = { ...coerced, ...patch };
  }

  const next = mergeProfile(prev, patch);
  const captured = newlyCaptured(prev, next);

  // 3) Numbers — only real when BOTH price and down payment are known.
  const isBoth = hasFullNumbers(next);
  const activeInput = isBoth ? profileToEngineInput(next) : defaultScenario;
  const c = calculateCashToClose(activeInput);
  const numbers: ReplyNumbers & { loanType: string } = {
    hasBoth: isBoth,
    downPayment: c.downPayment,
    totalCashToClose: c.totalCashToClose,
    additionalFundsNeeded: c.additionalFundsNeeded,
    ltv: c.ltv,
    monthlyPI: c.monthlyPI,
    monthlyHousing: c.monthlyHousingPayment,
    loanType: activeInput.loanType || 'Conventional',
  };

  // 4) Next question, in intake order, localized to the spoken language.
  const rawNq = nextBestQuestion(next);
  const nextQuestion: Question | null = rawNq
    ? { ...rawNq, prompt: fieldQuestion(language, rawNq.field, next.loanPurpose) }
    : null;

  // 5) Deterministic reply.
  const capturedText = captured.map((k) => humanCaptured(k, next, labelForValue)).filter(Boolean);
  const replyLines = buildReply({
    userText: text,
    capturedText,
    numbers,
    nextQuestion,
    isFirstMessage: !!inp.isFirst,
  });

  return {
    profile: next,
    reply: replyLines.join(' '),
    replyLines,
    captured: capturedText,
    numbers,
    nextQuestion,
    pendingField: nextQuestion ? nextQuestion.field : null,
    language,
    readyForOptions: isReadyForOptions(next),
  };
}

/** Top programs for a profile — a compact list for a broker hand-off / summary. */
export function topProgramSummaries(p: ScenarioProfile, max = 3): { name: string; fit: string }[] {
  return matchLoanPrograms(p).slice(0, max).map((m) => ({ name: m.name, fit: m.fit }));
}
