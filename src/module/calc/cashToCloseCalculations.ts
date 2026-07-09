// ---------------------------------------------------------------------------
// Deterministic calculation engine.
//
// ALL mortgage math lives here. The AI layer never computes numbers — it only
// explains the numbers produced by these pure functions. Every function is
// side-effect free and fully testable.
// ---------------------------------------------------------------------------

import type {
  CashToCloseInput,
  CashToCloseResult,
  DownPaymentScenario,
  LineItem,
  LoanType,
  RiskAssessment,
} from '../types';
import { roundCents } from './format';

const sum = (items: LineItem[]): number =>
  items.reduce((total, item) => total + item.amount, 0);

/** Loan amount = purchase price − down payment. */
export function calcLoanAmount(purchasePrice: number, downPayment: number): number {
  return Math.max(0, purchasePrice - downPayment);
}

/** Loan-to-value ratio as a percentage. */
export function calcLtv(loanAmount: number, purchasePrice: number): number {
  if (purchasePrice <= 0) return 0;
  return (loanAmount / purchasePrice) * 100;
}

/** Down payment as a percentage of purchase price. */
export function calcDownPaymentPercent(
  downPayment: number,
  purchasePrice: number,
): number {
  if (purchasePrice <= 0) return 0;
  return (downPayment / purchasePrice) * 100;
}

/**
 * Fully-amortizing monthly principal & interest.
 * M = P · r(1+r)^n / ((1+r)^n − 1)
 */
export function calcMonthlyPI(
  loanAmount: number,
  annualRatePercent: number,
  termYears: number,
): number {
  const n = termYears * 12;
  if (n <= 0) return 0;
  const r = annualRatePercent / 100 / 12;
  if (r === 0) return loanAmount / n;
  const factor = Math.pow(1 + r, n);
  return (loanAmount * r * factor) / (factor - 1);
}

/**
 * Per-diem interest collected at closing.
 * daily interest = loan amount · annual rate / 365
 * prepaid interest = daily interest · days
 */
export function calcPrepaidInterest(
  loanAmount: number,
  annualRatePercent: number,
  days: number,
): number {
  const daily = (loanAmount * (annualRatePercent / 100)) / 365;
  return daily * Math.max(0, days);
}

/**
 * Risk assessment based on LTV and loan type. Matches the module spec:
 *   ≤ 80.00% .......... Strong
 *   80.01% – 85.00% ... Moderate
 *   85.01% – 90.00% ... High LTV
 *   > 90.00% .......... Very High LTV
 *   Non-QM & > 85% .... High Risk Pricing Zone (overrides the above)
 */
export function assessRisk(
  ltv: number,
  downPaymentPercent: number,
  loanType: LoanType,
): RiskAssessment {
  const belowTwentyDown = downPaymentPercent < 20;
  const pmiRisk = ltv > 80;
  const nonQmHighLtv = loanType === 'Non-QM' && ltv > 85;

  let tier: RiskAssessment['tier'];
  let label: RiskAssessment['label'];

  if (nonQmHighLtv) {
    tier = 'highRiskPricing';
    label = 'High Risk Pricing Zone';
  } else if (ltv <= 80) {
    tier = 'strong';
    label = 'Strong';
  } else if (ltv <= 85) {
    tier = 'moderate';
    label = 'Moderate';
  } else if (ltv <= 90) {
    tier = 'high';
    label = 'High LTV';
  } else {
    tier = 'veryHigh';
    label = 'Very High LTV';
  }

  const warnings: string[] = [];
  if (belowTwentyDown) {
    warnings.push(
      'Your down payment is below 20%. This may increase the interest rate, ' +
        'create mortgage insurance / PMI / MI requirements, increase lender ' +
        'pricing adjustments, and raise your monthly payment. It also creates a ' +
        'stronger need for verified, fully documented funds to close.',
    );
  }
  if (nonQmHighLtv) {
    warnings.push(
      'Non-QM loans with 10% down or high-LTV financing can materially affect ' +
        'rate, pricing, mortgage insurance, approval strength, monthly payment, ' +
        'and total cash to close.',
    );
  }

  return { tier, label, belowTwentyDown, pmiRisk, nonQmHighLtv, warnings };
}

/**
 * The master calculation. Takes raw inputs, returns every derived figure the
 * UI and AI summary need. Displayed totals are rounded to cents; intermediate
 * math keeps full precision.
 */
export function calculateCashToClose(input: CashToCloseInput): CashToCloseResult {
  const {
    purchasePrice,
    downPayment,
    interestRate,
    apr,
    termYears,
    loanType,
    propertyTaxMonthly,
    hazardInsuranceMonthly,
    prepaidInterestDays,
    lenderFees,
    thirdPartyFees,
    governmentFees,
    otherPrepaids,
    sellerCredit = 0,
    lenderCredit = 0,
  } = input;

  const loanAmount = calcLoanAmount(purchasePrice, downPayment);
  const ltv = calcLtv(loanAmount, purchasePrice);
  const downPaymentPercent = calcDownPaymentPercent(downPayment, purchasePrice);

  const monthlyPI = calcMonthlyPI(loanAmount, interestRate, termYears);
  const monthlyTaxes = propertyTaxMonthly;
  const monthlyInsurance = hazardInsuranceMonthly;
  const monthlyHousingPayment = monthlyPI + monthlyTaxes + monthlyInsurance;

  const lenderFeesTotal = sum(lenderFees);
  const thirdPartyFeesTotal = sum(thirdPartyFees);
  const governmentFeesTotal = sum(governmentFees);

  const prepaidInterest = calcPrepaidInterest(
    loanAmount,
    interestRate,
    prepaidInterestDays,
  );
  const otherPrepaidsTotal = sum(otherPrepaids);
  const prepaidsAndEscrowTotal = prepaidInterest + otherPrepaidsTotal;

  const prepaidsBreakdown: LineItem[] = [
    {
      label: `Prepaid interest (${prepaidInterestDays} days)`,
      amount: prepaidInterest,
      note: 'Per-diem interest from your closing date to the first of the following month.',
    },
    ...otherPrepaids,
  ];

  const totalClosingCosts =
    lenderFeesTotal +
    thirdPartyFeesTotal +
    governmentFeesTotal +
    prepaidsAndEscrowTotal;

  const totalCredits = sellerCredit + lenderCredit;
  const totalCashToClose = downPayment + totalClosingCosts - totalCredits;
  const additionalFundsNeeded = totalCashToClose - downPayment;

  const risk = assessRisk(ltv, downPaymentPercent, loanType);

  return {
    purchasePrice,
    downPayment: roundCents(downPayment),
    downPaymentPercent,
    loanAmount: roundCents(loanAmount),
    ltv,
    interestRate,
    apr,
    termYears,

    monthlyPI: roundCents(monthlyPI),
    monthlyTaxes: roundCents(monthlyTaxes),
    monthlyInsurance: roundCents(monthlyInsurance),
    monthlyHousingPayment: roundCents(monthlyHousingPayment),

    lenderFeesTotal: roundCents(lenderFeesTotal),
    thirdPartyFeesTotal: roundCents(thirdPartyFeesTotal),
    governmentFeesTotal: roundCents(governmentFeesTotal),
    prepaidInterest: roundCents(prepaidInterest),
    otherPrepaidsTotal: roundCents(otherPrepaidsTotal),
    prepaidsAndEscrowTotal: roundCents(prepaidsAndEscrowTotal),

    sellerCredit: roundCents(sellerCredit),
    lenderCredit: roundCents(lenderCredit),

    totalClosingCosts: roundCents(totalClosingCosts),
    totalCashToClose: roundCents(totalCashToClose),
    additionalFundsNeeded: roundCents(additionalFundsNeeded),

    lenderFees,
    thirdPartyFees,
    governmentFees,
    prepaidsBreakdown,

    risk,
  };
}

/**
 * Recompute cash-to-close when only the number of prepaid-interest days
 * changes (closing-date sensitivity slider). Returns a fresh full result.
 */
export function recalcForClosingDays(
  input: CashToCloseInput,
  prepaidInterestDays: number,
): CashToCloseResult {
  return calculateCashToClose({ ...input, prepaidInterestDays });
}

const PERCENT_STEPS = [10, 15, 20, 25];

/**
 * Build the down-payment comparison scenarios (10 / 15 / 20 / 25% down).
 *
 * We deliberately DO NOT invent lender rate changes — the same note rate is
 * carried across scenarios and rate/pricing differences are conveyed only with
 * safe qualitative labels. Escrow reserves and third-party/lender/government
 * fees are held constant (they are property- and program-driven, not
 * loan-size driven); prepaid interest is re-derived from the new loan amount.
 */
export function buildDownPaymentScenarios(
  input: CashToCloseInput,
): DownPaymentScenario[] {
  const fixedFees =
    sum(input.lenderFees) +
    sum(input.thirdPartyFees) +
    sum(input.governmentFees) +
    sum(input.otherPrepaids);

  return PERCENT_STEPS.map((percent) => {
    const downPayment = input.purchasePrice * (percent / 100);
    const loanAmount = calcLoanAmount(input.purchasePrice, downPayment);
    const ltv = calcLtv(loanAmount, input.purchasePrice);
    const risk = assessRisk(ltv, percent, input.loanType);

    const monthlyPI = calcMonthlyPI(
      loanAmount,
      input.interestRate,
      input.termYears,
    );
    const estimatedMonthlyPayment =
      monthlyPI + input.propertyTaxMonthly + input.hazardInsuranceMonthly;

    const prepaidInterest = calcPrepaidInterest(
      loanAmount,
      input.interestRate,
      input.prepaidInterestDays,
    );
    const estimatedCashToClose = downPayment + fixedFees + prepaidInterest;

    const pmiLabel = ltv > 80 ? 'PMI / MI likely' : 'Usually avoids PMI/MI';

    let rateImpactLabel: string;
    if (ltv > 90) rateImpactLabel = 'Higher rate risk';
    else if (ltv > 85) rateImpactLabel = 'Higher rate risk';
    else if (ltv > 80) rateImpactLabel = 'Slightly better pricing possible';
    else rateImpactLabel = 'Better pricing possible';

    let profileLabel: string;
    if (ltv <= 75) profileLabel = 'Strongest profile';
    else if (ltv <= 80) profileLabel = 'Stronger profile';
    else if (ltv <= 85) profileLabel = 'Solid profile';
    else profileLabel = 'Higher-leverage profile';

    return {
      label: `${percent}% down`,
      downPaymentPercent: percent,
      downPayment: roundCents(downPayment),
      loanAmount: roundCents(loanAmount),
      ltv,
      risk,
      pmiLabel,
      rateImpactLabel,
      profileLabel,
      estimatedMonthlyPayment: roundCents(estimatedMonthlyPayment),
      estimatedCashToClose: roundCents(estimatedCashToClose),
    };
  });
}
