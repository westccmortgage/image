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

  it('does not calculate a borrower payment without an explicit note rate', () => {
    const e = evaluateScenario({ purchasePrice: 500_000, downPayment: 100_000 });
    expect(e.result).toBeNull();
    expect(e.missing).toContain('interest rate');
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
});
