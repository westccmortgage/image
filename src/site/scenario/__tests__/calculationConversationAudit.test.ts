import { describe, expect, it } from 'vitest';
import { evaluateScenario } from '../tools';
import { parseScenario } from '../parseScenario';
import { resolveScenarioTurn } from '../turnIntent';
import { matchLoanPrograms } from '../loanPrograms';
import { runAdvisorTurn } from '../voiceTurn';
import type { ScenarioProfile } from '../types';

const exactProfile: ScenarioProfile = {
  loanPurpose: 'purchase',
  purchasePrice: 500_000,
  downPayment: 100_000,
  interestRate: 6,
  termYears: 30,
  propertyTaxAnnual: 6_000,
  hazardInsuranceAnnual: 1_800,
  hoaMonthly: 100,
  pmiMonthly: 0,
};

describe('audited canonical calculation failures', () => {
  it('uses the stated rate, term, annual taxes/insurance, HOA and no PMI', () => {
    const e = evaluateScenario(exactProfile);
    expect(e.missing).toEqual([]);
    expect(e.result?.monthlyPI).toBe(2_398.2);
    expect(e.result?.monthlyTaxes).toBe(500);
    expect(e.result?.monthlyInsurance).toBe(150);
    expect(e.result?.monthlyHoa).toBe(100);
    expect(e.result?.monthlyPmi).toBe(0);
    expect(e.result?.monthlyHousingPayment).toBe(3_148.2);
  });

  it('reproduces the live failure end-to-end through parse, turn, and calculator', () => {
    const turn = runAdvisorTurn({
      text: 'Purchase $500,000, down $100,000, 30 years at 6%, property tax $6,000 per year, insurance $1,800 per year, HOA $100 monthly, no PMI.',
      isFirst: true,
    });
    expect(turn.profile).toMatchObject({ interestRate: 6, termYears: 30, purchasePrice: 500_000, downPayment: 100_000 });
    expect(turn.numbers.monthlyPI).toBe(2_398.2);
    expect(turn.numbers.monthlyHousing).toBe(3_148.2);
  });

  it('normalizes monthly and annual units with provenance', () => {
    const p = parseScenario('taxes $500 per month, insurance $1,800 per year, HOA $100 monthly, no PMI, rate 6%');
    expect(p.propertyTaxAnnual).toBe(6_000);
    expect(p.hazardInsuranceAnnual).toBe(1_800);
    expect(p.hoaMonthly).toBe(100);
    expect(p.numericFieldMeta?.propertyTaxAnnual?.unit).toBe('usd_per_year');
    expect(p.numericFieldMeta?.propertyTaxAnnual?.source).toContain('converted from monthly');
    expect(p.numericFieldMeta?.hoaMonthly?.unit).toBe('usd_per_month');
  });

  it('supports "a month" but leaves ambiguous tax/insurance units unset', () => {
    const monthly = parseScenario('taxes $500 a month and insurance $150 a month');
    expect(monthly.propertyTaxAnnual).toBe(6_000);
    expect(monthly.hazardInsuranceAnnual).toBe(1_800);
    const ambiguous = parseScenario('taxes $500 and insurance $150');
    expect(ambiguous.propertyTaxAnnual).toBeUndefined();
    expect(ambiguous.hazardInsuranceAnnual).toBeUndefined();
  });

  it('protects reserves and reports the exact $5,000 shortfall', () => {
    const e = evaluateScenario({
      ...exactProfile,
      cashAvailable: 120_000,
      closingCosts: 15_000,
      protectedReserves: 10_000,
    });
    expect(e.result?.totalCashToClose).toBe(115_000);
    expect(e.affordability).toEqual({
      cashAvailable: 120_000,
      protectedReserves: 10_000,
      usableForClosing: 110_000,
      requiredToClose: 115_000,
      surplusOrShortfall: -5_000,
      affordable: false,
    });
  });

  it('parses the audited cash constraint without treating all cash as down', () => {
    const p = parseScenario('Purchase $500,000 at 6%, $120,000 available cash, $100,000 down, $15,000 closing costs, and keep $10,000 as a protected reserve.');
    expect(p.cashAvailable).toBe(120_000);
    expect(p.downPayment).toBe(100_000);
    expect(p.closingCosts).toBe(15_000);
    expect(p.protectedReserves).toBe(10_000);
    expect(evaluateScenario(p).affordability?.surplusOrShortfall).toBe(-5_000);
  });

  it('keeps adjacent label-first cash buckets separate', () => {
    const p = parseScenario('Purchase $500,000, down payment $100,000, available cash $120,000, closing costs $15,000, protect $10,000 as reserves, 30 years at 6%.');
    expect(p.cashAvailable).toBe(120_000);
    expect(p.closingCosts).toBe(15_000);
    expect(p.protectedReserves).toBe(10_000);
    expect(evaluateScenario(p).affordability?.surplusOrShortfall).toBe(-5_000);
  });

  it('does not calculate a borrower payment without an explicit note rate', () => {
    const e = evaluateScenario({ purchasePrice: 500_000, downPayment: 100_000 });
    expect(e.result).toBeNull();
    expect(e.missing).toContain('interest rate');
  });

  it.each([
    [{ ...exactProfile, downPayment: 600_000 }, 'down payment cannot exceed purchase price'],
    [{ ...exactProfile, termYears: 0 }, 'term must be greater than zero'],
    [{ ...exactProfile, interestRate: 40 }, 'interest rate must be greater than 0%'],
  ])('rejects malformed numeric scenarios', (profile, error) => {
    const e = evaluateScenario(profile as ScenarioProfile);
    expect(e.result).toBeNull();
    expect(e.errors.join(' ')).toContain(error);
  });

  it('rejects an underwater cash-out refinance instead of clamping the balance', () => {
    const e = evaluateScenario({
      loanPurpose: 'refinance', purchasePrice: 500_000, currentLoanBalance: 600_000,
      interestRate: 6,
    });
    expect(e.result).toBeNull();
    expect(e.errors).toContain('refinance balance plus cash out cannot exceed property value');
  });
});

describe('intent-aware non-destructive state', () => {
  it('a why-question containing $400,000 and $2,729 does not rewrite price/down', () => {
    const base = exactProfile;
    const turn = resolveScenarioTurn(base, 'Why is a $400,000 loan at 6% not $2,729?');
    expect(turn.intent).toBe('question');
    expect(turn.profile).toBe(base);
    expect(turn.profile.purchasePrice).toBe(500_000);
    expect(turn.profile.downPayment).toBe(100_000);
  });

  it('only changing the rate preserves every other scenario fact', () => {
    const turn = resolveScenarioTurn(exactProfile, 'Change the rate to 5.5%');
    expect(turn.intent).toBe('correction');
    expect(turn.profile.interestRate).toBe(5.5);
    expect(turn.profile.purchasePrice).toBe(500_000);
    expect(turn.profile.downPayment).toBe(100_000);
    expect(turn.profile.propertyTaxAnnual).toBe(6_000);
  });

  it('a hypothetical alternative is calculated without modifying the base', () => {
    const turn = resolveScenarioTurn(exactProfile, 'What if the rate were 5%?');
    expect(turn.intent).toBe('hypothetical');
    expect(turn.profile).toBe(exactProfile);
    expect(turn.profile.interestRate).toBe(6);
    expect(turn.comparisonProfile?.interestRate).toBe(5);
    expect(evaluateScenario(turn.comparisonProfile!).result?.monthlyPI).toBeLessThan(2_398.2);
  });

  it('keeps Russian occupancy and self-employment facts', () => {
    const p = parseScenario('Покупаю жильё 500,000, 20% первоначальный взнос, это основное жильё, я самозанятый, ставка 6%.');
    expect(p.purchasePrice).toBe(500_000);
    expect(p.downPayment).toBe(100_000);
    expect(p.occupancy).toBe('primary');
    expect(p.employmentType).toBe('self-employed');
    expect(p.interestRate).toBe(6);
  });

  it('parses Russian comma-decimal rates and percentages exactly', () => {
    const p = parseScenario('Цена 1,2 млн, первоначальный взнос 20,5%, ставка 6,5%.');
    expect(p.purchasePrice).toBe(1_200_000);
    expect(p.downPaymentPercent).toBe(20.5);
    expect(p.downPayment).toBe(246_000);
    expect(p.interestRate).toBe(6.5);
  });

  it('preserves Russian term and annual tax/insurance units', () => {
    const p = parseScenario('Срок 30 лет, налог $6,000 в год, страховка $1,800 в год.');
    expect(p.termYears).toBe(30);
    expect(p.propertyTaxAnnual).toBe(6_000);
    expect(p.hazardInsuranceAnnual).toBe(1_800);
  });

  it('does not turn a rate into a down-payment percent when dollar down is stated', () => {
    const p = parseScenario('Purchase $500,000, down $100,000 at 6%');
    expect(p.downPayment).toBe(100_000);
    expect(p.downPaymentPercent).toBeUndefined();
  });

  it('accepts a natural zero-down correction', () => {
    const turn = resolveScenarioTurn(exactProfile, 'Change down payment to 0');
    expect(turn.profile.downPayment).toBe(0);
  });

  it('separates current and proposed refinance rates without inventing rent', () => {
    const p = parseScenario('Current rate 7%, refinance at 6%, current balance $500,000, current payment $4,000.');
    expect(p.currentInterestRate).toBe(7);
    expect(p.interestRate).toBe(6);
    expect(p.monthlyRent).toBeUndefined();
    expect(p.currentMonthlyPayment).toBe(4_000);
  });
});

describe('purpose-specific comparisons without invented pricing', () => {
  it('ranks refinance paths by the actual refinance goal', () => {
    const matches = matchLoanPrograms({
      loanPurpose: 'refinance',
      purchasePrice: 900_000,
      currentLoanBalance: 500_000,
      currentInterestRate: 7,
      cashOutAmount: 100_000,
      interestRate: 6.5,
    });
    expect(matches[0].name).toBe('Cash-Out Refinance');
    expect(matches[0].paymentEstimate).toBeNull();
    expect(matches[0].cashToCloseEstimate).toBeNull();
    expect(matches[0].dataStatus).not.toBe('verified_current');
  });

  it('ranks DSCR for an investment scenario but leaves pricing unavailable', () => {
    const matches = matchLoanPrograms({
      loanPurpose: 'purchase',
      purchasePrice: 700_000,
      downPayment: 175_000,
      occupancy: 'investment',
      incomeDocPath: 'dscr',
      monthlyRent: 4_500,
    });
    expect(matches[0].name).toBe('DSCR Investment');
    expect(matches.every((m) => m.paymentEstimate == null)).toBe(true);
  });

  it('calculates refinance payment without counting equity as cash to close', () => {
    const e = evaluateScenario({
      loanPurpose: 'refinance',
      purchasePrice: 900_000,
      currentLoanBalance: 500_000,
      cashOutAmount: 100_000,
      interestRate: 6,
      closingCosts: 12_000,
    });
    expect(e.result?.loanAmount).toBe(600_000);
    expect(e.result?.downPayment).toBe(0);
    expect(e.result?.totalCashToClose).toBe(12_000);
  });

  it('produces genuine refinance savings/break-even and investment coverage comparisons', () => {
    const refi = evaluateScenario({
      loanPurpose: 'refinance', purchasePrice: 900_000, currentLoanBalance: 500_000,
      currentMonthlyPayment: 4_500, interestRate: 6, closingCosts: 12_000,
    });
    expect(refi.comparison?.kind).toBe('refinance');
    expect(refi.comparison?.monthlySavings).toBeGreaterThan(0);
    expect(refi.comparison?.breakEvenMonths).toBeGreaterThan(0);
    const investment = evaluateScenario({
      ...exactProfile, occupancy: 'investment', monthlyRent: 4_000,
    });
    expect(investment.comparison?.kind).toBe('investment');
    expect(investment.comparison?.rentCoverageRatio).toBeCloseTo(4_000 / 3_148.2, 3);
  });
});
