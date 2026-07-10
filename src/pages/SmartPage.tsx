import { useEffect, useState } from 'react';
import { SmartAdvisor } from '../site/SmartAdvisor';
import { PHONE, PHONE_HREF } from '../site/walletWccm';

type Theme = 'light' | 'dark';

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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('ww-theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  return (
    <div className="sm-page" id="top">
      <header className="sm-nav">
        <a className="sm-brand" href="/" aria-label="Wallet WCCM home">
          <span className="sm-brand-mark" aria-hidden="true" />
          <span className="sm-brand-text">
            WALLET <b>WCCM</b>
            <small>Powered by West Coast Capital Mortgage</small>
          </span>
        </a>
        <div className="sm-nav-actions">
          <button
            type="button"
            className="sm-toggle"
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '☾' : '☀'}
          </button>
          <a className="sm-btn sm-btn-ghost sm-btn-sm" href={PHONE_HREF}>
            Talk to a Broker
          </a>
        </div>
      </header>

      <main className="sm-shell">
        <SmartAdvisor />
      </main>

      <footer className="sm-footer">
        <p>
          Wallet WCCM · AI Mortgage Strategy Advisor · Powered by West Coast Capital
          Mortgage · NMLS ID 2775380 · <a href={PHONE_HREF}>{PHONE}</a>
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
