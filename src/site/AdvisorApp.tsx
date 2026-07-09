import { useMemo, useState } from 'react';
import {
  calculateCashToClose,
  buildDownPaymentScenarios,
  generateAiSummary,
  generateAiTakeaway,
  formatMoney,
  defaultScenario,
  resolveBrandConfig,
} from '../module';
import type {
  BrandConfig,
  CashToCloseInput,
  LoanType,
} from '../module';
import { CostBreakdown } from '../module/components/parts/CostBreakdown';
import { ScenarioComparison } from '../module/components/parts/ScenarioComparison';
import { ClosingDateSensitivity } from '../module/components/parts/ClosingDateSensitivity';
import { AiSummaryPanel } from '../module/components/parts/AiSummaryPanel';
import { ShareSection } from './ShareSection';
import { HERO, PHONE_HREF } from './walletWccm';

const LOAN_TYPES: LoanType[] = ['Conventional', 'FHA', 'VA', 'Jumbo', 'Non-QM'];

/** Short, spec-mandated warning copy (full text lives behind "details"). */
const SHORT_WARNINGS = {
  belowTwenty:
    'Below 20% down may affect rate, PMI/MI, pricing adjustments, monthly payment, and verified funds needed to close.',
  nonQm:
    'Non-QM high-LTV financing may materially affect rate, pricing, mortgage insurance, approval strength, and cash to close.',
};

function Num({
  label,
  value,
  onChange,
  prefix,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  step?: number;
}) {
  return (
    <label className="ww-field">
      <span>{label}</span>
      <span className={prefix ? 'ww-input-prefix' : undefined}>
        {prefix ? <i>{prefix}</i> : null}
        <input
          type="number"
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </span>
    </label>
  );
}

export function AdvisorApp({ config: configOverrides }: { config?: Partial<BrandConfig> }) {
  const config = resolveBrandConfig(configOverrides);
  const [input, setInput] = useState<CashToCloseInput>(defaultScenario);
  const patch = (p: Partial<CashToCloseInput>) =>
    setInput((prev) => ({ ...prev, ...p }));

  const result = useMemo(() => calculateCashToClose(input), [input]);
  const scenarios = useMemo(() => buildDownPaymentScenarios(input), [input]);
  const summary = useMemo(() => generateAiSummary(result, input), [result, input]);
  const takeaway = useMemo(() => generateAiTakeaway(result, input), [result, input]);
  const baseline = useMemo(
    () =>
      calculateCashToClose({
        ...input,
        prepaidInterestDays: defaultScenario.prepaidInterestDays,
      }),
    [input],
  );

  const thirdPartyPlusGov =
    result.thirdPartyFeesTotal + result.governmentFeesTotal;
  const credits = result.sellerCredit + result.lenderCredit;

  const formulaRows = [
    { op: '', label: 'Down payment', amount: result.downPayment },
    { op: '+', label: 'Loan / lender fees', amount: result.lenderFeesTotal },
    { op: '+', label: 'Title / escrow / third-party', amount: thirdPartyPlusGov },
    { op: '+', label: 'Prepaids / taxes / insurance', amount: result.prepaidsAndEscrowTotal },
    { op: '−', label: 'Credits', amount: credits },
  ];

  return (
    <div className="ww-app" id="top">
      {/* ---------- HERO (above the fold) ---------- */}
      <section className="ww-hero2">
        <p className="ww-kicker">
          {HERO.brand} · AI Cash-to-Close Advisor
        </p>
        <h1 className="ww-core">Your down payment is not your cash to close.</h1>

        <div className="ww-cards">
          <div className="ww-numcard">
            <span className="k">Down payment</span>
            <span className="v">{formatMoney(result.downPayment)}</span>
          </div>
          <div className="ww-numcard is-primary">
            <span className="k">Estimated cash to close</span>
            <span className="v">{formatMoney(result.totalCashToClose)}</span>
          </div>
          <div className="ww-numcard is-extra">
            <span className="k">Extra needed</span>
            <span className="v">{formatMoney(result.additionalFundsNeeded)}</span>
          </div>
        </div>

        <p className="ww-hero2-line">
          Before writing an offer, make sure the buyer has the full cash needed
          to close — not only the down payment.
        </p>

        <div className="ww-btn-row">
          <a className="ww-btn ww-btn-primary" href="#quick">
            Review My Scenario
          </a>
          <a className="ww-btn ww-btn-outline" href="#share">
            Share With Buyer
          </a>
        </div>
      </section>

      {/* ---------- Plain-language result ---------- */}
      <section className="ww-restate">
        <p>
          You think you need <b>{formatMoney(result.downPayment)}</b>. You may
          actually need about <b>{formatMoney(result.totalCashToClose)}</b> — about{' '}
          <b>{formatMoney(result.additionalFundsNeeded)}</b> more than your down
          payment.
        </p>
      </section>

      {/* ---------- Quick inputs ---------- */}
      <section className="ww-panel" id="quick">
        <h2 className="ww-panel-h">Your scenario</h2>
        <div className="ww-quickgrid">
          <Num
            label="Purchase price"
            prefix="$"
            step={1000}
            value={input.purchasePrice}
            onChange={(v) => patch({ purchasePrice: v })}
          />
          <Num
            label="Down payment"
            prefix="$"
            step={1000}
            value={input.downPayment}
            onChange={(v) => patch({ downPayment: v })}
          />
          <label className="ww-field">
            <span>Loan type</span>
            <span>
              <select
                value={input.loanType}
                onChange={(e) => patch({ loanType: e.target.value as LoanType })}
              >
                {LOAN_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <Num
            label="Interest rate %"
            step={0.125}
            value={input.interestRate}
            onChange={(v) => patch({ interestRate: v })}
          />
          <label className="ww-field">
            <span>State</span>
            <span>
              <input
                value={input.state ?? ''}
                onChange={(e) => patch({ state: e.target.value })}
              />
            </span>
          </label>
          <label className="ww-field">
            <span>ZIP</span>
            <span>
              <input
                value={input.zip ?? ''}
                onChange={(e) => patch({ zip: e.target.value })}
              />
            </span>
          </label>
        </div>

        <details className="ww-acc">
          <summary>Advanced assumptions</summary>
          <div className="ww-quickgrid ww-mt">
            <Num
              label="Property taxes /mo"
              prefix="$"
              step={10}
              value={input.propertyTaxMonthly}
              onChange={(v) => patch({ propertyTaxMonthly: v })}
            />
            <Num
              label="Homeowner insurance /mo"
              prefix="$"
              step={10}
              value={input.hazardInsuranceMonthly}
              onChange={(v) => patch({ hazardInsuranceMonthly: v })}
            />
            <Num
              label="Seller credit"
              prefix="$"
              step={500}
              value={input.sellerCredit ?? 0}
              onChange={(v) => patch({ sellerCredit: v })}
            />
            <Num
              label="Lender credit"
              prefix="$"
              step={500}
              value={input.lenderCredit ?? 0}
              onChange={(v) => patch({ lenderCredit: v })}
            />
            <Num
              label="Prepaid interest days"
              step={1}
              value={input.prepaidInterestDays}
              onChange={(v) => patch({ prepaidInterestDays: v })}
            />
          </div>
          <p className="ww-note ww-mt">
            Lender, third-party, government, and escrow-reserve fee assumptions
            follow this program's defaults. See the full breakdown for line items.
          </p>
        </details>
      </section>

      {/* ---------- AI Takeaway ---------- */}
      <section className="ww-panel">
        <h2 className="ww-panel-h">
          AI Takeaway <span className="ww-tag">beta</span>
        </h2>
        <ul className="ww-bullets">
          {takeaway.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
        <details className="ww-acc ww-acc-inline">
          <summary>Explain more</summary>
          <div className="ww-mt">
            <p className="ww-explain">{summary.keyTakeaway}</p>
            {summary.sections.slice(1, 4).map((s) => (
              <p className="ww-explain" key={s.id}>
                <b>{s.title}. </b>
                {s.body}
              </p>
            ))}
          </div>
        </details>
      </section>

      {/* ---------- Visual formula ---------- */}
      <section className="ww-panel">
        <h2 className="ww-panel-h">How the cash to close adds up</h2>
        <div className="ww-formula">
          {formulaRows.map((r, i) => (
            <div className="ww-frow" key={i}>
              <span className="op">{r.op || ' '}</span>
              <span className="fl">{r.label}</span>
              <span className="fa">
                {r.op === '−' && r.amount > 0 ? '−' : ''}
                {formatMoney(r.amount)}
              </span>
            </div>
          ))}
          <div className="ww-frow is-total">
            <span className="op">=</span>
            <span className="fl">Estimated cash to close</span>
            <span className="fa">{formatMoney(result.totalCashToClose)}</span>
          </div>
        </div>
        <details className="ww-acc ww-acc-inline">
          <summary>Show full breakdown</summary>
          <div className="ctc-root ww-mt">
            <CostBreakdown result={result} />
          </div>
        </details>
      </section>

      {/* ---------- Short warnings ---------- */}
      {(result.risk.belowTwentyDown || result.risk.nonQmHighLtv) && (
        <section className="ww-panel ww-warns">
          {result.risk.belowTwentyDown && (
            <details className="ww-warn">
              <summary>
                <span className="wico">!</span>
                {SHORT_WARNINGS.belowTwenty}
              </summary>
              <p className="ww-mt ww-explain">{result.risk.warnings[0]}</p>
            </details>
          )}
          {result.risk.nonQmHighLtv && (
            <details className="ww-warn is-strong">
              <summary>
                <span className="wico">!</span>
                {SHORT_WARNINGS.nonQm}
              </summary>
              <p className="ww-mt ww-explain">
                {result.risk.warnings[result.risk.warnings.length - 1]}
              </p>
            </details>
          )}
        </section>
      )}

      {/* ---------- Primary CTAs ---------- */}
      <section className="ww-cta-block">
        <a className="ww-btn ww-btn-primary" href="#quick">
          Review My Scenario
        </a>
        <a className="ww-btn ww-btn-outline" href="#share">
          Share With Buyer
        </a>
        <a className="ww-btn ww-btn-outline" href={PHONE_HREF}>
          Talk to a Mortgage Broker
        </a>
      </section>

      {/* ---------- Realtor share ---------- */}
      <section className="ww-panel ww-realtor2">
        <span className="ww-kicker">For realtors</span>
        <ShareSection
          title="Send this before your buyer writes an offer."
          subtitle="Down payment is only one part of the cash needed at closing."
        />
      </section>

      {/* ---------- Full report (collapsed) ---------- */}
      <section className="ww-panel">
        <details className="ww-acc">
          <summary>Full calculation report</summary>
          <div className="ctc-root ww-report ww-mt">
            <AiSummaryPanel summary={summary} />
            <ScenarioComparison
              scenarios={scenarios}
              highlightPercent={[10, 15, 20, 25].find(
                (p) => Math.abs(result.downPaymentPercent - p) < 0.5,
              )}
            />
            <ClosingDateSensitivity
              days={input.prepaidInterestDays}
              onDaysChange={(d) => patch({ prepaidInterestDays: d })}
              prepaidInterest={result.prepaidInterest}
              totalCashToClose={result.totalCashToClose}
              baselineDays={defaultScenario.prepaidInterestDays}
              baselineCashToClose={baseline.totalCashToClose}
            />
          </div>
        </details>
      </section>

      {/* ---------- Start Application (lower) ---------- */}
      <section className="ww-cta-block ww-apply">
        <a className="ww-btn ww-btn-ghost2" href={config.applyHref ?? PHONE_HREF}>
          Start Application
        </a>
      </section>

      {/* ---------- Compact disclaimer ---------- */}
      <p className="ww-fineprint">{config.disclosureText}</p>

      {/* ---------- Sticky mobile CTA ---------- */}
      <a className="ww-sticky" href="#quick">
        Review My Scenario
      </a>
    </div>
  );
}

export default AdvisorApp;
