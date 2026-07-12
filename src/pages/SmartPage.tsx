import { useEffect, useState } from 'react';
import { SmartAdvisor } from '../site/SmartAdvisor';
import { PHONE, PHONE_HREF } from '../site/walletWccm';
import { t, readInitialLanguage, persistLanguage } from '../site/i18n';
import type { Language } from '../site/scenario';
import { COMPANY, INDIVIDUAL, COMPANY_LICENSE, INDIVIDUAL_LICENSE } from '../site/licensing';

type Theme = 'light' | 'dark';

/** Approved corporate website (opens in a new tab to preserve the advisor session). */
const CORPORATE_URL = 'https://westccmortgage.com';

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem('ww-theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* ignore */
  }
  return 'light'; // Apple-style light by default
}

/**
 * The unified Wallet WCCM smart site — the AI Mortgage Strategy Advisor. One
 * page where the borrower describes their scenario in natural language and the
 * advisor compares possible loan paths, estimates real cash to close with the
 * deterministic engine, and prepares the scenario for broker review. Supports a
 * light ("Apple") and dark ("AI machine") theme; the composition is identical.
 */
export function SmartPage() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  // Language is owned at the page level so the nav + advisor localize together.
  // Initial value resolves synchronously (explicit pref → ?lang → browser → en).
  const [lang, setLang] = useState<Language>(readInitialLanguage);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('ww-theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  function changeLang(next: Language) {
    persistLanguage(next);
    setLang(next);
  }

  return (
    <div className="sm-page" id="top">
      {/* Decorative corporate wordmark, ghosted behind all content. */}
      <div className="sm-bgmark" aria-hidden="true">WEST COAST CAPITAL MORTGAGE</div>
      <header className="sm-nav">
        <a
          className="sm-brand"
          href={CORPORATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit West Coast Capital Mortgage corporate website"
          title="Visit West Coast Capital Mortgage"
        >
          <span className="sm-brand-mark" aria-hidden="true" />
          <span className="sm-brand-text">
            WALLET <b>WCCM</b>
            <small>Powered by West Coast Capital Mortgage Inc.</small>
          </span>
        </a>
        <div className="sm-nav-actions">
          <button
            type="button"
            className="sm-toggle"
            onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            aria-label={t(lang, theme === 'light' ? 'themeDark' : 'themeLight')}
            title={t(lang, theme === 'light' ? 'themeDark' : 'themeLight')}
          >
            {theme === 'light' ? '☾' : '☀'}
          </button>
          <a className="sm-btn sm-btn-ghost sm-btn-sm" href={PHONE_HREF}>
            {t(lang, 'talkBroker')}
          </a>
        </div>
      </header>

      <main className="sm-shell">
        <SmartAdvisor lang={lang} onLangChange={changeLang} />
      </main>

      <footer className="sm-footer">
        <p>
          Wallet WCCM · AI Mortgage Strategy Advisor · <a href={PHONE_HREF}>{PHONE}</a>
        </p>
        <p className="sm-footer-license">
          <a
            className="sm-footer-corp"
            href={CORPORATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Visit West Coast Capital Mortgage"
          >
            {COMPANY.legalName}
          </a>{' '}
          · {COMPANY_LICENSE}
        </p>
        <p className="sm-footer-license">
          {INDIVIDUAL.name} · {INDIVIDUAL.title} · {INDIVIDUAL_LICENSE}
        </p>
        <p className="sm-footer-fine">
          This is for educational and planning purposes only. It is not a mortgage
          application, Loan Estimate, approval, or commitment to lend. Actual loan
          terms, rates, APR, fees, mortgage insurance, reserve requirements,
          documentation requirements, and program availability vary by lender,
          borrower profile, property, market conditions, and closing date.
        </p>
      </footer>
    </div>
  );
}

export default SmartPage;
