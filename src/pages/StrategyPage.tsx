import { StrategyAdvisor } from '../site/StrategyAdvisor';
import { PHONE, PHONE_HREF } from '../site/walletWccm';

/**
 * `/strategy` — the AI Mortgage Strategy Advisor: a progressive, conversational
 * intake that builds a live Scenario Profile and captures a lead. Distinct from
 * the fast calculator at `/`.
 */
export function StrategyPage() {
  return (
    <div className="ww-page ww-theme">
      <header className="ww-nav">
        <a className="ww-brand" href="/" aria-label="Wallet WCCM home">
          <span className="ww-brand-text">
            wallet wccm<small>Powered by West Coast Capital Mortgage</small>
          </span>
        </a>
        <a className="ww-btn ww-btn-primary ww-btn-sm" href={PHONE_HREF}>
          Talk to a Broker
        </a>
      </header>

      <main className="sa-shell">
        <StrategyAdvisor />
      </main>

      <footer className="ww-footer">
        <div className="ww-footer-inner">
          <div className="ww-footer-brand">
            Wallet WCCM · AI Mortgage Strategy Advisor
          </div>
          <div>
            Powered by West Coast Capital Mortgage · Broker 01385024 · NMLS ID
            2775380 · <a href={PHONE_HREF}>{PHONE}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default StrategyPage;
