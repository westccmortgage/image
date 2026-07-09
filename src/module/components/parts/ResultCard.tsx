import type { CashToCloseResult } from '../../types';
import { formatMoney, formatPercent } from '../../calc/format';
import { RiskBadge } from './RiskBadge';

/**
 * The visually dominant "main result" card — the core message of the module.
 */
export function ResultCard({ result }: { result: CashToCloseResult }) {
  const { downPayment, totalCashToClose, additionalFundsNeeded } = result;

  return (
    <div className="ctc-hero">
      <div className="ctc-hero-label">Your real cash to close</div>
      <p className="ctc-hero-statement">
        Your down payment is <strong>{formatMoney(downPayment)}</strong>, but your
        estimated cash needed to close is{' '}
        <strong>{formatMoney(totalCashToClose)}</strong>. You may need approximately{' '}
        <strong>{formatMoney(additionalFundsNeeded)}</strong> more than your down
        payment.
      </p>

      <div className="ctc-hero-figs">
        <div className="ctc-hero-fig">
          <div className="k">Down payment</div>
          <div className="v">{formatMoney(downPayment)}</div>
        </div>
        <div className="ctc-hero-fig accent">
          <div className="k">Cash to close</div>
          <div className="v">{formatMoney(totalCashToClose)}</div>
        </div>
        <div className="ctc-hero-fig">
          <div className="k">Funds above down pmt</div>
          <div className="v">{formatMoney(additionalFundsNeeded)}</div>
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <RiskBadge risk={result.risk} />
        <span style={{ fontSize: 13, color: 'var(--ctc-on-dark-soft)' }}>
          LTV {formatPercent(result.ltv)} · {formatPercent(result.downPaymentPercent)} down
        </span>
      </div>
    </div>
  );
}
