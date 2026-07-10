import { FIELD_BY_KEY, labelForValue } from './fields';
import { formatMoney } from '../../module';
import { completionPercent, deriveScenario, missingRequired } from './profile';
import { nextBestQuestion } from './questionEngine';
import type { FieldKey, ScenarioProfile } from './types';

// The compact Loan Strategy Profile — a small, bounded view for the desktop side
// card and the mobile sticky bar / drawer. It is deliberately NOT a long form:
// at most 5 known facts and at most 4 critical missing items.

export interface CompactFact {
  key: FieldKey;
  label: string;
  value: string;
}

export interface CompactProfile {
  pct: number;
  facts: CompactFact[];
  nextQuestion: string | null;
  criticalMissing: string[];
}

const MAX_FACTS = 5;
const MAX_MISSING = 4;

function displayValue(key: FieldKey, p: ScenarioProfile): string {
  const v = p[key];
  if (v == null || v === '') return '';
  if (key === 'purchasePrice' || key === 'downPayment' || key === 'reserves') return formatMoney(Number(v));
  const def = FIELD_BY_KEY[key];
  if (def?.kind === 'choice') return labelForValue(key, String(v));
  return String(v);
}

/** Build the bounded compact profile used by the side card & mobile drawer. */
export function buildCompactProfile(p: ScenarioProfile): CompactProfile {
  const facts: CompactFact[] = (Object.keys(FIELD_BY_KEY) as FieldKey[])
    .filter((k) => FIELD_BY_KEY[k].importance !== 'contact')
    .map((k) => ({ key: k, label: FIELD_BY_KEY[k].label, value: displayValue(k, p) }))
    .filter((f) => f.value);

  const d = deriveScenario(p);
  if (d.loanAmount != null && facts.length < MAX_FACTS) {
    facts.push({ key: 'purchasePrice', label: 'Loan amount', value: formatMoney(d.loanAmount) });
  }

  const nq = nextBestQuestion(p);
  return {
    pct: completionPercent(p),
    facts: facts.slice(0, MAX_FACTS),
    nextQuestion: nq?.prompt ?? null,
    criticalMissing: missingRequired(p).slice(0, MAX_MISSING).map((k) => FIELD_BY_KEY[k].label),
  };
}
