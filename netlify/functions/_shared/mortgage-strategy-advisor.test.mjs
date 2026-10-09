import { describe, expect, it } from 'vitest';
import {
  recomputeMonthlyFromProfile,
  responseUsesOnlyAllowedNumbers,
  validateEnginePayload,
} from '../mortgage-strategy-advisor.mjs';

const profile = {
  purchasePrice: 500000,
  downPayment: 100000,
  interestRate: 6,
  termYears: 30,
  propertyTaxAnnual: 6000,
  hazardInsuranceAnnual: 1800,
  hoaMonthly: 100,
  pmiMonthly: 0,
};

describe('advisor server numeric boundary', () => {
  it('recomputes the audited monthly figures independently', () => {
    expect(recomputeMonthlyFromProfile(profile)).toMatchObject({
      loanAmount: 400000,
      monthlyPI: 2398.2,
      monthlyHousing: 3148.2,
      ltv: 80,
    });
  });

  it('rejects conflicting client totals', () => {
    const validation = validateEnginePayload({
      profile,
      cashToCloseEstimate: { hasBoth: true, monthlyPI: 2729, monthlyHousing: 3500, ltv: 80 },
    });
    expect(validation.ok).toBe(false);
    expect(validation.error).toBe('client_calculation_mismatch');
  });

  it('recomputes user-stated closing costs instead of trusting client cash totals', () => {
    const validation = validateEnginePayload({
      profile: { ...profile, closingCosts: 15000 },
      cashToCloseEstimate: {
        hasBoth: true,
        monthlyPI: 2398.2,
        monthlyHousing: 3148.2,
        ltv: 80,
        totalCashToClose: 120000,
        additionalFundsNeeded: 20000,
      },
    });
    expect(validation.ok).toBe(false);
    expect(validation.recomputed.totalCashToClose).toBe(115000);
  });

  it('blocks provider prose that introduces a conflicting dollar figure', () => {
    const payload = {
      profile,
      cashToCloseEstimate: {
        hasBoth: true,
        downPayment: 100000,
        totalCashToClose: 115000,
        additionalFundsNeeded: 15000,
        ltv: 80,
        monthlyPI: 2398.2,
        monthlyHousing: 3148.2,
      },
    };
    expect(responseUsesOnlyAllowedNumbers('P&I is $2,398 and total is $3,148.', payload)).toBe(true);
    expect(responseUsesOnlyAllowedNumbers('P&I is $2,729.', payload)).toBe(false);
  });
});
