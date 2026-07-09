import type { CashToCloseInput, LoanType, Occupancy } from '../../types';

const LOAN_TYPES: LoanType[] = ['Conventional', 'FHA', 'VA', 'Jumbo', 'Non-QM'];
const OCCUPANCIES: Occupancy[] = [
  'Primary Residence',
  'Second Home',
  'Investment Property',
];

function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
  span,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  span?: boolean;
}) {
  return (
    <div className={`ctc-field${span ? ' span-2' : ''}`}>
      <label className="ctc-label">
        {label}
        {suffix ? ` (${suffix})` : ''}
      </label>
      {prefix ? (
        <div className="ctc-input-prefix">
          <span>{prefix}</span>
          <input
            className="ctc-input"
            type="number"
            step={step}
            value={Number.isFinite(value) ? value : ''}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </div>
      ) : (
        <input
          className="ctc-input"
          type="number"
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      )}
    </div>
  );
}

/**
 * Editable inputs for the advisor. Emits partial updates; the parent owns the
 * full input state and recalculates deterministically on every change.
 */
export function InputsPanel({
  input,
  onChange,
}: {
  input: CashToCloseInput;
  onChange: (patch: Partial<CashToCloseInput>) => void;
}) {
  return (
    <div className="ctc-card ctc-card-pad-lg">
      <h3 className="ctc-section-title">Your scenario</h3>
      <p className="ctc-section-sub">
        Adjust any field — every number recalculates instantly.
      </p>

      <div className="ctc-field-grid">
        <NumberField
          label="Purchase price"
          prefix="$"
          step={1000}
          value={input.purchasePrice}
          onChange={(v) => onChange({ purchasePrice: v })}
        />
        <NumberField
          label="Down payment"
          prefix="$"
          step={1000}
          value={input.downPayment}
          onChange={(v) => onChange({ downPayment: v })}
        />
        <NumberField
          label="Interest rate"
          suffix="% note"
          step={0.125}
          value={input.interestRate}
          onChange={(v) => onChange({ interestRate: v })}
        />
        <NumberField
          label="Term"
          suffix="years"
          value={input.termYears}
          onChange={(v) => onChange({ termYears: v })}
        />

        <div className="ctc-field">
          <label className="ctc-label">Loan type / product</label>
          <select
            className="ctc-select"
            value={input.loanType}
            onChange={(e) => onChange({ loanType: e.target.value as LoanType })}
          >
            {LOAN_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="ctc-field">
          <label className="ctc-label">Occupancy</label>
          <select
            className="ctc-select"
            value={input.occupancy}
            onChange={(e) => onChange({ occupancy: e.target.value as Occupancy })}
          >
            {OCCUPANCIES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        <div className="ctc-field">
          <label className="ctc-label">State</label>
          <input
            className="ctc-input"
            value={input.state ?? ''}
            onChange={(e) => onChange({ state: e.target.value })}
          />
        </div>
        <div className="ctc-field">
          <label className="ctc-label">ZIP</label>
          <input
            className="ctc-input"
            value={input.zip ?? ''}
            onChange={(e) => onChange({ zip: e.target.value })}
          />
        </div>

        <NumberField
          label="Property taxes"
          prefix="$"
          suffix="/mo"
          step={10}
          value={input.propertyTaxMonthly}
          onChange={(v) => onChange({ propertyTaxMonthly: v })}
        />
        <NumberField
          label="Homeowner's insurance"
          prefix="$"
          suffix="/mo"
          step={10}
          value={input.hazardInsuranceMonthly}
          onChange={(v) => onChange({ hazardInsuranceMonthly: v })}
        />

        <NumberField
          label="Seller credit"
          prefix="$"
          step={500}
          value={input.sellerCredit ?? 0}
          onChange={(v) => onChange({ sellerCredit: v })}
        />
        <NumberField
          label="Lender credit"
          prefix="$"
          step={500}
          value={input.lenderCredit ?? 0}
          onChange={(v) => onChange({ lenderCredit: v })}
        />
      </div>
    </div>
  );
}
