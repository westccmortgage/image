import { deriveScenario } from './profile';
import type {
  CashToCloseEstimate,
  LoanPath,
  ScenarioProfile,
} from './types';

// ---------------------------------------------------------------------------
// Loan-path matching + a lightweight cash-to-close planning estimate.
// Uses only safe qualitative labels — never invents lender rates. The precise,
// verified cash-to-close math lives in the main advisor engine; this is a
// quick planning estimate for the intake conversation.
// ---------------------------------------------------------------------------

/** Planning-only closing-cost assumption (fees + prepaids), as a share of loan. */
const CLOSING_COST_RATE = 0.03;

export function estimateCashToClose(p: ScenarioProfile): CashToCloseEstimate | null {
  const { loanAmount } = deriveScenario(p);
  if (p.downPayment == null || loanAmount == null) return null;
  const estimatedClosingCosts = Math.round(loanAmount * CLOSING_COST_RATE);
  return {
    downPayment: p.downPayment,
    estimatedClosingCosts,
    estimatedCashToClose: p.downPayment + estimatedClosingCosts,
    note: 'Planning estimate only — the full advisor computes exact fees, prepaids, and reserves.',
  };
}

/**
 * Match candidate loan paths from the profile. Deterministic rules, safe
 * labels. Returns most-relevant first; falls back to a general set.
 */
export function matchLoanPaths(p: ScenarioProfile): LoanPath[] {
  const paths: LoanPath[] = [];
  const { ltv } = deriveScenario(p);
  const investment = p.occupancy === 'investment';

  if (investment || p.incomeDocPath === 'dscr') {
    paths.push({
      id: 'dscr',
      name: 'DSCR (rental cash-flow)',
      why: 'Qualifies on property cash flow rather than personal income.',
      tag: 'No personal income docs',
    });
  }
  if (p.employmentType === 'self-employed' || p.employmentType === 'business-owner') {
    if (p.incomeDocPath === 'bank-statements' || p.incomeDocPath === 'unsure') {
      paths.push({
        id: 'bank-statement',
        name: 'Bank Statement (Non-QM)',
        why: 'Uses deposits to document income — common for self-employed borrowers.',
        tag: 'Self-employed friendly',
      });
    }
    if (p.incomeDocPath === 'p-and-l') {
      paths.push({
        id: 'pl',
        name: 'P&L / CPA-prepared',
        why: 'Documents income from a prepared profit-and-loss statement.',
        tag: 'Self-employed friendly',
      });
    }
  }
  if (p.employmentType === 'retired' || p.incomeDocPath === 'asset-depletion') {
    paths.push({
      id: 'asset-depletion',
      name: 'Asset Depletion / Asset-Based',
      why: 'Qualifies using liquid assets instead of monthly income.',
      tag: 'Asset-based',
    });
  }
  if (p.employmentType === 'foreign-national') {
    paths.push({
      id: 'foreign-national',
      name: 'Foreign National',
      why: 'Structured for borrowers without U.S. income or credit history.',
      tag: 'Non-resident',
    });
  }
  if (p.employmentType === 'w2' || p.incomeDocPath === 'full-doc') {
    const jumbo = (p.purchasePrice ?? 0) > 806_500;
    paths.push({
      id: jumbo ? 'full-doc-jumbo' : 'full-doc',
      name: jumbo ? 'Full-Doc Jumbo' : 'Full-Doc Conventional',
      why: 'Documents income with tax returns / W-2s — typically strongest pricing.',
      tag: ltv != null && ltv <= 80 ? 'Best pricing possible' : 'Standard documentation',
    });
  }

  if (paths.length === 0) {
    paths.push({
      id: 'review',
      name: 'Custom strategy review',
      why: "We'll match a program once a couple more details are known.",
      tag: 'Needs review',
    });
  }
  return paths.slice(0, 3);
}

/** Short strategy bullets for the snapshot (dynamic, safe). */
export function strategyBullets(p: ScenarioProfile): string[] {
  const { ltv } = deriveScenario(p);
  const bullets: string[] = [];
  const est = estimateCashToClose(p);
  if (est) {
    bullets.push(
      `Plan for roughly $${est.estimatedCashToClose.toLocaleString('en-US')} to close — down payment plus estimated costs.`,
    );
  }
  if (ltv != null && ltv > 80) {
    bullets.push('Below 20% down may bring PMI/MI or pricing adjustments — worth comparing options.');
  } else if (ltv != null) {
    bullets.push(`At about ${ltv.toFixed(0)}% LTV you're positioned for stronger pricing.`);
  }
  if (p.employmentType === 'self-employed' || p.employmentType === 'business-owner') {
    bullets.push('As a self-employed borrower, a bank-statement or P&L path can simplify approval.');
  }
  bullets.push('Ask about seller and lender credits before writing the offer.');
  return bullets.slice(0, 3);
}
