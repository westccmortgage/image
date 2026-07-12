import { describe, it, expect } from 'vitest';
import {
  resolveResource,
  resolveRecommendations,
  WWCCM_RESOURCES,
} from '../wwccm-resources';

describe('WWCCM resource registry — TEST 21 resource URL security', () => {
  it('resolves a known verified resource, localized', () => {
    const r = resolveResource('ai_mortgage_strategy_advisor', 'ru');
    expect(r).not.toBeNull();
    expect(r?.url).toBe('/');
    expect(r?.title).toBe('ИИ-советник по ипотечной стратегии');
  });
  it('rejects an unknown / model-invented resourceId', () => {
    expect(resolveResource('totally_made_up', 'en')).toBeNull();
    expect(resolveResource('https://evil.example.com', 'en')).toBeNull();
  });
  it('never surfaces admin / login / staging / CRM style resources', () => {
    // None are registered; the registry only contains verified borrower routes.
    for (const r of WWCCM_RESOURCES) {
      expect(r.url).not.toMatch(/admin|login|staging|grcrm|crm|webhook/i);
    }
  });
  it('caps and dedupes recommendations to at most 3', () => {
    const many = resolveRecommendations(
      [
        'ai_mortgage_strategy_advisor',
        'ai_mortgage_strategy_advisor',
        'unknown_a',
        'unknown_b',
        'unknown_c',
      ],
      'en',
      3,
    );
    expect(many.length).toBe(1); // only the one real, deduped resource survives
    expect(many.every((r) => r.resourceId === 'ai_mortgage_strategy_advisor')).toBe(true);
  });
  it('every registered resource is verified and carries a verification date', () => {
    for (const r of WWCCM_RESOURCES) {
      expect(r.verified).toBe(true);
      expect(r.lastVerifiedAt).toBeTruthy();
    }
  });
});
