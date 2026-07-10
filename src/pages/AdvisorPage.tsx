import { AdvisorApp } from '../site/AdvisorApp';
import { PHONE, PHONE_HREF, walletWccmConfig } from '../site/walletWccm';

/**
 * Root route `/` — the Wallet WCCM AI Cash-to-Close Advisor.
 *
 * Fast, mobile-first readiness check: the hero + three number cards deliver the
 * core insight in seconds; everything heavier (full breakdown, scenarios,
 * full AI explanation) sits behind progressive-disclosure accordions inside
 * <AdvisorApp/>.
 */
export function AdvisorPage() {
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

      <AdvisorApp config={walletWccmConfig} />

      <footer className="ww-footer">
        <div className="ww-footer-inner">
          <div className="ww-footer-brand">
            Wallet WCCM · AI Cash-to-Close Advisor
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

export default AdvisorPage;
