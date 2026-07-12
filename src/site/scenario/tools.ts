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

// ---------------------------------------------------------------------------
// Planning-assumption constants. These are DISCLOSED estimates that SCALE with
// the loan/price so fees never stay frozen at the demo example's fixed dollars
// (see Section 8 of the product spec / the dynamic-scaling tests). They are not
// lender quotes; the advisor must present them as configured planning
// assumptions requiring broker verification. The verified "Example only"
// scenario lives in defaultScenario and is intentionally NOT computed here.
// ---------------------------------------------------------------------------
export const PLANNING = {
  originationRateOfLoan: 0.01, // origination ≈ 1.00% of loan amount
  underwritingFee: 1_495, // flat, realistic regardless of loan size
  processingFee: 995,
  adminFee: 895,
  // Discount points are OPTIONAL and never assumed — omitted from the estimate.
  titleEscrowRateOfLoan: 0.0034, // title/escrow/endorsements ≈ 0.34% of loan
  minTitleEscrow: 1_500,
  flatThirdParty: [
    { label: 'Appraisal', amount: 850 },
    { label: 'Tax service / flood certification', amount: 250 },
    { label: 'Notary / signing fee', amount: 200 },
    { label: 'Recording service / courier', amount: 150 },
    { label: 'Credit report', amount: 73.2 },
  ],
  governmentFlat: [
    { label: 'Recording fees', amount: 125 },
    { label: 'Government / transfer fee', amount: 75 },
  ],
  annualTaxRateOfPrice: 0.0125, // ~1.25% / yr — disclosed planning assumption
  annualInsuranceRateOfPrice: 0.0025, // ~0.25% / yr — disclosed planning assumption
  taxImpoundMonths: 7,
  insuranceReserveMonths: 2,
} as const;

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

  // Scale fees / taxes / insurance / prepaids from the ACTUAL loan so nothing
  // stays frozen at the example's fixed values. Only do this when the borrower
  // has supplied real price + down payment (otherwise the demo values stand for
  // the "Example only" display).
  if (p.purchasePrice && p.downPayment != null) {
    const price = p.purchasePrice;
    const loanAmount = Math.max(0, price - p.downPayment);

    // An all-cash purchase (no loan) has no lender fees at all.
    input.lenderFees = loanAmount <= 0 ? [] : [
      {
        label: 'Origination fee',
        amount: roundCents(loanAmount * PLANNING.originationRateOfLoan),
        note: '≈ 1.00% of loan amount (planning estimate — not a quote)',
      },
      { label: 'Underwriting fee', amount: PLANNING.underwritingFee },
      { label: 'Processing fee', amount: PLANNING.processingFee },
      { label: 'Admin / application fee', amount: PLANNING.adminFee },
    ];

    const titleEscrow = Math.max(
      PLANNING.minTitleEscrow,
      roundCents(loanAmount * PLANNING.titleEscrowRateOfLoan),
    );
    input.thirdPartyFees = [
      { label: 'Title / escrow / settlement (est.)', amount: titleEscrow, note: 'Estimated; varies by provider' },
      ...PLANNING.flatThirdParty.map((f) => ({ ...f })),
    ];
    input.governmentFees = PLANNING.governmentFlat.map((f) => ({ ...f }));

    const taxMonthly = roundCents((price * PLANNING.annualTaxRateOfPrice) / 12);
    const insMonthly = roundCents((price * PLANNING.annualInsuranceRateOfPrice) / 12);
    input.propertyTaxMonthly = taxMonthly;
    input.hazardInsuranceMonthly = insMonthly;
    input.otherPrepaids = [
      {
        label: "Homeowner's insurance premium (12 mo)",
        amount: roundCents(insMonthly * 12),
        note: 'First-year hazard premium paid at closing (estimated)',
      },
      {
        label: 'Property tax reserves (impounds)',
        amount: roundCents(taxMonthly * PLANNING.taxImpoundMonths),
        note: `Initial escrow deposit (~${PLANNING.taxImpoundMonths} mo, estimated)`,
      },
      {
        label: "Homeowner's insurance reserves (2 mo)",
        amount: roundCents(insMonthly * PLANNING.insuranceReserveMonths),
        note: 'Initial escrow deposit for insurance (estimated)',
      },
    ];
  }
  return input;
}

/** Round to cents (avoids floating-point dust in displayed line items). */
function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
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
