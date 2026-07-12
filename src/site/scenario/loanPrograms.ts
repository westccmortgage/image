import { calcMonthlyPI } from '../../module';
import { deriveScenario } from './profile';
import { programDataStatusFor, programEffectiveDate } from './programData';
import type { FitLabel, LoanProgramMatch, ProgramCategory, ScenarioProfile } from './types';

// ---------------------------------------------------------------------------
// Loan-program comparison. The advisor's job is to compare POSSIBLE paths, not
// just total cash to close. Every number here comes from deterministic math;
// every qualitative field uses cautious language ("possible", "estimated",
// "may", "subject to lender guidelines"). We never say approved / qualified /
// guaranteed.
// ---------------------------------------------------------------------------

// 2025 conforming reference limits (one-unit). Used only to bucket loan size —
// not to promise eligibility.
const CONFORMING_BASELINE = 806_500;
const HIGH_BALANCE_CEILING = 1_209_750;

// A single, clearly-labeled planning rate so payment estimates are comparable.
// This is an ASSUMPTION for illustration — not a quoted or invented lender rate.
const ASSUMED_RATE = 7.25;
const PLANNING_CLOSING_RATE = 0.03; // fees + prepaids as a share of loan (planning)

function fitFromScore(score: number): FitLabel {
  if (score >= 4) return 'Possible strong fit';
  if (score >= 2) return 'Possible fit';
  if (score >= 0) return 'May fit — needs review';
  return 'Likely not a fit';
}

interface Draft {
  id: string;
  name: string;
  category: ProgramCategory;
  score: number;
  why: string;
  missing: string[];
  documentation: string[];
  risks: string[];
}

export function matchLoanPrograms(p: ScenarioProfile): LoanProgramMatch[] {
  const { loanAmount, ltv } = deriveScenario(p);
  const belowTwenty = ltv != null && ltv > 80;
  const emp = p.employmentType;
  const doc = p.incomeDocPath;
  const occ = p.occupancy;
  const selfEmployed = emp === 'self-employed' || emp === 'business-owner' || emp === '1099';
  const sizeKnown = loanAmount != null;
  const countyUnconfirmed = p.countyConfidence !== 'confirmed';

  const drafts: Draft[] = [];
  const add = (d: Draft) => drafts.push(d);

  // --- Conforming QM ---
  {
    let score = 1;
    const missing: string[] = [];
    if (occ === 'primary' || occ === 'second') score += 1;
    if (doc === 'full-doc' || emp === 'w2') score += 2;
    if (sizeKnown && loanAmount! <= CONFORMING_BASELINE) score += 1;
    if (sizeKnown && loanAmount! > CONFORMING_BASELINE) score -= 3;
    if (!doc && emp !== 'w2') missing.push('income documentation path');
    if (!occ) missing.push('occupancy');
    add({
      id: 'conforming-qm', name: 'Conforming QM', category: 'Conforming QM', score, missing,
      why: 'Standard full-doc financing at or below the conforming loan limit — typically the strongest pricing when it fits.',
      documentation: ['Tax returns / W-2s', 'Recent paystubs', 'Asset statements'],
      risks: belowTwenty
        ? ['Below 20% down may require PMI/MI', 'Subject to conforming loan limits and lender guidelines']
        : ['Subject to conforming loan limits and lender guidelines'],
    });
  }

  // --- High-Balance QM ---
  {
    let score = 0;
    const missing: string[] = [];
    if (sizeKnown && loanAmount! > CONFORMING_BASELINE && loanAmount! <= HIGH_BALANCE_CEILING) score += 3;
    else if (sizeKnown) score -= 2;
    if (doc === 'full-doc' || emp === 'w2') score += 1;
    if (countyUnconfirmed) missing.push('confirmed county (loan-limit area)');
    add({
      id: 'high-balance-qm', name: 'High-Balance QM', category: 'High-Balance QM', score, missing,
      why: 'For high-cost counties where the loan sits above the baseline but under the high-balance ceiling. Availability depends on the confirmed county.',
      documentation: ['Tax returns / W-2s', 'Asset statements', 'Confirmed property county'],
      risks: ['Only available in designated high-cost counties', 'Subject to lender guidelines'],
    });
  }

  // --- Jumbo QM ---
  {
    let score = 0;
    const missing: string[] = [];
    if (sizeKnown && loanAmount! > HIGH_BALANCE_CEILING) score += 3;
    else if (sizeKnown) score -= 2;
    if (doc === 'full-doc' || emp === 'w2') score += 2;
    if (!p.fico) missing.push('estimated FICO');
    if (!p.reserves) missing.push('reserves after closing');
    add({
      id: 'jumbo-qm', name: 'Jumbo QM', category: 'Jumbo QM', score, missing,
      why: 'Full-doc financing above the high-balance ceiling. Usually wants stronger credit and reserves.',
      documentation: ['Tax returns / W-2s', 'Asset statements', 'Reserve documentation'],
      risks: ['Typically higher credit & reserve expectations', 'Subject to lender guidelines'],
    });
  }

  // --- Non-QM Bank Statement ---
  {
    let score = 0;
    const missing: string[] = [];
    if (selfEmployed) score += 3;
    if (doc === 'bank-statements') score += 2;
    else if (doc === 'unsure') score += 1;
    else if (doc === 'full-doc') score -= 2;
    if (!emp) missing.push('employment type');
    add({
      id: 'nonqm-bank-statement', name: 'Non-QM Bank Statement', category: 'Non-QM Bank Statement', score, missing,
      why: 'Documents income from 12–24 months of bank deposits — a common path for self-employed borrowers who show lower taxable income.',
      documentation: ['12–24 months bank statements', 'Business license / CPA letter'],
      risks: ['Pricing/rate typically higher than QM', 'Reserve requirements may apply', 'Subject to lender guidelines'],
    });
  }

  // --- Non-QM P&L ---
  {
    let score = -1;
    const missing: string[] = [];
    if (selfEmployed) score += 2;
    if (doc === 'p-and-l') score += 3;
    if (!emp) missing.push('employment type');
    add({
      id: 'nonqm-pl', name: 'Non-QM P&L', category: 'Non-QM P&L', score, missing,
      why: 'Qualifies from a CPA-prepared profit-and-loss statement — an alternative for self-employed borrowers.',
      documentation: ['CPA-prepared P&L', 'Business license'],
      risks: ['Pricing/rate typically higher than QM', 'Subject to lender guidelines'],
    });
  }

  // --- Non-QM Asset Depletion ---
  {
    let score = -1;
    const missing: string[] = [];
    if (emp === 'retired' || doc === 'asset-depletion') score += 3;
    if ((p.reserves ?? 0) > 0) score += 1;
    if (!p.reserves) missing.push('liquid assets / reserves');
    add({
      id: 'nonqm-asset-depletion', name: 'Non-QM Asset Depletion', category: 'Non-QM Asset Depletion', score, missing,
      why: 'Uses liquid assets instead of monthly income to qualify — useful for retired or asset-rich borrowers.',
      documentation: ['Asset / brokerage statements', 'Proof of ownership'],
      risks: ['Qualifying assets must be documented', 'Subject to lender guidelines'],
    });
  }

  // --- DSCR Investment ---
  {
    let score = -1;
    const missing: string[] = [];
    if (occ === 'investment' || doc === 'dscr') score += 4;
    if (occ !== 'investment' && !doc) missing.push('occupancy (investment?)');
    add({
      id: 'dscr', name: 'DSCR Investment', category: 'DSCR Investment', score, missing,
      why: 'Qualifies on the property’s rental cash flow rather than personal income — for investment properties.',
      documentation: ['Lease or market-rent schedule', 'Asset statements'],
      risks: ['Investment-property pricing', 'DSCR ratio must support the payment', 'Subject to lender guidelines'],
    });
  }

  // --- FHA ---
  {
    let score = -1;
    const missing: string[] = [];
    if (occ === 'primary') score += 2;
    if (belowTwenty) score += 1;
    if (sizeKnown && loanAmount! > HIGH_BALANCE_CEILING) score -= 3;
    if (!occ) missing.push('occupancy');
    add({
      id: 'fha', name: 'FHA', category: 'FHA', score, missing,
      why: 'Lower-down-payment government financing for primary residences within FHA limits.',
      documentation: ['Tax returns / W-2s', 'Paystubs', 'Asset statements'],
      risks: ['Upfront + monthly mortgage insurance (MIP)', 'Subject to FHA loan limits and guidelines'],
    });
  }

  // --- VA ---
  {
    const missing = ['VA eligibility (Certificate of Eligibility)'];
    add({
      id: 'va', name: 'VA', category: 'VA', score: occ === 'primary' ? 0 : -1, missing,
      why: 'No-down-payment financing for eligible veterans and service members — we’d need to confirm VA eligibility.',
      documentation: ['Certificate of Eligibility (COE)', 'Tax returns / W-2s'],
      risks: ['Requires VA eligibility', 'Funding fee may apply', 'Subject to VA guidelines'],
    });
  }

  // --- Bridge / Private ---
  {
    let score = -2;
    const missing: string[] = [];
    if (p.borrowerGoal === 'fastest-close') score += 3;
    add({
      id: 'bridge-private', name: 'Bridge / Private money', category: 'Bridge / Private', score, missing,
      why: 'Short-term financing when speed or a temporary gap matters — a placeholder path pending broker review.',
      documentation: ['Exit strategy', 'Asset statements'],
      risks: ['Short term and higher cost', 'Requires a clear exit plan', 'Subject to lender guidelines'],
    });
  }

  const paymentEstimate =
    loanAmount != null ? Math.round(calcMonthlyPI(loanAmount, ASSUMED_RATE, 30)) : null;
  const cashToCloseEstimate =
    loanAmount != null && p.downPayment != null
      ? Math.round(p.downPayment + loanAmount * PLANNING_CLOSING_RATE)
      : null;

  const effectiveDate = programEffectiveDate();
  return drafts
    .map<LoanProgramMatch>((d) => ({
      ...d,
      fit: fitFromScore(d.score),
      paymentEstimate,
      cashToCloseEstimate,
      // Honesty: with no verified pricing source connected, a path with open
      // inputs needs broker review; otherwise it is a configured assumption.
      dataStatus: programDataStatusFor(d.missing.length > 0),
      effectiveDate,
    }))
    .filter((m) => m.fit !== 'Likely not a fit')
    .sort((a, b) => b.score - a.score);
}

/** The single assumed planning rate, exposed so the UI can label estimates honestly. */
export const PLANNING_RATE = ASSUMED_RATE;
