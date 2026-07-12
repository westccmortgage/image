import { describe, it, expect } from 'vitest';
import { matchLoanPrograms } from '../loanPrograms';
import {
  hasVerifiedProgramData,
  programDataStatusFor,
  programEffectiveDate,
} from '../programData';
import type { ScenarioProfile } from '../types';

// TEST 20 — current-market honesty. With no verified pricing/program source
// connected, no path may be labeled "verified_current" and none may carry an
// effective date.

describe('program-data honesty', () => {
  it('no verified source is connected by default', () => {
    expect(hasVerifiedProgramData()).toBe(false);
    expect(programEffectiveDate()).toBeNull();
  });

  it('status is a planning assumption or broker-review, never verified', () => {
    expect(programDataStatusFor(false)).toBe('configured_assumption');
    expect(programDataStatusFor(true)).toBe('broker_review_required');
    expect(programDataStatusFor(false)).not.toBe('verified_current');
  });

  it('matched programs are never verified_current and carry no effective date', () => {
    const profile: ScenarioProfile = {
      purchasePrice: 800_000,
      downPayment: 160_000,
      occupancy: 'primary',
      incomeDocPath: 'full-doc',
    };
    const matches = matchLoanPrograms(profile);
    expect(matches.length).toBeGreaterThan(0);
    for (const m of matches) {
      expect(m.dataStatus).not.toBe('verified_current');
      expect(['configured_assumption', 'broker_review_required']).toContain(m.dataStatus);
      expect(m.effectiveDate).toBeNull();
    }
  });
});
