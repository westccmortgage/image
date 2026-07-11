import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs'; // typed via src/test-shims.d.ts
import {
  t,
  detectInitialLanguage,
  normalizeLocale,
  recognitionLangFor,
  LANGUAGES,
} from '../i18n';
import type { UIKey } from '../i18n';
import { mergeTranscript } from '../useSpeech';

// A. Initial language detection ---------------------------------------------
describe('A. initial language detection & priority', () => {
  it('normalizes browser locales to supported languages', () => {
    expect(normalizeLocale('ru-RU')).toBe('ru');
    expect(normalizeLocale('zh-CN')).toBe('zh');
    expect(normalizeLocale('zh-Hans')).toBe('zh');
    expect(normalizeLocale('es-US')).toBe('es');
    expect(normalizeLocale('en-GB')).toBe('en');
    expect(normalizeLocale('fr-FR')).toBeNull();
  });
  it('browser ru-RU opens Russian, zh-CN opens Chinese', () => {
    expect(detectInitialLanguage({ navigator: 'ru-RU' })).toBe('ru');
    expect(detectInitialLanguage({ navigator: 'zh-CN' })).toBe('zh');
  });
  it('unsupported browser locale falls back to English', () => {
    expect(detectInitialLanguage({ navigator: 'fr-FR' })).toBe('en');
    expect(detectInitialLanguage({})).toBe('en');
  });
  it('explicit stored selection overrides URL and browser', () => {
    expect(detectInitialLanguage({ stored: 'es', url: 'ru', navigator: 'zh-CN' })).toBe('es');
  });
  it('URL ?lang overrides browser when no explicit selection', () => {
    expect(detectInitialLanguage({ url: 'ru', navigator: 'en-US' })).toBe('ru');
  });
});

// B. Composer placeholder ----------------------------------------------------
describe('B. composer placeholder localization', () => {
  it('uses the exact per-language placeholder', () => {
    expect(t('en', 'composerPlaceholder')).toBe('Tell me what you want to buy, refinance, or understand…');
    expect(t('ru', 'composerPlaceholder')).toBe('Расскажите, что вы хотите купить, рефинансировать или понять…');
    expect(t('es', 'composerPlaceholder')).toBe('Cuénteme qué quiere comprar, refinanciar o entender…');
    expect(t('zh', 'composerPlaceholder')).toBe('请告诉我您想购买、再融资或了解什么……');
  });
});

// C. Greeting and example ----------------------------------------------------
describe('C. greeting and example localization', () => {
  it('greeting is localized and starts as specified', () => {
    expect(t('en', 'onboardingGreeting')).toMatch(/^Welcome\./);
    expect(t('ru', 'onboardingGreeting')).toMatch(/^Добро пожаловать/);
    expect(t('zh', 'onboardingGreeting')).toMatch(/^欢迎/);
  });
  it('no English onboarding leaks into RU/ZH', () => {
    for (const k of ['onboardingGreeting', 'onboardingExample'] as UIKey[]) {
      expect(t('ru', k)).not.toBe(t('en', k));
      expect(t('zh', k)).not.toBe(t('en', k));
      expect(t('ru', k)).toMatch(/[А-Яа-яЁё]/); // Cyrillic present
      expect(t('zh', k)).toMatch(/[一-鿿]/); // CJK present
    }
  });
});

// D. Full visible first-screen i18n audit -----------------------------------
const FIRST_SCREEN: UIKey[] = [
  'heroTitle', 'heroSubtitle', 'exampleOnly', 'downPayment', 'cashToClose', 'extraNeeded',
  'console', 'startOver', 'send', 'composerPlaceholder', 'onboardingGreeting', 'onboardingExample',
  'trustLine', 'complianceShort', 'profileTitle', 'profileWaiting', 'next', 'stillNeeded',
  'viewFullProfile', 'talkBroker', 'importantDisclosures', 'aiStrategy',
  'chipBuying', 'chipRefi', 'chipSelfEmployed', 'chipInvestment', 'chipCashToClose',
  'micStart', 'micStop', 'micListening', 'micDenied', 'micUnsupported',
  'docModalTitle', 'docUploadCta', 'prepareSummary', 'sendScenario',
];
describe('D. the entire first screen is localized (no hardcoded English in RU/ZH)', () => {
  for (const lang of ['ru', 'zh'] as const) {
    it(`${lang}: every first-screen string differs from English and is non-empty`, () => {
      const untranslated = FIRST_SCREEN.filter((k) => t(lang, k) === t('en', k) || !t(lang, k));
      expect(untranslated).toEqual([]);
    });
  }
});

// E. Card composition (structural CSS) --------------------------------------
describe('E. desktop card composition', () => {
  const css = readFileSync('src/index.css', 'utf8');
  it('uses a 60/40-style grid with the advisor wider than the profile', () => {
    expect(css).toContain('grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr)');
  });
  it('gives the empty advisor card a comparable min-height and anchors the composer', () => {
    expect(css).toContain('min-height: 520px');
    expect(css).toContain('.sm-stream { display: flex; flex-direction: column; gap: 10px; flex: 1 1 auto;');
  });
  it('prevents horizontal overflow and respects mobile safe areas', () => {
    expect(css).toContain('overflow-x: hidden');
    expect(css).toContain('env(safe-area-inset-bottom');
  });
});

// F. Empty profile state -----------------------------------------------------
describe('F. empty profile uses waiting language, not a dominant 0%', () => {
  it('has a localized waiting message', () => {
    expect(t('en', 'profileWaiting')).toBe('Waiting for your first details…');
    expect(t('ru', 'profileWaiting')).toBe('Ожидаю первые данные о вашей ситуации…');
    expect(t('zh', 'profileWaiting')).toBe('等待您提供初步信息……');
  });
});

// G. Microphone helpers ------------------------------------------------------
describe('G. microphone speech helpers', () => {
  it('maps the selected language to the right recognition locale', () => {
    expect(recognitionLangFor('en')).toBe('en-US');
    expect(recognitionLangFor('ru')).toBe('ru-RU');
    expect(recognitionLangFor('es')).toBe('es-US');
    expect(recognitionLangFor('zh')).toBe('zh-CN');
  });
  it('appends transcript to already-typed text without overwriting', () => {
    expect(mergeTranscript('', 'hello world')).toBe('hello world');
    expect(mergeTranscript('I want', 'to buy a home')).toBe('I want to buy a home');
    expect(mergeTranscript('I want ', 'to buy')).toBe('I want to buy');
    expect(mergeTranscript('base', '')).toBe('base');
  });
});

// H. Trust line --------------------------------------------------------------
describe('H. trust line', () => {
  it('is correct in all four languages', () => {
    expect(t('en', 'trustLine')).toBe('No credit pull. No obligation. No application required.');
    expect(t('ru', 'trustLine')).toBe('Без проверки кредитной истории. Без обязательств. Заявка не требуется.');
    expect(t('es', 'trustLine')).toBe('Sin consulta de crédito. Sin obligación. No se requiere una solicitud.');
    expect(t('zh', 'trustLine')).toBe('无需查询信用。无任何义务。无需提交贷款申请。');
  });
});

// I. Quick-action chips ------------------------------------------------------
describe('I. quick-action chips', () => {
  it('has localized labels in every language', () => {
    for (const l of LANGUAGES) {
      for (const k of ['chipBuying', 'chipRefi', 'chipSelfEmployed', 'chipInvestment', 'chipCashToClose'] as UIKey[]) {
        expect(t(l.code, k)).toBeTruthy();
      }
    }
  });
  it('starter phrases are full localized sentences, not just the chip label', () => {
    const pairs: [UIKey, UIKey][] = [
      ['chipBuying', 'chipStarterBuying'],
      ['chipRefi', 'chipStarterRefi'],
      ['chipSelfEmployed', 'chipStarterSelfEmployed'],
      ['chipInvestment', 'chipStarterInvestment'],
      ['chipCashToClose', 'chipStarterCashToClose'],
    ];
    for (const l of LANGUAGES) {
      for (const [label, starter] of pairs) {
        expect(t(l.code, starter).length).toBeGreaterThan(t(l.code, label).length);
      }
    }
    expect(t('ru', 'chipStarterBuying')).toBe('Я хочу купить дом и понять, какие варианты кредита мне подходят.');
    expect(t('zh', 'chipStarterBuying')).toBe('我想购买房屋，并了解哪些贷款方案可能适合我。');
  });
});
