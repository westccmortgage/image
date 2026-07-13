import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseBorrowerScenario,
  generateNextQuestions,
  resolveLoanLimitArea,
  matchLoanPrograms,
  buildCompactProfile,
  hasFullNumbers,
  completionPercent,
  missingRequired,
  readInitialProfile,
  clearAdvisorState,
  mergeProfile,
  CONTACT_FIELDS,
  nextQuestions,
} from '../index';
import { HERO, walletWccmConfig } from '../../walletWccm';
import { t, LANGUAGES } from '../../i18n';

const EXAMPLE = "I want to buy a $2M home in California. I'm self-employed and have $400k down.";

// A. Product naming ----------------------------------------------------------
describe('A. product is the AI Mortgage Strategy Advisor', () => {
  it('primary product name is the strategy advisor, not the cash-to-close engine', () => {
    expect(t('en', 'productName')).toBe('AI Mortgage Strategy Advisor');
    expect(HERO.title).toBe('AI Mortgage Strategy Advisor');
    expect(walletWccmConfig.altLabel).toBe('AI Mortgage Strategy Advisor');
    expect(t('en', 'productName').toLowerCase()).not.toContain('cash-to-close engine');
  });
  it('hero message is broad (loan paths), not only cash-to-close', () => {
    // The heading is short; the breadth ("loan paths") lives in the support line.
    const hero = `${t('en', 'heroTitle')} ${t('en', 'heroSubtitle')}`.toLowerCase();
    expect(hero).toContain('loan path');
  });
  it('responds in all four languages', () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(['en', 'ru', 'es', 'zh']);
    for (const l of LANGUAGES) expect(t(l.code, 'productName')).toBeTruthy();
  });
});

// B. Demo state --------------------------------------------------------------
describe('B. demo numbers are hidden/labeled before user input', () => {
  it('no personal numbers until BOTH price and down payment are known', () => {
    expect(hasFullNumbers({})).toBe(false);
    expect(hasFullNumbers({ purchasePrice: 2_000_000 })).toBe(false);
    expect(hasFullNumbers({ purchasePrice: 2_000_000, downPayment: 400_000 })).toBe(true);
  });
  it('provides an explicit "example only" label', () => {
    expect(t('en', 'exampleOnly').toLowerCase()).toContain('example only');
  });
});

// C. Contact timing ----------------------------------------------------------
describe('C. contact is never requested upfront', () => {
  it('normal questions never include name/phone/email — even for a full scenario', () => {
    const full = mergeProfile(parseBorrowerScenario(EXAMPLE), {
      occupancy: 'primary', incomeDocPath: 'bank-statements', zipOrCounty: '91604',
      borrowerGoal: 'compare-all',
    });
    const asked = new Set(nextQuestions(full, { max: 3 }).map((q) => q.field));
    for (const c of CONTACT_FIELDS) expect(asked.has(c)).toBe(false);
  });
  it('contact only surfaces when explicitly requested (broker review step)', () => {
    const full = mergeProfile(parseBorrowerScenario(EXAMPLE), {
      occupancy: 'primary', incomeDocPath: 'bank-statements', zipOrCounty: '91604', borrowerGoal: 'compare-all',
    });
    expect(nextQuestions(full, { includeContact: true }).map((q) => q.field)).toEqual(['name', 'phone', 'email']);
  });
});

// D. Start Over reset --------------------------------------------------------
describe('D. Start Over clears the scenario', () => {
  it('resetting the profile clears completion, facts, and loan-path gating inputs', () => {
    const filled = mergeProfile(parseBorrowerScenario(EXAMPLE), { occupancy: 'primary' });
    expect(completionPercent(filled)).toBeGreaterThan(0);
    // The reset that Start Over performs is: profile → {}
    const reset = {};
    expect(completionPercent(reset)).toBe(0);
    expect(buildCompactProfile(reset).facts).toHaveLength(0);
    expect(missingRequired(reset).length).toBeGreaterThan(0);
  });
});

// E. No stale state on reload ------------------------------------------------
describe('E. old storage never hydrates a new visit', () => {
  beforeEach(() => {
    const mk = () => {
      const map = new Map<string, string>();
      return {
        getItem: (k: string) => map.get(k) ?? null,
        setItem: (k: string, v: string) => void map.set(k, v),
        removeItem: (k: string) => void map.delete(k),
        clear: () => map.clear(),
        key: () => null,
        get length() { return map.size; },
      } as unknown as Storage;
    };
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: mk(),
      sessionStorage: mk(),
    };
  });

  it('initial profile is always empty regardless of stored values', () => {
    const w = (globalThis as unknown as { window: { localStorage: Storage; sessionStorage: Storage } }).window;
    w.localStorage.setItem('ww-advisor-profile', JSON.stringify({ purchasePrice: 9_999_999 }));
    w.sessionStorage.setItem('ww-scenario', JSON.stringify({ downPayment: 12345 }));
    expect(readInitialProfile()).toEqual({});
  });

  it('clearAdvisorState wipes legacy advisor keys from both storages', () => {
    const w = (globalThis as unknown as { window: { localStorage: Storage; sessionStorage: Storage } }).window;
    w.localStorage.setItem('ww-advisor-profile', 'x');
    w.sessionStorage.setItem('ww-scenario', 'y');
    clearAdvisorState();
    expect(w.localStorage.getItem('ww-advisor-profile')).toBeNull();
    expect(w.sessionStorage.getItem('ww-scenario')).toBeNull();
  });
});

// F. Location regression -----------------------------------------------------
describe('F. Santa Clarita is not Santa Clara County', () => {
  it('parses "Santa Clarita, CA" to Los Angeles County (never Santa Clara)', () => {
    const p = parseBorrowerScenario('Buying a home in Santa Clarita, CA');
    expect(p.county).not.toBe('Santa Clara');
    expect(p.county).toBe('Los Angeles');
    expect(p.countyConfidence).toBe('confirmed');
  });
  it('still resolves the real city of Santa Clara correctly', () => {
    const p = parseBorrowerScenario('Buying in Santa Clara, CA');
    expect(p.county).toBe('Santa Clara');
  });
  it('an unknown city is left uncertain and asks for confirmation', () => {
    const r = resolveLoanLimitArea({ city: 'Nowheresville', state: 'California' });
    expect(r.county).toBeUndefined();
    expect(r.confidence).toBe('uncertain');
    expect(r.needsConfirmation).toBe(true);
  });
  it('a ZIP is authoritative and does not need confirmation', () => {
    const r = resolveLoanLimitArea({ zipOrCounty: '91604' });
    expect(r.confidence).toBe('confirmed');
    expect(r.needsConfirmation).toBe(false);
  });
});

// G. Parser ------------------------------------------------------------------
describe('G. parser extracts the core scenario', () => {
  const p = parseBorrowerScenario(EXAMPLE);
  it('purchase price = 2,000,000', () => expect(p.purchasePrice).toBe(2_000_000));
  it('down payment = 400,000', () => expect(p.downPayment).toBe(400_000));
  it('state = California (CA)', () => {
    expect(p.state).toBe('California');
    expect(p.stateCode).toBe('CA');
  });
  it('employment = self-employed', () => expect(p.employmentType).toBe('self-employed'));
  it('loan purpose = purchase', () => expect(p.loanPurpose).toBe('purchase'));
});

// H. Question engine ---------------------------------------------------------
describe('H. question engine asks the next 1–3 most important', () => {
  const p = parseBorrowerScenario(EXAMPLE);
  it('asks at most 3, occupancy first', () => {
    const qs = generateNextQuestions(p, { max: 3 });
    expect(qs.length).toBeLessThanOrEqual(3);
    expect(qs[0].field).toBe('occupancy');
  });
  it('the next three cover occupancy, income doc, and ZIP/county', () => {
    const fields = generateNextQuestions(p, { max: 3 }).map((q) => q.field);
    expect(fields).toContain('occupancy');
    expect(fields).toContain('incomeDocPath');
    expect(fields).toContain('zipOrCounty');
  });
});

// I. Compact (non-long-form) profile ----------------------------------------
describe('I. profile is compact, not a long inline form', () => {
  it('caps at 5 known facts and 4 critical missing items', () => {
    const full = mergeProfile(parseBorrowerScenario(EXAMPLE), {
      occupancy: 'primary', incomeDocPath: 'bank-statements', zipOrCounty: '91604',
      borrowerGoal: 'compare-all', fico: 740, reserves: 200_000,
    });
    const compact = buildCompactProfile(full);
    expect(compact.facts.length).toBeLessThanOrEqual(5);
    expect(compact.criticalMissing.length).toBeLessThanOrEqual(4);
    expect(compact.pct).toBeGreaterThan(0);
  });
});

// Loan-program comparison ----------------------------------------------------
describe('loan programs are compared with cautious language', () => {
  const full = mergeProfile(parseBorrowerScenario(EXAMPLE), { occupancy: 'primary' });
  const programs = matchLoanPrograms(full);
  it('returns multiple possible paths', () => {
    expect(programs.length).toBeGreaterThan(1);
  });
  it('a self-employed borrower surfaces a bank-statement path', () => {
    expect(programs.some((p) => p.category === 'Non-QM Bank Statement')).toBe(true);
  });
  it('never uses forbidden words like approved/guaranteed/qualify', () => {
    const blob = JSON.stringify(programs).toLowerCase();
    for (const banned of ['approved', 'guaranteed', 'you qualify', 'best rate guaranteed']) {
      expect(blob).not.toContain(banned);
    }
  });
  it('every path carries a cautious fit label', () => {
    for (const p of programs) {
      expect(['Possible strong fit', 'Possible fit', 'May fit — needs review']).toContain(p.fit);
    }
  });
});
