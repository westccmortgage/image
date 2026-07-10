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

/** The structured Scenario Profile filled by the conversation. */
export interface ScenarioProfile {
  // Contact (requested only after value is provided)
  name?: string;
  phone?: string;
  email?: string;
  // Scenario
  purchasePrice?: number;
  downPayment?: number;
  /** Down payment expressed as a percent, when stated that way. */
  downPaymentPercent?: number;
  zipOrCounty?: string;
  state?: string;
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

export interface CashToCloseEstimate {
  downPayment: number;
  estimatedClosingCosts: number;
  estimatedCashToClose: number;
  note: string;
}
