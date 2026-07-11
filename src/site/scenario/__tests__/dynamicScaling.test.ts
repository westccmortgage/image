import { describe, it, expect } from 'vitest';
import { calculateCashToClose, profileToEngineInput } from '../tools';
import type { ScenarioProfile } from '../types';

// TEST 8 — Dynamic financial scaling. Fees, prepaids, and cash to close must
// scale with the loan; nothing may stay fixed at the demo example's values.
// TEST 9 support — a bigger scenario must move materially, proving no cached
// default fees leak through.

function calc(p: ScenarioProfile) {
  return calculateCashToClose(profileToEngineInput(p));
}

const scenarioA: ScenarioProfile = { purchasePrice: 2_000_000, downPayment: 400_000 };
const scenarioB: ScenarioProfile = { purchasePrice: 4_000_000, downPayment: 800_000 };

describe('TEST 8 — deterministic fees/prepaids/cash-to-close scale with the loan', () => {
  const a = calc(scenarioA);
  const b = calc(scenarioB);

  it('Scenario A: $2M / $400k → $1.6M loan at 80% LTV', () => {
    expect(a.loanAmount).toBe(1_600_000);
    expect(a.ltv).toBeCloseTo(80, 5);
  });
  it('Scenario B: $4M / $800k → $3.2M loan at 80% LTV', () => {
    expect(b.loanAmount).toBe(3_200_000);
    expect(b.ltv).toBeCloseTo(80, 5);
  });

  it('lender fees scale up (B > A)', () => {
    expect(b.lenderFeesTotal).toBeGreaterThan(a.lenderFeesTotal);
  });
  it('prepaids + escrow scale up (B > A)', () => {
    expect(b.prepaidsAndEscrowTotal).toBeGreaterThan(a.prepaidsAndEscrowTotal);
  });
  it('government fees scale up or hold, never fabricated smaller', () => {
    expect(b.governmentFeesTotal).toBeGreaterThanOrEqual(a.governmentFeesTotal);
  });
  it('total cash to close changes materially (B is much larger than A)', () => {
    expect(b.totalCashToClose).toBeGreaterThan(a.totalCashToClose);
    // Down payment alone doubles ($400k → $800k), so cash to close must move by
    // clearly more than the down-payment delta is not required, but it must be
    // materially higher — at least 1.6x here.
    expect(b.totalCashToClose).toBeGreaterThan(a.totalCashToClose * 1.6);
  });
  it('no fee category is frozen at the other scenario’s value', () => {
    expect(b.lenderFeesTotal).not.toBe(a.lenderFeesTotal);
    expect(b.prepaidsAndEscrowTotal).not.toBe(a.prepaidsAndEscrowTotal);
    expect(b.totalCashToClose).not.toBe(a.totalCashToClose);
  });
});

describe('TEST 9 — the demo example never leaks as a computed result', () => {
  it('a fresh scenario does not reproduce the $196,381 example cash-to-close', () => {
    // The verified "Example only" figure must not appear for a different loan.
    expect(Math.round(calc(scenarioA).totalCashToClose)).not.toBe(196381);
    expect(Math.round(calc(scenarioB).totalCashToClose)).not.toBe(196381);
  });
});
