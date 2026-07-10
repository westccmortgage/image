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

/** Required non-contact fields still missing (in ask-priority order). */
export function missingRequired(p: ScenarioProfile): FieldKey[] {
  return REQUIRED.filter((f) => !hasValue(p, f.key))
    .sort((a, b) => a.priority - b.priority)
    .map((f) => f.key);
}

/** Helpful (optional) fields still missing. */
export function missingHelpful(p: ScenarioProfile): FieldKey[] {
  return HELPFUL.filter((f) => !hasValue(p, f.key))
    .sort((a, b) => a.priority - b.priority)
    .map((f) => f.key);
}

/** Blocking required fields still missing — gate the initial loan-path options. */
export function missingBlocking(p: ScenarioProfile): FieldKey[] {
  return NON_CONTACT.filter((f) => f.blocking && !hasValue(p, f.key))
    .sort((a, b) => a.priority - b.priority)
    .map((f) => f.key);
}

/** Completion percent over required + helpful (contact excluded). */
export function completionPercent(p: ScenarioProfile): number {
  const total = NON_CONTACT.length;
  const done = NON_CONTACT.filter((f) => hasValue(p, f.key)).length;
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

export const CONTACT_FIELDS: FieldKey[] = ['name', 'phone', 'email'];

export function missingContact(p: ScenarioProfile): FieldKey[] {
  return CONTACT_FIELDS.filter((k) => !hasValue(p, k));
}
