import { CashToCloseAdvisor } from '../module';
import { ShareSection } from '../site/ShareSection';
import { HERO, PHONE, PHONE_HREF, walletWccmConfig } from '../site/walletWccm';

/**
 * Root route `/` — the full Wallet WCCM AI Cash-to-Close Advisor standalone page.
 *
 * Wallet WCCM-specific content (nav, hero, realtor block, share section, footer)
 * lives here; the reusable <CashToCloseAdvisor/> module renders the dominant
 * result, warnings, inputs, AI summary, breakdown, scenarios, closing-date
 * sensitivity, CTAs, and the compliance disclaimer.
 */
export function AdvisorPage() {
  return (
    <div className="ww-page">
      {/* --- top bar --- */}
      <header className="ww-nav">
        <a className="ww-brand" href="/" aria-label="Wallet WCCM home">
          <span className="ww-brand-mark" aria-hidden="true">W</span>
          <span className="ww-brand-text">
            Wallet <b>WCCM</b>
            <small>Powered by West Coast Capital Mortgage</small>
          </span>
        </a>
        <div className="ww-nav-actions">
          <a className="ww-nav-link" href="#advisor">
            The Tool
          </a>
          <a className="ww-nav-link" href="#realtors">
            For Realtors
          </a>
          <a className="ww-btn ww-btn-primary ww-btn-sm" href={PHONE_HREF}>
            Talk to a Broker
          </a>
        </div>
      </header>

      {/* --- hero --- */}
      <section className="ww-hero">
        <div className="ww-hero-inner">
          <span className="ww-eyebrow">{HERO.brand}</span>
          <h1 className="ww-hero-title">{HERO.title}</h1>
          <p className="ww-hero-sub">{HERO.subtitle}</p>
          <p className="ww-hero-emotional">{HERO.emotional}</p>

          <div className="ww-corewarn" role="note">
            <span className="ico" aria-hidden="true">!</span>
            <span>{HERO.coreWarning}</span>
          </div>

          <div className="ww-btn-row">
            <a className="ww-btn ww-btn-primary" href="#advisor">
              Review My Scenario
            </a>
            <a className="ww-btn ww-btn-gold" href={PHONE_HREF}>
              Talk to a Mortgage Broker
            </a>
            <a className="ww-btn ww-btn-ghost" href={PHONE_HREF}>
              Start Application
            </a>
          </div>
        </div>
      </section>

      {/* --- the advisor module (header hidden; hero above provides branding) --- */}
      <CashToCloseAdvisor config={walletWccmConfig} hideHeader />

      {/* --- realtor block --- */}
      <section className="ww-shell">
        <div className="ww-card ww-realtor" id="realtors">
          <span className="ww-eyebrow">For Realtors</span>
          <h2 className="ww-h2">Send buyers to the closing table prepared.</h2>
          <p className="ww-muted">
            Before your client writes an offer, help them understand the real
            funds needed to close. Down payment is only one part of the
            transaction. This tool helps estimate closing costs, prepaids, escrow
            reserves, and the additional cash needed above the down payment.
          </p>
          <div className="ww-btn-row">
            <a className="ww-btn ww-btn-primary" href="#share">
              Share This Tool With a Buyer
            </a>
          </div>
        </div>

        <ShareSection />
      </section>

      {/* --- footer --- */}
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
