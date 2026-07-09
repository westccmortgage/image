import { formatMoneyExact } from '../../calc/format';

/**
 * Closing-date sensitivity control. Adjusts prepaid-interest days and shows how
 * prepaid interest — and therefore cash to close — changes.
 */
export function ClosingDateSensitivity({
  days,
  onDaysChange,
  prepaidInterest,
  totalCashToClose,
  baselineDays,
  baselineCashToClose,
}: {
  days: number;
  onDaysChange: (days: number) => void;
  prepaidInterest: number;
  totalCashToClose: number;
  baselineDays: number;
  baselineCashToClose: number;
}) {
  const delta = totalCashToClose - baselineCashToClose;
  const deltaLabel =
    delta === 0
      ? 'No change vs. baseline'
      : `${delta > 0 ? '+' : '−'}${formatMoneyExact(Math.abs(delta))} vs. ${baselineDays}-day baseline`;

  return (
    <div className="ctc-card ctc-card-pad-lg">
      <h3 className="ctc-section-title">Closing date sensitivity</h3>
      <p className="ctc-section-sub">
        Prepaid (per-diem) interest is charged from your closing date to the first
        of the next month. Closing later in the month lowers it.
      </p>

      <div className="ctc-slider-row">
        <input
          className="ctc-slider"
          type="range"
          min={0}
          max={31}
          step={1}
          value={days}
          onChange={(e) => onDaysChange(Number(e.target.value))}
          aria-label="Prepaid interest days"
        />
        <span className="ctc-slider-val">{days} days</span>
      </div>

      <div className="ctc-slider-impact">
        <span className="lbl">Prepaid interest</span>
        <span className="val">{formatMoneyExact(prepaidInterest)}</span>
      </div>
      <div className="ctc-slider-impact">
        <span className="lbl">Estimated cash to close</span>
        <span className="val">{formatMoneyExact(totalCashToClose)}</span>
      </div>
      <div className="ctc-slider-impact">
        <span className="lbl">Impact</span>
        <span className="val" style={{ color: delta > 0 ? '#b42318' : '#0f7b57' }}>
          {deltaLabel}
        </span>
      </div>
    </div>
  );
}
