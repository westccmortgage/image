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
        {/* Brand block: the logo itself is NOT a link; only the corporate
            company name below is clickable. */}
        <div className="sm-brand">
          <svg className="sm-logo" viewBox="0 0 48 54" fill="none" aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id="wccmShield" x1="6" y1="4" x2="42" y2="50" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#5b93f2" />
                <stop offset="0.55" stopColor="#2c5fce" />
                <stop offset="1" stopColor="#1a3ea6" />
              </linearGradient>
            </defs>
            <path
              d="M8 7 Q8 4.5 10.5 4.5 L37.5 4.5 Q40 4.5 40 7 L40 30 Q40 41 24 49.5 Q8 41 8 30 Z"
              fill="url(#wccmShield)"
              stroke="#16357f"
              strokeWidth="1.4"
            />
            <path d="M11 8.5 Q11 7 12.5 7 L35.5 7 Q37 7 37 8.5 L37 15 L11 15 Z" fill="#ffffff" opacity="0.14" />
            <path d="M13 25 Q24 20 35 27" stroke="#16357f" strokeWidth="2" fill="none" opacity="0.55" strokeLinecap="round" />
            <path d="M24 14.5 L34 23 L34 24 L14 24 L14 23 Z" fill="#ffffff" />
            <rect x="17" y="13" width="2.6" height="6" fill="#ffffff" />
            <rect x="16.5" y="24" width="15" height="10.5" fill="#ffffff" />
            <rect x="20.5" y="26.5" width="7" height="6" rx="0.6" fill="#1f49bd" />
            <rect x="23.6" y="26.5" width="0.9" height="6" fill="#ffffff" />
            <rect x="20.5" y="29.2" width="7" height="0.9" fill="#ffffff" />
          </svg>
          <span className="sm-brand-text">
            WALLET <b>WCCM</b>
            <small>
              Powered by{' '}
              <a
                className="sm-corp-link"
                href={CORPORATE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit West Coast Capital Mortgage corporate website"
                title="Visit West Coast Capital Mortgage"
              >
                West Coast Capital Mortgage Inc.<span className="sm-corp-arrow" aria-hidden="true">→</span>
              </a>
            </small>
          </span>
        </div>
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
