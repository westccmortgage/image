// ---------------------------------------------------------------------------
// Shared domain types for the AI Cash-to-Close Advisor module.
// ---------------------------------------------------------------------------

export type LoanType =
  | 'Conventional'
  | 'FHA'
  | 'VA'
  | 'Jumbo'
  | 'Non-QM';

export type Occupancy =
  | 'Primary Residence'
  | 'Second Home'
  | 'Investment Property';

/** A single named dollar line item (fee, prepaid, credit, etc). */
export interface LineItem {
  label: string;
  amount: number;
  /** Optional short explanation surfaced in tooltips / the AI summary. */
  note?: string;
}

/**
 * Raw, user-editable inputs. Everything the deterministic engine needs.
 * Fee / prepaid categories are explicit line-item arrays so the engine never
 * has to invent numbers — it only sums and derives.
 */
export interface CashToCloseInput {
  purchasePrice: number;
  /** Down payment as a dollar amount (source of truth). */
  downPayment: number;

  interestRate: number; // annual note rate, e.g. 7.25 (percent)
  apr?: number; // annual percentage rate, e.g. 7.473 (percent)
  termYears: number;

  loanType: LoanType;
  occupancy: Occupancy;
  state?: string;
  zip?: string;
  productName?: string; // e.g. "30 Year Non-QM Fixed"

  propertyTaxMonthly: number;
  hazardInsuranceMonthly: number;

  /** Days of per-diem interest collected at closing (closing-date sensitivity). */
  prepaidInterestDays: number;

  lenderFees: LineItem[];
  thirdPartyFees: LineItem[];
  governmentFees: LineItem[];
  /**
   * Prepaids & initial escrow reserves EXCLUDING prepaid interest.
   * (Prepaid interest is derived from `prepaidInterestDays`.)
   * e.g. homeowner's insurance premium, tax reserves, insurance reserves.
   */
  otherPrepaids: LineItem[];

  sellerCredit?: number;
  lenderCredit?: number;
}

export type RiskTier =
  | 'strong'
  | 'moderate'
  | 'high'
  | 'veryHigh'
  | 'highRiskPricing';

export interface RiskAssessment {
  tier: RiskTier;
  /** Human label per the module spec. */
  label:
    | 'Strong'
    | 'Moderate'
    | 'High LTV'
    | 'Very High LTV'
    | 'High Risk Pricing Zone';
  /** True when down payment is below 20% (LTV above 80%). */
  belowTwentyDown: boolean;
  /** True when mortgage insurance / PMI / MI is likely in play. */
  pmiRisk: boolean;
  /** True when this is a Non-QM loan above 85% LTV. */
  nonQmHighLtv: boolean;
  /** Strong warning messages to surface prominently. */
  warnings: string[];
}

export interface CashToCloseResult {
  // Core figures
  purchasePrice: number;
  downPayment: number;
  downPaymentPercent: number;
  loanAmount: number;
  ltv: number;
  interestRate: number;
  apr?: number;
  termYears: number;

  // Monthly
  monthlyPI: number;
  monthlyTaxes: number;
  monthlyInsurance: number;
  monthlyHousingPayment: number;

  // Closing cost buckets
  lenderFeesTotal: number;
  thirdPartyFeesTotal: number;
  governmentFeesTotal: number;
  prepaidInterest: number;
  otherPrepaidsTotal: number;
  prepaidsAndEscrowTotal: number;

  // Credits
  sellerCredit: number;
  lenderCredit: number;

  // Totals
  totalClosingCosts: number;
  totalCashToClose: number;
  additionalFundsNeeded: number;

  // Breakdowns (for display / AI summary)
  lenderFees: LineItem[];
  thirdPartyFees: LineItem[];
  governmentFees: LineItem[];
  prepaidsBreakdown: LineItem[];

  risk: RiskAssessment;
}

export interface DownPaymentScenario {
  label: string; // "10% down"
  downPaymentPercent: number;
  downPayment: number;
  loanAmount: number;
  ltv: number;
  risk: RiskAssessment;
  /** Safe, non-committal labels — never invented lender rates. */
  pmiLabel: string; // "Usually avoids PMI/MI" | "PMI / MI likely"
  rateImpactLabel: string; // "Higher rate risk" | "Better pricing possible" | ...
  profileLabel: string; // "Stronger profile" | ...
  estimatedMonthlyPayment: number;
  estimatedCashToClose: number;
}
