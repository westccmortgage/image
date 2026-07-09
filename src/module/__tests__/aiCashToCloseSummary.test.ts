import { describe, it, expect } from 'vitest';
import { calculateCashToClose } from '../calc/cashToCloseCalculations';
import { generateAiSummary } from '../ai/aiCashToCloseSummary';
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
