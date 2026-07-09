import { describe, it, expect } from 'vitest';
import {
  calculateCashToClose,
  buildDownPaymentScenarios,
  calcLtv,
  calcMonthlyPI,
  calcPrepaidInterest,
  assessRisk,
} from '../calc/cashToCloseCalculations';
import { defaultScenario } from '../fixtures/defaultScenario';

describe('default scenario — matches documented figures', () => {
  const r = calculateCashToClose(defaultScenario);

  it('down payment', () => {
    expect(r.downPayment).toBe(149_000);
  });

  it('loan amount', () => {
    expect(r.loanAmount).toBe(1_250_000);
  });

  it('LTV ≈ 89.35%', () => {
    expect(r.ltv).toBeCloseTo(89.35, 2);
  });

  it('lender fees = $20,535.00', () => {
    expect(r.lenderFeesTotal).toBe(20_535);
  });

  it('third-party fees = $5,773.20', () => {
    expect(r.thirdPartyFeesTotal).toBe(5_773.2);
  });

  it('government fees = $200.00', () => {
    expect(r.governmentFeesTotal).toBe(200);
  });

  it('prepaids & initial escrow = $20,873.02', () => {
    expect(r.prepaidsAndEscrowTotal).toBe(20_873.02);
  });

  it('estimated total cash to close = $196,381.22', () => {
    expect(r.totalCashToClose).toBe(196_381.22);
  });

  it('additional funds above down payment = $47,381.22', () => {
    expect(r.additionalFundsNeeded).toBe(47_381.22);
  });

  it('monthly P&I ≈ $8,527.20', () => {
    expect(r.monthlyPI).toBeCloseTo(8_527.2, 1);
  });

  it('total monthly housing ≈ $10,315.18', () => {
    expect(r.monthlyHousingPayment).toBeCloseTo(10_315.18, 2);
  });

  it('prepaid interest (26 days) ≈ $6,455.48', () => {
    expect(r.prepaidInterest).toBeCloseTo(6_455.48, 2);
  });

  it('default scenario is Non-QM high-LTV → High Risk Pricing Zone', () => {
    expect(r.risk.label).toBe('High Risk Pricing Zone');
    expect(r.risk.nonQmHighLtv).toBe(true);
    expect(r.risk.belowTwentyDown).toBe(true);
    expect(r.risk.warnings.length).toBe(2);
  });
});

describe('pure helpers', () => {
  it('calcMonthlyPI matches amortization formula', () => {
    expect(calcMonthlyPI(1_250_000, 7.25, 30)).toBeCloseTo(8_527.2, 1);
  });

  it('calcMonthlyPI handles 0% rate', () => {
    expect(calcMonthlyPI(360_000, 0, 30)).toBeCloseTo(1_000, 6);
  });

  it('calcPrepaidInterest uses 365-day per-diem', () => {
    expect(calcPrepaidInterest(1_250_000, 7.25, 26)).toBeCloseTo(6_455.48, 2);
  });

  it('calcLtv', () => {
    expect(calcLtv(800_000, 1_000_000)).toBe(80);
  });
});

describe('risk tiers', () => {
  it('≤80% conventional → Strong, no PMI', () => {
    const risk = assessRisk(80, 20, 'Conventional');
    expect(risk.label).toBe('Strong');
    expect(risk.pmiRisk).toBe(false);
    expect(risk.warnings.length).toBe(0);
  });

  it('80.01–85% → Moderate', () => {
    expect(assessRisk(84, 16, 'Conventional').label).toBe('Moderate');
  });

  it('85.01–90% → High LTV', () => {
    expect(assessRisk(89, 11, 'Conventional').label).toBe('High LTV');
  });

  it('>90% → Very High LTV', () => {
    expect(assessRisk(95, 5, 'Conventional').label).toBe('Very High LTV');
  });

  it('Non-QM >85% → High Risk Pricing Zone (overrides)', () => {
    expect(assessRisk(89, 11, 'Non-QM').label).toBe('High Risk Pricing Zone');
  });

  it('below 20% down always warns', () => {
    expect(assessRisk(85, 15, 'Conventional').belowTwentyDown).toBe(true);
  });

  it('below-20% warning mentions all five required risks', () => {
    const [warning] = assessRisk(89.35, 10.65, 'Conventional').warnings;
    expect(warning).toMatch(/interest rate/i); // higher interest rate risk
    expect(warning).toMatch(/PMI|MI|mortgage insurance/i); // PMI / MI risk
    expect(warning).toMatch(/pricing adjustment/i); // lender pricing adjustments
    expect(warning).toMatch(/monthly payment/i); // higher monthly payment
    expect(warning).toMatch(/verified funds to close/i); // stronger need for verified funds
  });

  it('Non-QM above 85% LTV produces the strong Non-QM warning', () => {
    const risk = assessRisk(89.35, 10.65, 'Non-QM');
    const nonQm = risk.warnings.find((w) => w.startsWith('Non-QM'));
    expect(nonQm).toContain(
      'can materially affect rate, pricing, mortgage insurance, approval ' +
        'strength, monthly payment, and total cash to close',
    );
  });
});

describe('down payment scenarios', () => {
  const scenarios = buildDownPaymentScenarios(defaultScenario);

  it('produces 10 / 15 / 20 / 25% rows', () => {
    expect(scenarios.map((s) => s.downPaymentPercent)).toEqual([10, 15, 20, 25]);
  });

  it('20% down → 80% LTV, Strong, avoids PMI', () => {
    const s = scenarios.find((x) => x.downPaymentPercent === 20)!;
    expect(s.ltv).toBeCloseTo(80, 6);
    expect(s.risk.label).toBe('Strong');
    expect(s.pmiLabel).toBe('Usually avoids PMI/MI');
  });

  it('10% down Non-QM → High Risk Pricing Zone', () => {
    const s = scenarios.find((x) => x.downPaymentPercent === 10)!;
    expect(s.ltv).toBeCloseTo(90, 6);
    expect(s.risk.label).toBe('High Risk Pricing Zone');
  });

  it('down payment increases as percent increases; cash to close too', () => {
    for (let i = 1; i < scenarios.length; i++) {
      expect(scenarios[i].downPayment).toBeGreaterThan(scenarios[i - 1].downPayment);
      expect(scenarios[i].estimatedCashToClose).toBeGreaterThan(
        scenarios[i - 1].estimatedCashToClose,
      );
    }
  });
});

describe('closing-date sensitivity', () => {
  it('fewer prepaid-interest days lowers cash to close', () => {
    const full = calculateCashToClose(defaultScenario);
    const fewer = calculateCashToClose({
      ...defaultScenario,
      prepaidInterestDays: 5,
    });
    expect(fewer.totalCashToClose).toBeLessThan(full.totalCashToClose);
    expect(fewer.prepaidInterest).toBeLessThan(full.prepaidInterest);
  });

  it('zero days → zero prepaid interest', () => {
    const zero = calculateCashToClose({
      ...defaultScenario,
      prepaidInterestDays: 0,
    });
    expect(zero.prepaidInterest).toBe(0);
  });
});

describe('credits reduce cash to close', () => {
  it('seller + lender credits subtract dollar-for-dollar', () => {
    const withCredits = calculateCashToClose({
      ...defaultScenario,
      sellerCredit: 10_000,
      lenderCredit: 5_000,
    });
    const base = calculateCashToClose(defaultScenario);
    expect(withCredits.totalCashToClose).toBeCloseTo(
      base.totalCashToClose - 15_000,
      2,
    );
  });
});
