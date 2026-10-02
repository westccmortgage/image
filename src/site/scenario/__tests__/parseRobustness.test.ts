import { describe, it, expect } from 'vitest';
import { parseScenario } from '../parseScenario';

// Regression tests for crude parsing errors found in the 2026-10 hardening pass:
//  - borrower INCOME was landing in the price/down slot
//  - a multi-number sentence put the down amount into the price slot
//  - Chinese 万/亿 and Russian миллион/млн prices were not captured at all

describe('income is never read as price or down', () => {
  it('"I make $200k a year, buying an $800k place" → price $800k, income ignored', () => {
    const p = parseScenario('I make $200k a year, buying an $800k place');
    expect(p.purchasePrice).toBe(800_000);
    expect(p.downPayment).toBeUndefined();
  });

  it('"I earn 150000 salary ... buy 650000 home with 130000 down" → price 650k, down 130k', () => {
    const p = parseScenario('I earn 150000 salary and want to buy 650000 home with 130000 down');
    expect(p.purchasePrice).toBe(650_000);
    expect(p.downPayment).toBe(130_000);
  });

  it('a monthly salary is not a down payment', () => {
    const p = parseScenario('I make $12,000 a month and want to buy a $900k condo');
    expect(p.purchasePrice).toBe(900_000);
    expect(p.downPayment).toBeUndefined();
  });
});

describe('a down amount never lands in the price slot', () => {
  it('"home with 130000 down" does not set price to 130000', () => {
    const p = parseScenario('buy 650000 home with 130000 down');
    expect(p.purchasePrice).toBe(650_000);
    expect(p.downPayment).toBe(130_000);
  });
});

describe('multilingual magnitude prices', () => {
  it('Chinese: "价格200万，首付30%" → price ¥→$2,000,000 and 30% down', () => {
    const p = parseScenario('我想在洛杉矶买房，价格200万，首付30%');
    expect(p.purchasePrice).toBe(2_000_000);
    expect(p.downPaymentPercent).toBe(30);
    expect(p.downPayment).toBe(600_000);
  });

  it('Chinese: "首付60万" sets the down payment', () => {
    const p = parseScenario('价格300万，首付60万');
    expect(p.purchasePrice).toBe(3_000_000);
    expect(p.downPayment).toBe(600_000);
  });

  it('Russian: "дом 1 миллион, взнос 20 процентов" → price 1,000,000 and 20% down', () => {
    const p = parseScenario('первоначальный взнос 20 процентов, дом 1 миллион');
    expect(p.purchasePrice).toBe(1_000_000);
    expect(p.downPaymentPercent).toBe(20);
    expect(p.downPayment).toBe(200_000);
  });
});
