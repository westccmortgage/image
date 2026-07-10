import { SmartAdvisor } from '../site/SmartAdvisor';
import { PHONE, PHONE_HREF } from '../site/walletWccm';

/**
 * The unified Wallet WCCM smart site — one page where the AI console and the
 * live cash-to-close engine are the same machine.
 */
export function SmartPage() {
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
        <a className="sm-btn sm-btn-ghost sm-btn-sm" href={PHONE_HREF}>
          Talk to a Broker
        </a>
      </header>

      <main className="sm-shell">
        <SmartAdvisor />
      </main>

      <footer className="sm-footer">
        Wallet WCCM · AI Cash-to-Close Engine · Powered by West Coast Capital
        Mortgage · NMLS ID 2775380 · <a href={PHONE_HREF}>{PHONE}</a>
      </footer>
    </div>
  );
}

export default SmartPage;
