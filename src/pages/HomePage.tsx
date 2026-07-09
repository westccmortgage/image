import { Link } from 'react-router-dom';
import { CashToCloseWidget } from '../module';
import { BrandMark } from '../site/BrandMark';
import {
  californiaMortgageConfig,
  HOMEPAGE_WIDGET_HEADLINE,
  HOMEPAGE_WIDGET_SUBTEXT,
  ADVISOR_ROUTE,
} from '../site/californiaMortgage';

/**
 * California Mortgage (californiamtg.com) homepage — the host site.
 *
 * The only module code here is the <CashToCloseWidget/> embedded band below the
 * hero, next to the mortgage assistant section. Everything else is host-site
 * chrome and represents the existing site.
 */
export function HomePage() {
  return (
    <div className="cm-page">
      {/* --- site nav (with the new "Cash to Close" link) --- */}
      <header className="cm-nav">
        <BrandMark />
        <nav className="cm-links">
          <a href="#purchase">Purchase</a>
          <a href="#refinance">Refinance</a>
          <a href="#assistant">Mortgage Assistant</a>
          <Link to={ADVISOR_ROUTE} className="cm-link-accent">
            Cash to Close
          </Link>
          <a href="tel:3106865053" className="cm-nav-cta">
            Get Pre-Approved
          </a>
        </nav>
      </header>

      {/* --- hero --- */}
      <section className="cm-hero">
        <div className="cm-hero-inner">
          <span className="cm-eyebrow">California Mortgage Concierge</span>
          <h1>
            Mortgage guidance <span className="accent">starts here.</span>
          </h1>
          <p>
            Purchase, refinance, jumbo, and Non-QM financing — structured around
            your real numbers, not a generic quote. Know exactly what it takes to
            close before you write an offer.
          </p>
          <div className="cm-hero-cta">
            <Link className="cm-btn cm-btn-primary" to={ADVISOR_ROUTE}>
              Estimate My Cash to Close
            </Link>
            <a className="cm-btn cm-btn-ghost" href="tel:3106865053">
              Talk to a Mortgage Broker
            </a>
          </div>
        </div>
      </section>

      {/* --- EMBEDDED WIDGET: below the hero, near the mortgage assistant --- */}
      <section className="cm-section" id="cash-to-close">
        <CashToCloseWidget
          config={californiaMortgageConfig}
          advisorHref={ADVISOR_ROUTE}
          headline={HOMEPAGE_WIDGET_HEADLINE}
          subtext={HOMEPAGE_WIDGET_SUBTEXT}
          hideSecondaryCta
        />
      </section>

      {/* --- mortgage assistant section (existing host content) --- */}
      <section className="cm-section cm-assistant" id="assistant">
        <div className="cm-assistant-grid">
          <div>
            <span className="cm-eyebrow">Mortgage Assistant</span>
            <h2>Guidance at every step — from pre-approval to closing.</h2>
            <p>
              Our team and tools walk you through program selection, rate
              strategy, and the full cost of closing so there are no surprises at
              the table.
            </p>
            <Link className="cm-btn cm-btn-primary" to={ADVISOR_ROUTE}>
              Estimate My Cash to Close
            </Link>
          </div>
          <ul className="cm-assistant-list">
            <li>Purchase & refinance strategy</li>
            <li>Jumbo & Non-QM financing</li>
            <li>Real cash-to-close planning</li>
            <li>Seller & lender credit guidance</li>
          </ul>
        </div>
      </section>

      <footer className="cm-footer">
        <div className="cm-footer-inner">
          <div>California Mortgage</div>
          <div>Broker 01385024 · NMLS ID 2775380 · (310) 686-5053</div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
