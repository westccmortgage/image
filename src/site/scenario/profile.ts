import { FIELD_DEFS } from './fields';
import type {
  DerivedScenario,
  FieldKey,
  ScenarioProfile,
} from './types';

/** Merge newly-parsed / answered facts onto an existing profile (non-empty wins). */
export function mergeProfile(
  base: ScenarioProfile,
  patch: Partial<ScenarioProfile>,
): ScenarioProfile {
  const next: ScenarioProfile = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === null || v === '') continue;
    (next as Record<string, unknown>)[k] = v;
  }
  // Keep down payment / percent consistent when we can.
  if (next.purchasePrice && next.downPaymentPercent && next.downPayment == null) {
    next.downPayment = Math.round((next.purchasePrice * next.downPaymentPercent) / 100);
  }
  // An established refinance intent is not downgraded to "purchase" by a later
  // message that merely mentions a home/house (belt-and-suspenders with the
  // verb-only purchase detection in the parser).
  if (base.loanPurpose === 'refinance' && patch.loanPurpose === 'purchase') {
    next.loanPurpose = 'refinance';
  }
  return next;
}

export function deriveScenario(p: ScenarioProfile): DerivedScenario {
  const d: DerivedScenario = {};
  if (p.purchasePrice && p.downPayment != null) {
    d.loanAmount = Math.max(0, p.purchasePrice - p.downPayment);
    d.ltv = p.purchasePrice > 0 ? (d.loanAmount / p.purchasePrice) * 100 : undefined;
    d.downPaymentPercent = p.purchasePrice > 0 ? (p.downPayment / p.purchasePrice) * 100 : undefined;
  }
  return d;
}

const NON_CONTACT = FIELD_DEFS.filter((f) => f.importance !== 'contact');
const REQUIRED = NON_CONTACT.filter((f) => f.importance === 'required');
const HELPFUL = NON_CONTACT.filter((f) => f.importance === 'helpful');

export function hasValue(p: ScenarioProfile, key: FieldKey): boolean {
  const v = p[key];
  return v !== undefined && v !== null && v !== '';
}

/** A refinance has no down payment — it's never asked for or "missing". */
function notApplicable(p: ScenarioProfile, key: FieldKey): boolean {
  return p.loanPurpose === 'refinance' && key === 'downPayment';
}

/** Required non-contact fields still missing (in ask-priority order). */
export function missingRequired(p: ScenarioProfile): FieldKey[] {
  return REQUIRED.filter((f) => !hasValue(p, f.key) && !notApplicable(p, f.key))
    .sort((a, b) => a.priority - b.priority)
    .map((f) => f.key);
}

/** Helpful (optional) fields still missing. */
export function missingHelpful(p: ScenarioProfile): FieldKey[] {
  return HELPFUL.filter((f) => !hasValue(p, f.key) && !notApplicable(p, f.key))
    .sort((a, b) => a.priority - b.priority)
    .map((f) => f.key);
}

/** Blocking required fields still missing — gate the initial loan-path options. */
export function missingBlocking(p: ScenarioProfile): FieldKey[] {
  return NON_CONTACT.filter((f) => f.blocking && !hasValue(p, f.key) && !notApplicable(p, f.key))
    .sort((a, b) => a.priority - b.priority)
    .map((f) => f.key);
}

/** Completion percent over required + helpful (contact + N/A fields excluded). */
export function completionPercent(p: ScenarioProfile): number {
  const applicable = NON_CONTACT.filter((f) => !notApplicable(p, f.key));
  const total = applicable.length;
  if (total === 0) return 0;
  const done = applicable.filter((f) => hasValue(p, f.key)).length;
  return Math.round((done / total) * 100);
}

/** Has the borrower provided enough value for us to show initial options? */
export function isReadyForOptions(p: ScenarioProfile): boolean {
  return missingBlocking(p).length === 0;
}

/** True once at least a purchase price OR down payment is known (value provided). */
export function hasProvidedValue(p: ScenarioProfile): boolean {
  return hasValue(p, 'purchasePrice') || hasValue(p, 'downPayment');
}

/**
 * True only when BOTH price and down payment are known — the gate for showing
 * the borrower their real cash-to-close numbers. Until then the hero shows an
 * "Example only" placeholder rather than default demo figures as if they were
 * the user's result.
 */
export function hasFullNumbers(p: ScenarioProfile): boolean {
  return hasValue(p, 'purchasePrice') && hasValue(p, 'downPayment');
}

/**
 * Enough core information to offer a planning strategy summary — price + down,
 * a location, occupancy, and an income/employment signal. Not every optional
 * field is required (FICO, reserves, exact goal remain optional).
 */
export function isStrategyReady(p: ScenarioProfile): boolean {
  const hasNumbers = hasValue(p, 'purchasePrice') && hasValue(p, 'downPayment');
  const hasLocation = hasValue(p, 'state') || hasValue(p, 'stateCode') || hasValue(p, 'zipOrCounty');
  const hasOccupancy = hasValue(p, 'occupancy');
  const hasIncome = hasValue(p, 'employmentType') || hasValue(p, 'incomeDocPath');
  return hasNumbers && hasLocation && hasOccupancy && hasIncome;
}

export const CONTACT_FIELDS: FieldKey[] = ['name', 'phone', 'email'];

export function missingContact(p: ScenarioProfile): FieldKey[] {
  return CONTACT_FIELDS.filter((k) => !hasValue(p, k));
}

// ---------------------------------------------------------------------------
// Session / state hygiene.
//
// The active borrower scenario is intentionally NEVER persisted — it lives only
// in React state during the visit. On a new visit the page starts clean, and
// any legacy advisor keys left in storage are cleared so a stale scenario can
// never hydrate into the page. (The theme preference is a UI setting, not
// scenario data, and is kept separately.)
// ---------------------------------------------------------------------------

/** Storage keys that older builds may have written — cleared on load & reset. */
export const ADVISOR_STORAGE_KEYS = [
  'ww-advisor-profile',
  'ww-scenario',
  'ww-advisor-state',
  'ww-messages',
  'scenario-profile',
  'advisor-scenario',
];

/** The initial profile is ALWAYS empty — we never hydrate a saved scenario. */
export function readInitialProfile(): ScenarioProfile {
  return {};
}

/** Remove any advisor scenario keys from both storages. Safe in SSR/no-DOM. */
export function clearAdvisorState(): void {
  const wipe = (store: Storage | undefined) => {
    if (!store) return;
    for (const k of ADVISOR_STORAGE_KEYS) {
      try {
        store.removeItem(k);
      } catch {
        /* ignore */
      }
    }
  };
  if (typeof window === 'undefined') return;
  try {
    wipe(window.localStorage);
  } catch {
    /* ignore */
  }
  try {
    wipe(window.sessionStorage);
  } catch {
    /* ignore */
  }
}
