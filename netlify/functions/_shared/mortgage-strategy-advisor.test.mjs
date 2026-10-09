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

const estimate = {
  hasBoth: true,
  calculationReady: true,
  downPayment: 100000,
  totalCashToClose: 115000,
  additionalFundsNeeded: 15000,
  totalClosingCosts: 15000,
  lenderFeesTotal: 10000,
  thirdPartyFeesTotal: 3000,
  governmentFeesTotal: 500,
  prepaidsAndEscrowTotal: 1500,
  sellerCredit: 0,
  lenderCredit: 0,
  monthlyPI: 2398.2,
  monthlyHousing: 3148.2,
  ltv: 80,
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
      cashToCloseEstimate: { ...estimate, monthlyPI: 2729, monthlyHousing: 3500 },
    });
    expect(validation.ok).toBe(false);
    expect(validation.error).toBe('client_calculation_mismatch');
  });

  it('recomputes user-stated closing costs instead of trusting client cash totals', () => {
    const validation = validateEnginePayload({
      profile: { ...profile, closingCosts: 15000 },
      cashToCloseEstimate: { ...estimate, totalCashToClose: 120000, additionalFundsNeeded: 20000 },
    });
    expect(validation.ok).toBe(false);
    expect(validation.recomputed.totalCashToClose).toBe(115000);
  });

  it('blocks provider prose that introduces a conflicting dollar figure', () => {
    const payload = {
      profile,
      cashToCloseEstimate: estimate,
    };
    expect(responseUsesOnlyAllowedNumbers('P&I is $2,398 and total is $3,148.', payload)).toBe(true);
    expect(responseUsesOnlyAllowedNumbers('P&I is $2,729.', payload)).toBe(false);
    expect(responseUsesOnlyAllowedNumbers('P&I is 2,729.', payload)).toBe(false);
    expect(responseUsesOnlyAllowedNumbers('P&I is $115,000 and total cash to close is $2,398.', payload)).toBe(false);
    expect(responseUsesOnlyAllowedNumbers('For a $500,000 home with 20% down.', payload)).toBe(true);
  });

  it('validates refinance monthly math without requiring a down-payment field', () => {
    const refiProfile = {
      loanPurpose: 'refinance', purchasePrice: 900000, currentLoanBalance: 500000,
      cashOutAmount: 100000, interestRate: 6, termYears: 30,
      propertyTaxAnnual: 6000, hazardInsuranceAnnual: 1800, hoaMonthly: 100, pmiMonthly: 0,
    };
    const refi = recomputeMonthlyFromProfile(refiProfile);
    const validation = validateEnginePayload({
      profile: refiProfile,
      cashToCloseEstimate: {
        ...estimate,
        downPayment: 0,
        monthlyPI: refi.monthlyPI,
        monthlyHousing: refi.monthlyHousing,
        ltv: refi.ltv,
        totalCashToClose: 15000,
      },
    });
    expect(validation.ok).toBe(true);
  });
});
