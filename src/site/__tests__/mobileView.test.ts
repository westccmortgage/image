import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs'; // typed via src/test-shims.d.ts
import { t, LANGUAGES } from '../i18n';
import { isStrategyReady } from '../scenario';
import type { ScenarioProfile } from '../scenario';

const advisor = readFileSync('src/site/SmartAdvisor.tsx', 'utf8');
const css = readFileSync('src/index.css', 'utf8');

describe('mobile: strategy-summary readiness', () => {
  it('is NOT ready before enough core information', () => {
    expect(isStrategyReady({})).toBe(false);
    expect(isStrategyReady({ purchasePrice: 800_000 })).toBe(false);
    // numbers only, missing location/occupancy/income
    expect(isStrategyReady({ purchasePrice: 800_000, downPayment: 160_000 })).toBe(false);
  });
  it('is ready once price+down, location, occupancy, and income are known', () => {
    const p: ScenarioProfile = {
      purchasePrice: 800_000,
      downPayment: 160_000,
      state: 'California',
      occupancy: 'primary',
      employmentType: 'w2',
    };
    expect(isStrategyReady(p)).toBe(true);
  });
  it('does not require every optional field (FICO/reserves/goal)', () => {
    const p: ScenarioProfile = {
      purchasePrice: 800_000, downPayment: 160_000, zipOrCounty: '90210',
      occupancy: 'investment', incomeDocPath: 'dscr',
    };
    expect(isStrategyReady(p)).toBe(true);
    expect(p.fico).toBeUndefined();
  });
});

describe('mobile: localization of the new strings (EN/RU/ES/ZH)', () => {
  const keys = [
    'heroTitleMobile', 'heroLineMobile', 'onboardingGreetingMobile',
    'chipBuyingShort', 'chipRefiShort', 'chipSelfEmployedShort', 'chipInvestmentShort',
    'summaryOffer', 'summaryViewCta', 'summaryContinueCta', 'summaryTitle',
    'summaryMonthlyPayment', 'summaryPlanningNote', 'adjustScenario', 'continueChat',
  ] as const;
  it('every mobile key is present and non-empty in all four languages', () => {
    for (const l of LANGUAGES) {
      for (const k of keys) {
        expect(t(l.code, k), `${l.code}/${k}`).toBeTruthy();
      }
    }
  });
  it('short chip labels are actually shorter than the desktop ones', () => {
    expect(t('en', 'chipBuyingShort').length).toBeLessThan(t('en', 'chipBuying').length);
  });
});

describe('mobile: source contract', () => {
  it('swaps the hero to a compact mobile title + line', () => {
    expect(advisor).toContain("tr('heroTitleMobile')");
    expect(advisor).toContain('className="sm-h1-mobile"');
    expect(advisor).toContain("tr('heroLineMobile')");
  });
  it('uses a short mobile greeting and a 4-item mobile chip set', () => {
    expect(advisor).toContain("isMobile ? 'onboardingGreetingMobile' : 'onboardingGreeting'");
    expect(advisor).toContain('MOBILE_CHIPS');
  });
  it('offers the summary only once, gated on readiness, never auto-opened', () => {
    expect(advisor).toContain('isStrategyReady(next) && !summaryOfferedRef.current');
    expect(advisor).toMatch(/role: 'offer'/);
    // two localized actions
    expect(advisor).toContain("tr('summaryViewCta')");
    expect(advisor).toContain("tr('summaryContinueCta')");
  });
});

describe('desktop + mobile: no empty result cards; summary is the single source', () => {
  it('the empty Down/Cash/Extra result cards are gone from the hero', () => {
    expect(advisor).not.toContain('className="sm-cards"');
    expect(advisor).not.toContain('className="sm-card"');
    expect(advisor).not.toContain('className="sm-card is-key"');
  });
  it('the "Example only" tag is no longer rendered on the first screen', () => {
    expect(advisor).not.toContain("tr('exampleOnly')");
    expect(advisor).not.toContain('sm-tag');
  });
  it('there is exactly ONE strategy-summary sheet (shared by desktop + mobile)', () => {
    const matches = advisor.match(/className="sm-summary"/g) ?? [];
    expect(matches.length).toBe(1);
  });
  it('the summary numbers come from the deterministic engine (calc), not invented', () => {
    // summary cash-to-close reads calc.totalCashToClose (deterministic engine)
    expect(advisor).toContain('calc.totalCashToClose');
    expect(advisor).toContain('calc.monthlyHousingPayment');
    // unknowns stay em-dash, never fabricated
    expect(advisor).toMatch(/both \? formatMoney\(calc\.totalCashToClose\) : '—'/);
  });
});

describe('mobile CSS', () => {
  it('hides the empty calc cards and desktop headline on mobile', () => {
    const block = css.match(/@media \(max-width: 767px\)[\s\S]*?\n}/)?.[0] ?? '';
    expect(block).toContain('.sm-cards, .sm-tag { display: none; }');
    expect(block).toContain('.sm-h1-desktop, .sm-sub-desktop { display: none; }');
  });
  it('the composer puts a full-width input on its own row with an action bar below', () => {
    // Input is full width (column layout) so dictation is fully visible; the
    // paperclip/mic/Send are on a separate action bar, never squeezing the input.
    expect(css).toMatch(/\.sm-inputrow \{[^}]*flex-direction: column/);
    expect(css).toMatch(/\.sm-inputrow \.sm-input \{[^}]*width: 100%/);
    expect(css).toMatch(/\.sm-actions \{[^}]*display: flex/);
    expect(css).toContain('.sm-actions-gap { flex: 1 1 auto; }');
    // The input is tall on mobile so several dictated lines are visible.
    const block = css.match(/@media \(max-width: 767px\)[\s\S]*?\n}/)?.[0] ?? '';
    expect(block).toMatch(/\.sm-inputrow \.sm-input \{[^}]*min-height: 84px/);
  });
  it('uses safe-area + dvh for the profile bar and summary sheet', () => {
    expect(css).toContain('env(safe-area-inset-bottom)');
    expect(css).toMatch(/\.sm-summary \{[^}]*dvh/);
  });
});
