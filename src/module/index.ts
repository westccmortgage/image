// ---------------------------------------------------------------------------
// Public entry point for the AI Cash-to-Close Advisor module.
//
// A host site (e.g. West Coast Capital Mortgage) imports from here:
//
//   import { CashToCloseAdvisor, CashToCloseWidget } from '<path>/module';
//
// Full page:      <CashToCloseAdvisor config={myBrand} />
// Embedded band:  <CashToCloseWidget  config={myBrand} advisorHref="/tools/cash-to-close" />
// ---------------------------------------------------------------------------

// Components
export { CashToCloseAdvisor } from './components/CashToCloseAdvisor';
export type { CashToCloseAdvisorProps } from './components/CashToCloseAdvisor';
export { CashToCloseWidget } from './components/CashToCloseWidget';
export type { CashToCloseWidgetProps } from './components/CashToCloseWidget';

// Calculation engine (deterministic — safe to reuse headless / server-side)
export {
  calculateCashToClose,
  buildDownPaymentScenarios,
  recalcForClosingDays,
  calcLoanAmount,
  calcLtv,
  calcDownPaymentPercent,
  calcMonthlyPI,
  calcPrepaidInterest,
  assessRisk,
} from './calc/cashToCloseCalculations';

export {
  formatMoney,
  formatMoneyExact,
  formatPercent,
  roundCents,
} from './calc/format';

// AI strategy summary generator (local mock; swap for a live LLM later)
export { generateAiSummary, generateAiTakeaway } from './ai/aiCashToCloseSummary';
export type {
  AiSummary,
  AiSummarySection,
  AiTakeaway,
} from './ai/aiCashToCloseSummary';

// Brand configuration
export {
  defaultBrandConfig,
  resolveBrandConfig,
  COMPLIANCE_DISCLAIMER,
} from './brand';
export type { BrandConfig } from './brand';

// Fixture
export { defaultScenario } from './fixtures/defaultScenario';

// Types
export type {
  CashToCloseInput,
  CashToCloseResult,
  DownPaymentScenario,
  LineItem,
  LoanType,
  Occupancy,
  RiskAssessment,
  RiskTier,
} from './types';
