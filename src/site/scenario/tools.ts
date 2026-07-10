// ---------------------------------------------------------------------------
// Deterministic tool surface for the AI Mortgage Strategy Advisor.
//
// These are the ONLY places financial numbers come from. The AI layer may call
// on them and phrase their output, but must never invent or recompute a number
// itself. Each function is pure and testable.
// ---------------------------------------------------------------------------

import {
  buildDownPaymentScenarios,
  calcLtv,
  calcMonthlyPI,
  calculateCashToClose as engineCashToClose,
  defaultScenario,
} from '../../module';
import type { CashToCloseInput, CashToCloseResult, DownPaymentScenario } from '../../module';
import { parseScenario } from './parseScenario';
import { nextQuestions } from './questionEngine';
import { resolveLoanLimitArea } from './location';
import { matchLoanPrograms, PLANNING_RATE } from './loanPrograms';
import { deriveScenario } from './profile';
import type { LoanProgramMatch, ScenarioProfile } from './types';

// Named per the product spec so the AI route / callers use a stable vocabulary.
export const parseBorrowerScenario = parseScenario;
export const generateNextQuestions = nextQuestions;
export { resolveLoanLimitArea, matchLoanPrograms };

/** Loan-to-value from price + down payment. */
export function calculateLTV(purchasePrice: number, downPayment: number): number {
  const loanAmount = Math.max(0, purchasePrice - downPayment);
  return calcLtv(loanAmount, purchasePrice);
}

/**
 * Monthly principal & interest. The rate is an explicit input — callers pass the
 * planning rate; we never fabricate a lender rate.
 */
export function calculateMonthlyPayment(
  loanAmount: number,
  annualRatePercent: number = PLANNING_RATE,
  termYears = 30,
): number {
  return calcMonthlyPI(loanAmount, annualRatePercent, termYears);
}

/** Full cash-to-close via the verified engine. */
export function calculateCashToClose(input: CashToCloseInput): CashToCloseResult {
  return engineCashToClose(input);
}

/** Compare down-payment options (10/15/20/25%) for the given scenario input. */
export function compareDownPaymentOptions(input: CashToCloseInput): DownPaymentScenario[] {
  return buildDownPaymentScenarios(input);
}

/** Bridge a conversational profile into the engine's input shape. */
export function profileToEngineInput(p: ScenarioProfile): CashToCloseInput {
  const input: CashToCloseInput = { ...defaultScenario };
  if (p.purchasePrice) input.purchasePrice = p.purchasePrice;
  if (p.downPayment != null) input.downPayment = p.downPayment;
  if (p.stateCode || p.state) input.state = p.stateCode ?? p.state!;
  if (p.zipOrCounty && /^\d{5}$/.test(p.zipOrCounty)) input.zip = p.zipOrCounty;
  const doc = p.incomeDocPath;
  if (p.occupancy === 'investment' || doc === 'dscr') input.loanType = 'Non-QM';
  else if (doc === 'bank-statements' || doc === 'p-and-l' || doc === 'asset-depletion') input.loanType = 'Non-QM';
  else if (doc === 'full-doc') input.loanType = (input.purchasePrice ?? 0) > 806_500 ? 'Jumbo' : 'Conventional';
  if (p.occupancy === 'investment') input.occupancy = 'Investment Property';
  else if (p.occupancy === 'second') input.occupancy = 'Second Home';
  else input.occupancy = 'Primary Residence';
  return input;
}

export interface BrokerReviewSummary {
  headline: string;
  scenario: Record<string, string>;
  topPrograms: { name: string; fit: string }[];
  missing: string[];
  estimatedCashToClose: number | null;
  requiresHumanReview: boolean;
}

/**
 * Prepare a compact, broker-facing summary of the scenario. No sensitive data;
 * numbers only from the deterministic engine.
 */
export function prepareBrokerReviewSummary(
  p: ScenarioProfile,
  programs?: LoanProgramMatch[],
): BrokerReviewSummary {
  const d = deriveScenario(p);
  const matched = programs ?? matchLoanPrograms(p);
  const scenario: Record<string, string> = {};
  if (p.purchasePrice) scenario['Purchase price'] = `$${p.purchasePrice.toLocaleString('en-US')}`;
  if (p.downPayment != null) scenario['Down payment'] = `$${p.downPayment.toLocaleString('en-US')}`;
  if (d.loanAmount != null) scenario['Loan amount'] = `$${d.loanAmount.toLocaleString('en-US')}`;
  if (d.ltv != null) scenario['LTV'] = `${d.ltv.toFixed(1)}%`;
  if (p.loanPurpose) scenario['Purpose'] = p.loanPurpose;
  if (p.occupancy) scenario['Occupancy'] = p.occupancy;
  if (p.employmentType) scenario['Employment'] = p.employmentType;
  if (p.incomeDocPath) scenario['Income docs'] = p.incomeDocPath;
  if (p.city || p.state) scenario['Location'] = [p.city, p.state].filter(Boolean).join(', ');
  if (p.county) scenario['County'] = `${p.county}${p.countyConfidence === 'confirmed' ? '' : ' (needs confirmation)'}`;

  let estimatedCashToClose: number | null = null;
  if (p.purchasePrice && p.downPayment != null) {
    estimatedCashToClose = calculateCashToClose(profileToEngineInput(p)).totalCashToClose;
  }

  return {
    headline: 'Loan Strategy Profile — prepared for broker review',
    scenario,
    topPrograms: matched.slice(0, 3).map((m) => ({ name: m.name, fit: m.fit })),
    missing: Array.from(new Set(matched.flatMap((m) => m.missing))).slice(0, 6),
    estimatedCashToClose,
    requiresHumanReview: true,
  };
}
