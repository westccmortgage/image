import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs'; // typed via src/test-shims.d.ts
import { t } from '../i18n';

// Paths are relative to the repo root (vitest's cwd).
const page = readFileSync('src/pages/SmartPage.tsx', 'utf8');
const css = readFileSync('src/index.css', 'utf8');

describe('hero headline', () => {
  it('keeps the exact approved (plural) wording', () => {
    expect(t('en', 'heroTitle')).toBe(
      'Describe your mortgage scenario. The advisor will compare possible loan paths.',
    );
  });
  it('uses the reduced responsive clamp() typography', () => {
    const rule = css.match(/\.sm-core\s*\{[^}]*\}/)?.[0] ?? '';
    expect(rule).toMatch(/font-size:\s*clamp\(/);
    // capped no larger than ~3.5rem (≈56px), never a single fixed huge size
    expect(rule).toMatch(/clamp\(2\.1rem,\s*4\.2vw,\s*3\.4rem\)/);
    expect(rule).toMatch(/line-height:\s*1\.0[0-8]/);
  });
});

describe('corporate header link', () => {
  it('exposes the approved corporate URL only', () => {
    expect(page).toContain("const CORPORATE_URL = 'https://westccmortgage.com'");
  });
  it('the brand anchor opens the corporate site in a new, safe tab', () => {
    const brand = page.match(/<a\s+className="sm-brand"[\s\S]*?>/)?.[0] ?? '';
    expect(brand).toContain('href={CORPORATE_URL}');
    expect(brand).toContain('target="_blank"');
    expect(brand).toContain('rel="noopener noreferrer"');
    expect(brand).toMatch(/aria-label="Visit West Coast Capital Mortgage/);
  });
  it('does NOT point the brand at walletwccm.com, WCCI, CRM, or a staging route', () => {
    expect(page).not.toMatch(/walletwccm\.com/i);
    expect(page).not.toMatch(/wcci/i);
    expect(page).not.toMatch(/grcrm|staging|preview\.netlify/i);
  });
  it('the footer company name is a subtle link to the same corporate site', () => {
    const footerLink = page.match(/<a\s+className="sm-footer-corp"[\s\S]*?>/)?.[0] ?? '';
    expect(footerLink).toContain('href={CORPORATE_URL}');
    expect(footerLink).toContain('rel="noopener noreferrer"');
  });
});

describe('broker CTA stays separate & functional', () => {
  it('the "Talk to a Broker" action remains, pointing at the phone link', () => {
    expect(page).toContain("t(lang, 'talkBroker')");
    expect(page).toContain('href={PHONE_HREF}');
  });
  it('the theme toggle (light/dark) is preserved', () => {
    expect(page).toContain("setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))");
  });
});

describe('decorative background wordmark', () => {
  it('is present, aria-hidden, and non-interactive', () => {
    expect(page).toMatch(/className="sm-bgmark"\s+aria-hidden="true"/);
    const rule = css.match(/\.sm-bgmark\s*\{[^}]*\}/)?.[0] ?? '';
    expect(rule).toContain('pointer-events: none');
    expect(rule).toContain('user-select: none');
  });
});
