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

describe('header logo + corporate link', () => {
  it('exposes the approved corporate URL only', () => {
    expect(page).toContain("const CORPORATE_URL = 'https://westccmortgage.com'");
  });
  it('the brand block is NOT a link (the logo itself is not clickable)', () => {
    expect(page).toMatch(/<div className="sm-brand">/);
    expect(page).not.toMatch(/<a[^>]*className="sm-brand"/);
    // the logo is an inline svg, not wrapped in an anchor
    expect(page).toContain('className="sm-logo"');
  });
  it('only the corporate company name is the clickable link, in a new safe tab', () => {
    const link = page.match(/<a\s+className="sm-corp-link"[\s\S]*?>/)?.[0] ?? '';
    expect(link).toContain('href={CORPORATE_URL}');
    expect(link).toContain('target="_blank"');
    expect(link).toContain('rel="noopener noreferrer"');
    expect(link).toMatch(/aria-label="Visit West Coast Capital Mortgage/);
    // "Powered by" precedes the link and stays plain text
    expect(page).toMatch(/Powered by\{' '\}\s*<a\s+className="sm-corp-link"/);
    expect(page).toContain('West Coast Capital Mortgage Inc.');
  });
  it('has the subtle hover motion (translateX + revealed arrow)', () => {
    expect(css).toMatch(/\.sm-corp-link:hover[^{]*\{[^}]*translateX\(3px\)/);
    expect(css).toContain('sm-corp-arrow');
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
