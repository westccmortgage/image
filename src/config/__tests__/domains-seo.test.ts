import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs'; // typed via src/test-shims.d.ts
import { companyFacts } from '../company-facts';
import { SITE_URL } from '../../site/walletWccm';

const PRIMARY = 'https://walletwccm.com';
const html = readFileSync('index.html', 'utf8');
const sitemap = readFileSync('public/sitemap.xml', 'utf8');
const robots = readFileSync('public/robots.txt', 'utf8');

describe('canonical domain strategy', () => {
  it('the product canonical is walletwccm.com; wwccm.com/.ai are alternates', () => {
    expect(companyFacts.canonicalSiteDomain).toBe(PRIMARY);
    expect(companyFacts.alternateSiteDomains).toContain('https://wwccm.com');
    expect(companyFacts.alternateSiteDomains).toContain('https://wwccm.ai');
  });
  it('the corporate parent domain is westccmortgage.com (distinct from the product)', () => {
    expect(companyFacts.canonicalCorporateDomain).toBe('https://westccmortgage.com');
  });
  it('SITE_URL points at the canonical product domain', () => {
    expect(SITE_URL).toBe(PRIMARY);
  });
});

describe('index.html SEO tags', () => {
  it('has a canonical link to walletwccm.com', () => {
    expect(html).toMatch(/<link rel="canonical" href="https:\/\/walletwccm\.com\/"/);
  });
  it('Open Graph + Twitter point at the canonical domain and OG image', () => {
    expect(html).toMatch(/property="og:url" content="https:\/\/walletwccm\.com\/"/);
    expect(html).toMatch(/property="og:image" content="https:\/\/walletwccm\.com\/og-image\.png"/);
    expect(html).toMatch(/name="twitter:card" content="summary_large_image"/);
  });
  it('structured data uses walletwccm.com and lists the alternates in sameAs', () => {
    expect(html).toMatch(/"url":\s*"https:\/\/walletwccm\.com"/);
    expect(html).toMatch(/"sameAs":\s*\[[^\]]*westccmortgage\.com[^\]]*wwccm\.com[^\]]*wwccm\.ai/);
  });
});

describe('sitemap + robots', () => {
  it('sitemap lists the walletwccm.com canonical URL', () => {
    expect(sitemap).toContain('<loc>https://walletwccm.com/</loc>');
  });
  it('robots points at the walletwccm.com sitemap', () => {
    expect(robots).toContain('Sitemap: https://walletwccm.com/sitemap.xml');
  });
});
