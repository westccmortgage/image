import { describe, it, expect } from 'vitest';
import { nextBestQuestion } from '../questionEngine';
import { missingRequired } from '../profile';
import { parseScenario } from '../parseScenario';

// The advisor must secure the fundamentals in order — price, then down payment
// (a dollar amount OR a percent) — before preference/closing-cost questions, and
// must never re-ask a down payment the borrower already gave as a percent.

describe('question order: fundamentals before preferences', () => {
  it('with a price but no down payment, the next question IS the down payment', () => {
    expect(nextBestQuestion({ purchasePrice: 900_000 })?.field).toBe('downPayment');
  });

  it('a stated percent satisfies the down-payment question (no re-ask)', () => {
    const p = parseScenario('putting 20% down'); // percent, price not given yet
    expect(p.downPaymentPercent).toBe(20);
    expect(missingRequired(p)).not.toContain('downPayment');
    expect(nextBestQuestion(p)?.field).toBe('purchasePrice');
  });

  it('the down payment is asked before preference questions (goal)', () => {
    const order = missingRequired({ purchasePrice: 1_000_000 });
    expect(order.indexOf('downPayment')).toBeLessThan(order.indexOf('borrowerGoal'));
  });

  it('an empty profile asks the purchase price first', () => {
    expect(nextBestQuestion({})?.field).toBe('purchasePrice');
  });

  it('once price + down are known, neither is re-asked', () => {
    const miss = missingRequired({ purchasePrice: 1_000_000, downPayment: 200_000 });
    expect(miss).not.toContain('purchasePrice');
    expect(miss).not.toContain('downPayment');
  });
});
