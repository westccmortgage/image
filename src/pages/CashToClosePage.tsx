import { Link } from 'react-router-dom';
import { CashToCloseAdvisor } from '../module';
import { californiaMortgageConfig, ADVISOR_ROUTE } from '../site/californiaMortgage';

/**
 * Full-page advisor route: /tools/cash-to-close (California Mortgage).
 *
 * Wraps the reusable <CashToCloseAdvisor/> in the host site's nav/footer so it
 * lives inside the existing californiamtg.com chrome. The advisor supplies the
 * dominant message, CTAs (Review My Cash to Close · Talk to a Mortgage Broker ·
 * Start Application), the default demo scenario, and the compliance disclaimer.
 */
export function CashToClosePage() {
  return (
    <div className="cm-page">
      <header className="cm-nav">
        <Link to="/" className="cm-brand">
          California<span>Mortgage</span>
        </Link>
        <nav className="cm-links">
          <a href="/#purchase">Purchase</a>
          <a href="/#refinance">Refinance</a>
          <a href="/#assistant">Mortgage Assistant</a>
          <Link to={ADVISOR_ROUTE} className="cm-link-accent">
            Cash to Close
          </Link>
          <a href="tel:3106865053" className="cm-nav-cta">
            (310) 686-5053
          </a>
        </nav>
      </header>

      <CashToCloseAdvisor config={californiaMortgageConfig} />

      <footer className="cm-footer">
        <div>California Mortgage</div>
        <div>Broker 01385024 · NMLS ID 2775380 · (310) 686-5053</div>
      </footer>
    </div>
  );
}

export default CashToClosePage;
