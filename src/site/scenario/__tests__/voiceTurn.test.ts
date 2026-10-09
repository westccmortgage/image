import { describe, it, expect } from 'vitest';
import { runAdvisorTurn } from '../voiceTurn';

// The phone agent reuses the chat brain through runAdvisorTurn. These lock the
// contract the voice route depends on: deterministic reply, intake order, percent
// capture, and "numbers are only real once price AND down are both known".

describe('runAdvisorTurn — shared voice/chat brain', () => {
  it('first turn with only a price asks for the down payment next', () => {
    const r = runAdvisorTurn({ text: 'I want to buy an $900,000 house', isFirst: true });
    expect(r.profile.purchasePrice).toBe(900_000);
    expect(r.numbers.hasBoth).toBe(false);
    expect(r.pendingField).toBe('downPayment');
    expect(r.reply.length).toBeGreaterThan(0);
  });

  it('a bare percent answers the pending down-payment question', () => {
    const first = runAdvisorTurn({ text: 'buying a $900k place at a 6% rate', isFirst: true });
    const second = runAdvisorTurn({
      text: '20%',
      profile: first.profile,
      pendingField: first.pendingField,
    });
    // 20% of 900k = 180k down → now both known, numbers are real.
    expect(second.profile.downPayment).toBe(180_000);
    expect(second.numbers.hasBoth).toBe(true);
    expect(second.numbers.downPayment).toBe(180_000);
    expect(second.pendingField).not.toBe('downPayment');
  });

  it('does not present example numbers as the caller\'s before both are known', () => {
    const r = runAdvisorTurn({ text: 'how much cash do I need to close?', isFirst: true });
    expect(r.numbers.hasBoth).toBe(false);
  });

  it('computes real cash-to-close once price + down are given together', () => {
    const r = runAdvisorTurn({ text: 'price is $800,000 with $200,000 down at 6%', isFirst: true });
    expect(r.profile.downPayment).toBe(200_000);
    expect(r.numbers.hasBoth).toBe(true);
    expect(r.numbers.totalCashToClose).toBeGreaterThan(200_000);
    expect(r.numbers.ltv).toBeGreaterThan(0);
  });

  it('carries the profile forward across turns', () => {
    const t1 = runAdvisorTurn({ text: '$750,000 home at a 6% rate', isFirst: true });
    const t2 = runAdvisorTurn({ text: '$150,000 down', profile: t1.profile, pendingField: t1.pendingField });
    expect(t2.profile.purchasePrice).toBe(750_000);
    expect(t2.profile.downPayment).toBe(150_000);
    expect(t2.numbers.hasBoth).toBe(true);
  });

  it('replies in the requested language question prompt', () => {
    const r = runAdvisorTurn({ text: 'покупаю дом за 900000', language: 'ru', isFirst: true });
    // The next question prompt should be localized (Russian), not English.
    expect(r.nextQuestion).not.toBeNull();
    expect(/[а-яА-Я]/.test(r.nextQuestion!.prompt)).toBe(true);
  });
});
