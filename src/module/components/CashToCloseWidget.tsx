import { useMemo } from 'react';
import '../styles/advisor.css';
import type { CashToCloseInput } from '../types';
import type { BrandConfig } from '../brand';
import { resolveBrandConfig } from '../brand';
import { defaultScenario } from '../fixtures/defaultScenario';
import { calculateCashToClose } from '../calc/cashToCloseCalculations';
import { formatMoney } from '../calc/format';

export interface CashToCloseWidgetProps {
  /** Per-site brand / CTA configuration. */
  config?: Partial<BrandConfig>;
  /** Scenario used for the teaser figures. Defaults to the demo scenario. */
  input?: CashToCloseInput;
  /**
   * Where the "See my full cash to close" button links (the full-page route).
   * Defaults to /tools/cash-to-close.
   */
  advisorHref?: string;
}

/**
 * Compact, embeddable homepage / landing-page band. Drops into any existing
 * page as a single section. Shows the core message + a live teaser of the
 * down-payment-vs-cash-to-close gap, then routes to the full advisor.
 */
export function CashToCloseWidget({
  config: configOverrides,
  input = defaultScenario,
  advisorHref = '/tools/cash-to-close',
}: CashToCloseWidgetProps) {
  const config = resolveBrandConfig(configOverrides);
  const result = useMemo(() => calculateCashToClose(input), [input]);

  return (
    <div className="ctc-root">
      <section className="ctc-widget" aria-label="AI Cash-to-Close Advisor">
        <div className="ctc-widget-inner">
          <div>
            <div className="ctc-widget-eyebrow">{config.brandName}</div>
            <h2 className="ctc-widget-h">
              Your down payment is not your total cash needed to close.
            </h2>
            <p className="ctc-widget-p">
              The AI Cash-to-Close Advisor shows the real cash you need at the
              table — lender fees, third-party fees, prepaids, taxes, insurance,
              and escrow reserves — plus the strategy to fund the gap
              {config.stateFocus ? ` in ${config.stateFocus}` : ''}.
            </p>
            <div className="ctc-widget-cta">
              <a className="ctc-btn ctc-btn-gold" href={advisorHref}>
                {config.primaryCTA.label}
              </a>
              <a
                className="ctc-btn ctc-btn-ghost"
                href={config.contactCTA.href ?? '#contact'}
              >
                {config.contactCTA.label}
              </a>
            </div>
          </div>

          <div className="ctc-widget-card">
            <div className="cap">Example scenario · {config.stateFocus ?? 'sample'}</div>
            <div className="ctc-widget-figrow">
              <span className="k">Down payment</span>
              <span className="v">{formatMoney(result.downPayment)}</span>
            </div>
            <div className="ctc-widget-figrow">
              <span className="k">Estimated cash to close</span>
              <span className="v">{formatMoney(result.totalCashToClose)}</span>
            </div>
            <div className="ctc-widget-figrow gap">
              <span className="k">Needed above down payment</span>
              <span className="v">{formatMoney(result.additionalFundsNeeded)}</span>
            </div>
          </div>
        </div>
        <p className="ctc-widget-note">
          Educational estimate only — not a Loan Estimate or commitment to lend.
        </p>
      </section>
    </div>
  );
}

export default CashToCloseWidget;
