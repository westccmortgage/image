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

describe('mobile CSS', () => {
  it('hides the empty calc cards and desktop headline on mobile', () => {
    const block = css.match(/@media \(max-width: 767px\)[\s\S]*?\n}/)?.[0] ?? '';
    expect(block).toContain('.sm-cards, .sm-tag { display: none; }');
    expect(block).toContain('.sm-h1-desktop, .sm-sub-desktop { display: none; }');
  });
  it('the mobile composer keeps the input flexible (min-width:0) and a fixed compact send', () => {
    const block = css.match(/@media \(max-width: 767px\)[\s\S]*?\n}/)?.[0] ?? '';
    expect(block).toMatch(/\.sm-inputrow \.sm-input \{[^}]*min-width: 0/);
    // Send is icon-only + fixed width on mobile so RU/ZH labels never squeeze the input.
    expect(block).toMatch(/\.sm-inputrow \.sm-sendbtn \{[^}]*width: 52px/);
    expect(block).toContain('.sm-send-label { display: none; }');
  });
  it('uses safe-area + dvh for the profile bar and summary sheet', () => {
    expect(css).toContain('env(safe-area-inset-bottom)');
    expect(css).toMatch(/\.sm-summary \{[^}]*dvh/);
  });
});
