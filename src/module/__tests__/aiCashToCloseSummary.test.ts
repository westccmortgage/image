import { describe, it, expect } from 'vitest';
import { calculateCashToClose } from '../calc/cashToCloseCalculations';
import {
  generateAiSummary,
  generateAiTakeaway,
} from '../ai/aiCashToCloseSummary';
import { defaultScenario } from '../fixtures/defaultScenario';

describe('AI strategy summary (local mock generator)', () => {
  const result = calculateCashToClose(defaultScenario);
  const summary = generateAiSummary(result, defaultScenario);

  it('leads with the core message', () => {
    expect(summary.headline).toMatch(/not your total cash needed to close/i);
  });

  it('covers every required topic', () => {
    const ids = summary.sections.map((s) => s.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'down-vs-cash',
        'additional-funds',
        'lender-fees',
        'third-party-fees',
        'prepaids',
        'prepaid-interest',
        'credits',
        'risk',
      ]),
    );
  });

  it('is dynamic — reflects the actual computed cash-to-close figure', () => {
    expect(summary.keyTakeaway).toContain('$196,381');
  });

  it('surfaces Non-QM high-LTV and PMI risk callouts for the default scenario', () => {
    const joined = summary.riskCallouts.join(' ');
    expect(joined).toMatch(/Non-QM/i);
    expect(joined).toMatch(/PMI|MI/);
  });

  it('produces a different narrative for a low-LTV scenario', () => {
    const strong = calculateCashToClose({
      ...defaultScenario,
      loanType: 'Conventional',
      downPayment: defaultScenario.purchasePrice * 0.25,
    });
    const strongSummary = generateAiSummary(strong, {
      ...defaultScenario,
      loanType: 'Conventional',
    });
    expect(strongSummary.riskCallouts.length).toBe(0);
    // Different cash-to-close number than the default scenario.
    expect(strongSummary.keyTakeaway).not.toEqual(summary.keyTakeaway);
  });

  it('mentions seller and lender credit opportunities', () => {
    const opp = summary.opportunities.join(' ').toLowerCase();
    expect(opp).toContain('seller');
    expect(opp).toContain('lender');
  });
});

describe('AI takeaway (compact, ≤3 bullets)', () => {
  const result = calculateCashToClose(defaultScenario);

  it('returns at most 3 bullets', () => {
    const { bullets } = generateAiTakeaway(result, defaultScenario);
    expect(bullets.length).toBeGreaterThan(0);
    expect(bullets.length).toBeLessThanOrEqual(3);
  });

  it('leads with the additional-funds figure and stays short', () => {
    const { bullets } = generateAiTakeaway(result, defaultScenario);
    expect(bullets[0]).toContain('$47,381');
    // each bullet is a short sentence (well under 60 words)
    for (const b of bullets) {
      expect(b.split(/\s+/).length).toBeLessThanOrEqual(30);
    }
  });

  it('calls out Non-QM high-LTV risk for the default scenario', () => {
    const { bullets } = generateAiTakeaway(result, defaultScenario);
    expect(bullets.join(' ')).toMatch(/Non-QM/i);
  });

  it('is dynamic — a strong (25% down, conventional) scenario reads differently', () => {
    const strong = calculateCashToClose({
      ...defaultScenario,
      loanType: 'Conventional',
      downPayment: defaultScenario.purchasePrice * 0.25,
    });
    const { bullets } = generateAiTakeaway(strong, {
      ...defaultScenario,
      loanType: 'Conventional',
    });
    expect(bullets.join(' ')).toMatch(/avoid PMI\/MI/i);
    expect(bullets.join(' ')).not.toMatch(/Non-QM/i);
  });
});
