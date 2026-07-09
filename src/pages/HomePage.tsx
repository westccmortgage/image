import { Link } from 'react-router-dom';
import { CashToCloseWidget } from '../module';
import type { BrandConfig } from '../module';

const wccmConfig: Partial<BrandConfig> = {
  brandName: 'West Coast Capital Mortgage',
  stateFocus: 'California',
  primaryCTA: { label: 'See My Real Cash to Close', href: '/tools/cash-to-close' },
  contactCTA: { label: 'Talk to a Broker', href: 'tel:3106865053' },
};

/**
 * Demo homepage showing the EMBEDDED WIDGET MODE dropped into an existing page.
 * Everything outside the widget represents the host site's own content.
 */
export function HomePage() {
  return (
    <div className="demo-page">
      {/* --- host site's own nav (placeholder) --- */}
      <header className="demo-nav">
        <div className="demo-brand">West Coast Capital Mortgage</div>
        <nav className="demo-links">
          <a href="#loans">Loans</a>
          <a href="#about">About</a>
          <Link to="/tools/cash-to-close">Cash-to-Close Advisor</Link>
        </nav>
      </header>

      <section className="demo-hero">
        <h1>Boutique mortgage strategy for serious buyers.</h1>
        <p>
          Jumbo, Non-QM, and high-balance financing across California and the
          West Coast — structured around your real numbers.
        </p>
      </section>

      {/* --- EMBEDDED WIDGET dropped into the homepage --- */}
      <section className="demo-section">
        <CashToCloseWidget
          config={wccmConfig}
          advisorHref="/tools/cash-to-close"
        />
      </section>

      <section className="demo-section demo-muted" id="loans">
        <p>
          ↑ The navy band above is the reusable <strong>CashToCloseWidget</strong>{' '}
          in <em>embedded mode</em>. It can be inserted into any existing page.
          The <strong>Review My Cash to Close</strong> button routes to the full
          advisor at <code>/tools/cash-to-close</code>.
        </p>
      </section>

      <footer className="demo-footer">
        West Coast Capital Mortgage · Broker 01385024 · NMLS ID 2775380 · (310)
        686-5053
      </footer>
    </div>
  );
}

export default HomePage;
