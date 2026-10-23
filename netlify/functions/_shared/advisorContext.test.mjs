import { describe, expect, it, vi, afterEach } from 'vitest';

import { advisorSystemPrompt, buildAdvisorContext, plainText } from './advisorContext.mjs';

// Regression: the advisor told a refinance borrower "the figures I have here
// are for a purchase with $149,000 down and an 89.3% LTV". Those are the demo
// scenario's numbers ($1,399,000 · $149,000 · Non-QM). They must never reach
// the model unless they are the borrower's own.

const DEMO = {
  hasBoth: false,
  downPayment: 149_000,
  totalCashToClose: 196_381,
  additionalFundsNeeded: 47_381,
  ltv: 89.35,
  loanType: 'Non-QM',
  monthlyPI: 8_527,
  monthlyHousing: 10_315,
};
const DEMO_STRINGS = ['$149,000', '$196,381', '$47,381', '89.3', '89.4', '$8,527', '$10,315', 'Non-QM'];

describe('advisor context — never leaks the demo scenario', () => {
  it('refinance turn: no demo figures, no down-payment intake', () => {
    const ctx = buildAdvisorContext({
      profile: { loanPurpose: 'refinance' },
      cashToCloseEstimate: DEMO, // an older client still sending demo numbers
      nextQuestions: ["What's your home's estimated value?"],
    });
    for (const s of DEMO_STRINGS) expect(ctx).not.toContain(s);
    expect(ctx).toContain('Loan purpose: refinance');
    expect(ctx).toContain('NOT AVAILABLE YET');
    expect(ctx).toContain('There is no down payment');
    expect(ctx).not.toMatch(/INTAKE INCOMPLETE/);
  });

  it('purchase with only a price: repeats the borrower price, hides demo figures', () => {
    const ctx = buildAdvisorContext({
      profile: { loanPurpose: 'purchase', purchasePrice: 900_000, city: 'Los Angeles', stateCode: 'CA' },
      cashToCloseEstimate: { hasBoth: false },
      nextQuestions: ['How much are you putting down?'],
    });
    for (const s of DEMO_STRINGS) expect(ctx).not.toContain(s);
    expect(ctx).toContain('purchase price $900,000');
    expect(ctx).toContain('Los Angeles, CA');
    expect(ctx).toContain('INTAKE INCOMPLETE');
  });

  it('missing estimate object is treated as no figures', () => {
    const ctx = buildAdvisorContext({ profile: {} });
    expect(ctx).toContain('Loan purpose: not stated yet');
    expect(ctx).toContain('NOT AVAILABLE YET');
  });

  it('real figures pass through when price and down payment are the borrower\'s', () => {
    const ctx = buildAdvisorContext({
      profile: { loanPurpose: 'purchase', purchasePrice: 1_000_000, downPayment: 200_000 },
      cashToCloseEstimate: { ...DEMO, hasBoth: true, downPayment: 200_000, totalCashToClose: 238_000, ltv: 80 },
    });
    expect(ctx).toContain('Borrower figures: AVAILABLE');
    expect(ctx).toContain('Total cash to close: $238,000');
    expect(ctx).toContain('LTV: 80.0%');
    expect(ctx).not.toContain('INTAKE');
  });

  it('refinance never shows a down payment, even if one slipped into the profile', () => {
    const ctx = buildAdvisorContext({ profile: { loanPurpose: 'refinance', purchasePrice: 1_200_000, downPayment: 50_000 } });
    expect(ctx).toContain('estimated home value $1,200,000');
    expect(ctx).not.toContain('down payment $50,000');
  });

  it('system prompt is purpose-aware, localized and bans markdown', () => {
    const sp = advisorSystemPrompt('ru');
    expect(sp).toContain('RUSSIAN');
    expect(sp).toMatch(/REFINANCE: there is NO down payment/);
    expect(sp).toMatch(/never mention an example scenario/);
    expect(sp).toMatch(/no markdown/);
  });

  it('plainText strips bold markers and headings', () => {
    expect(plainText('Are you looking to **refinance** or **buy**?')).toBe('Are you looking to refinance or buy?');
    expect(plainText('## Title\nBody')).toBe('Title\nBody');
  });
});

describe('chat route sends the safe context to the model', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('./aiProvider.mjs');
  });

  it('refinance request: the prompt the model receives has no demo figures', async () => {
    const seen = [];
    vi.doMock('./aiProvider.mjs', () => ({
      isAiConfigured: () => true,
      phraseWithAI: async (args) => {
        seen.push(args);
        return 'Got it — a **refinance**. What is your home\'s estimated value?';
      },
    }));
    const { default: handler } = await import('../mortgage-strategy-advisor.mjs');
    const res = await handler(
      new Request('https://wwccm.com/api/mortgage-strategy-advisor', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userMessage: 'Refinance question: my rate is 7.5%',
          language: 'en',
          profile: { loanPurpose: 'refinance' },
          cashToCloseEstimate: DEMO,
          nextQuestions: ["What's your home's estimated value?"],
          missingFields: ['Estimated home value'],
          historySummary: [],
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.assistantMessage).toBe("Got it — a refinance. What is your home's estimated value?");
    expect(body.cashToCloseEstimate).toBeNull();
    const prompt = seen[0].messages.at(-1).content;
    for (const s of DEMO_STRINGS) expect(prompt).not.toContain(s);
    expect(prompt).toContain('Loan purpose: refinance');
  });
});
