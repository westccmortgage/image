// ---------------------------------------------------------------------------
// Progressive scenario-intake types.
//
// A conversational layer auto-fills a short, structured Borrower Strategy
// Profile from natural language. This is NOT a mortgage application — no SSN,
// DOB, bank/account numbers, or document uploads are ever collected.
// ---------------------------------------------------------------------------

export type Occupancy = 'primary' | 'second' | 'investment';

export type EmploymentType =
  | 'w2'
  | 'self-employed'
  | '1099'
  | 'business-owner'
  | 'retired'
  | 'investor'
  | 'foreign-national';

export type IncomeDocPath =
  | 'full-doc'
  | 'bank-statements'
  | 'p-and-l'
  | 'asset-depletion'
  | 'dscr'
  | 'unsure';

export type BorrowerGoal =
  | 'lowest-payment'
  | 'lowest-cash-to-close'
  | 'easiest-approval'
  | 'best-long-term'
  | 'fastest-close'
  | 'compare-all';

export type LoanPurpose = 'purchase' | 'refinance';

/** Supported advisor languages. */
export type Language = 'en' | 'ru' | 'es' | 'zh';

/** How confident we are about the property's county (drives loan-limit area). */
export type CountyConfidence = 'confirmed' | 'uncertain';

/** The structured Loan Strategy Profile filled by the conversation. */
export interface ScenarioProfile {
  // Contact (requested only after value is provided)
  name?: string;
  phone?: string;
  email?: string;
  preferredContactTime?: string;
  preferredLanguage?: Language;
  // Scenario
  purchasePrice?: number;
  downPayment?: number;
  /** Down payment expressed as a percent, when stated that way. */
  downPaymentPercent?: number;
  loanPurpose?: LoanPurpose;
  zipOrCounty?: string;
  city?: string;
  state?: string;
  /** Two-letter USPS code for the state when known (e.g. "CA"). */
  stateCode?: string;
  /** County only when reliably resolved/confirmed — never guessed from a city. */
  county?: string;
  countyConfidence?: CountyConfidence;
  occupancy?: Occupancy;
  employmentType?: EmploymentType;
  incomeDocPath?: IncomeDocPath;
  fico?: number;
  reserves?: number;
  borrowerGoal?: BorrowerGoal;
}

/** Values derived from the profile (not asked). */
export interface DerivedScenario {
  loanAmount?: number;
  ltv?: number;
  downPaymentPercent?: number;
}

export type FieldKey = keyof ScenarioProfile;

export type FieldImportance = 'required' | 'helpful' | 'contact';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  key: FieldKey;
  label: string;
  importance: FieldImportance;
  /** Blocks initial loan-path options until answered. */
  blocking?: boolean;
  kind: 'number' | 'text' | 'money' | 'choice';
  question: string;
  options?: FieldOption[];
  /** Lower = asked earlier. */
  priority: number;
}

export interface Question {
  field: FieldKey;
  prompt: string;
  kind: FieldDef['kind'];
  options?: FieldOption[];
}

export interface LoanPath {
  id: string;
  name: string;
  why: string;
  /** Safe qualitative label — never an invented rate. */
  tag: string;
}

/** The loan-program categories the strategy advisor compares. */
export type ProgramCategory =
  | 'Conforming QM'
  | 'High-Balance QM'
  | 'Jumbo QM'
  | 'Non-QM Bank Statement'
  | 'Non-QM P&L'
  | 'Non-QM Asset Depletion'
  | 'DSCR Investment'
  | 'FHA'
  | 'VA'
  | 'Bridge / Private';

/** Cautious fit labels — never "approved" / "qualified" / "guaranteed". */
export type FitLabel =
  | 'Possible strong fit'
  | 'Possible fit'
  | 'May fit — needs review'
  | 'Likely not a fit';

/**
 * Honesty about where a program path's data comes from. Until a verified live
 * pricing/program source is connected, everything is a configured planning
 * assumption that a licensed broker must verify — never "today's best rate".
 */
export type ProgramDataStatus =
  | 'verified_current'
  | 'configured_assumption'
  | 'broker_review_required'
  | 'missing_pricing_data';

/**
 * A compared loan path. Numbers come only from deterministic calculators; every
 * qualitative field uses cautious, non-committal language.
 */
export interface LoanProgramMatch {
  id: string;
  name: string;
  category: ProgramCategory;
  fit: FitLabel;
  /** Rough ordering score (higher = better fit) — for deterministic sorting. */
  score: number;
  why: string;
  missing: string[];
  /** Estimated monthly P&I at an assumed rate, or null when not computable. */
  paymentEstimate: number | null;
  /** Estimated cash to close (planning), or null when not computable. */
  cashToCloseEstimate: number | null;
  documentation: string[];
  risks: string[];
  /** Where this path's guidance comes from (see ProgramDataStatus). */
  dataStatus: ProgramDataStatus;
  /** Effective/last-verified date when verified current data exists, else null. */
  effectiveDate: string | null;
}

export interface CashToCloseEstimate {
  downPayment: number;
  estimatedClosingCosts: number;
  estimatedCashToClose: number;
  note: string;
}
