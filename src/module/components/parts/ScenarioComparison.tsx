import type { DownPaymentScenario } from '../../types';
import { formatMoney, formatPercent } from '../../calc/format';
import { RiskBadge } from './RiskBadge';

/**
 * Down-payment comparison table (10 / 15 / 20 / 25% down). Uses only safe
 * qualitative labels for rate/pricing — never invented lender rates.
 */
export function ScenarioComparison({
  scenarios,
  highlightPercent,
}: {
  scenarios: DownPaymentScenario[];
  highlightPercent?: number;
}) {
  return (
    <div className="ctc-card ctc-card-pad-lg">
      <h3 className="ctc-section-title">Compare down payment options</h3>
      <p className="ctc-section-sub">
        How 10%, 15%, 20% and 25% down change your leverage, risk, and cash to
        close. Rate/pricing impacts are shown as qualitative labels — not quoted
        rates.
      </p>

      <div className="ctc-table-wrap">
        <table className="ctc-table">
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Down payment</th>
              <th>Loan amount</th>
              <th>LTV</th>
              <th>Risk level</th>
              <th>PMI / MI</th>
              <th>Rate impact</th>
              <th>Est. monthly</th>
              <th>Est. cash to close</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => (
              <tr
                key={s.label}
                className={
                  highlightPercent === s.downPaymentPercent ? 'row-highlight' : ''
                }
              >
                <td>
                  {s.label}
                  <div style={{ fontSize: 11, color: 'var(--ctc-slate-400)' }}>
                    {s.profileLabel}
                  </div>
                </td>
                <td className="num">{formatMoney(s.downPayment)}</td>
                <td className="num">{formatMoney(s.loanAmount)}</td>
                <td className="num">{formatPercent(s.ltv)}</td>
                <td>
                  <RiskBadge risk={s.risk} />
                </td>
                <td>{s.pmiLabel}</td>
                <td>{s.rateImpactLabel}</td>
                <td className="num">{formatMoney(s.estimatedMonthlyPayment)}</td>
                <td className="num">{formatMoney(s.estimatedCashToClose)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
