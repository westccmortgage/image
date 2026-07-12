import { describe, it, expect } from 'vitest';
import { parseScenario } from '../parseScenario';
import { mergeProfile } from '../profile';

// Regression tests for bugs found in the scenario audit (2026-07-12).

describe('audit: money classification (adjacency, not proximity)', () => {
  it('a price followed by a separate "20% down" is NOT read as the down payment', () => {
    const p = parseScenario('buying in Santa Clarita, CA, 1.1 million, 20% down');
    expect(p.purchasePrice).toBe(1_100_000);
    expect(p.downPaymentPercent).toBe(20);
    expect(p.downPayment).toBe(220_000); // 20% of 1.1M, not "1.1M is the down"
  });
  it('"850k home with 85k down" keeps both price and down', () => {
    const p = parseScenario('buying a 850k home with 85k down');
    expect(p.purchasePrice).toBe(850_000);
    expect(p.downPayment).toBe(85_000);
  });
  it('"$25M estate, 40% down" reads the estate as the price', () => {
    const p = parseScenario('$25M estate, 40% down');
    expect(p.purchasePrice).toBe(25_000_000);
    expect(p.downPayment).toBe(10_000_000);
  });
  it('"price is X, cash Y" splits correctly', () => {
    const p = parseScenario('price is 1,250,000, cash 250,000');
    expect(p.purchasePrice).toBe(1_250_000);
    expect(p.downPayment).toBe(250_000);
  });
});

describe('audit: refinance intent is sticky', () => {
  it('a later "home worth $4M" does not flip a refinance to a purchase', () => {
    const p = mergeProfile(parseScenario('I want to refinance my mortgage'), parseScenario('home worth 4,000,000'));
    expect(p.loanPurpose).toBe('refinance');
    expect(p.purchasePrice).toBe(4_000_000);
  });
  it('cash-out refinance is a refinance', () => {
    const p = mergeProfile(parseScenario('I want a cash-out refinance'), parseScenario('house is worth 900k'));
    expect(p.loanPurpose).toBe('refinance');
  });
  it('a bare noun "home" alone is not a purchase signal', () => {
    expect(parseScenario('my home is worth 800k').loanPurpose).toBeUndefined();
    expect(parseScenario('I want to buy a home').loanPurpose).toBe('purchase');
  });
});

describe('audit: bare-integer money vs ZIP', () => {
  it('"down payment 50000" is a down payment, not a ZIP', () => {
    const p = parseScenario('down payment 50000');
    expect(p.downPayment).toBe(50_000);
    expect(p.zipOrCounty).toBeUndefined();
  });
  it('a real ZIP is still captured', () => {
    const p = parseScenario('property in 90210, price 3M, 25% down');
    expect(p.zipOrCounty).toBe('90210');
    expect(p.purchasePrice).toBe(3_000_000);
  });
});

describe('audit: multilingual percent-down', () => {
  it('Spanish "20% de enganche"', () => {
    const p = parseScenario('quiero comprar una casa de 800,000 con 20% de enganche');
    expect(p.purchasePrice).toBe(800_000);
    expect(p.downPaymentPercent).toBe(20);
    expect(p.downPayment).toBe(160_000);
  });
  it('Chinese "首付 20%"', () => {
    const p = parseScenario('我想买一套 900,000 的房子，首付 20%');
    expect(p.purchasePrice).toBe(900_000);
    expect(p.downPaymentPercent).toBe(20);
  });
});

describe('audit: zero-down and county formatting', () => {
  it('"0 down" is captured as $0 / 100% intent', () => {
    const p = parseScenario('$500k home, 0 down');
    expect(p.downPayment).toBe(0);
    expect(p.downPaymentPercent).toBe(0);
  });
  it('an explicit county is title-cased', () => {
    const p = parseScenario('Los Angeles County, buying at 1.4M, 20% down');
    expect(p.zipOrCounty).toBe('Los Angeles County');
  });
});
