import { useMemo, useState } from 'react';
import '../styles/advisor.css';
import type { CashToCloseInput } from '../types';
import type { BrandConfig } from '../brand';
import { resolveBrandConfig } from '../brand';
import { defaultScenario } from '../fixtures/defaultScenario';
import {
  calculateCashToClose,
  buildDownPaymentScenarios,
} from '../calc/cashToCloseCalculations';
import { generateAiSummary } from '../ai/aiCashToCloseSummary';

import { InputsPanel } from './parts/InputsPanel';
import { ResultCard } from './parts/ResultCard';
import { RiskWarning } from './parts/RiskWarning';
import { AiSummaryPanel } from './parts/AiSummaryPanel';
import { CostBreakdown } from './parts/CostBreakdown';
import { ScenarioComparison } from './parts/ScenarioComparison';
import { ClosingDateSensitivity } from './parts/ClosingDateSensitivity';
import { CtaBar } from './parts/CtaBar';
import { buildCtas } from './parts/ctaActions';
import { Disclaimer } from './parts/Disclaimer';
import { LeadForm } from './parts/LeadForm';

export interface CashToCloseAdvisorProps {
  /** Per-site brand / CTA / disclosure configuration. */
  config?: Partial<BrandConfig>;
  /** Starting scenario. Defaults to the canonical demo scenario. */
  initialInput?: CashToCloseInput;
  /** Hide the internal page header (when the host page provides its own). */
  hideHeader?: boolean;
}

/**
 * Full-page AI Cash-to-Close Advisor. Self-contained and reusable: pass a
 * `config` to rebrand it for any site. All math is deterministic; the AI
 * summary is generated locally from the computed result.
 */
export function CashToCloseAdvisor({
  config: configOverrides,
  initialInput = defaultScenario,
  hideHeader = false,
}: CashToCloseAdvisorProps) {
  const config = resolveBrandConfig(configOverrides);
  const [input, setInput] = useState<CashToCloseInput>(initialInput);

  const patch = (p: Partial<CashToCloseInput>) =>
    setInput((prev) => ({ ...prev, ...p }));

  const result = useMemo(() => calculateCashToClose(input), [input]);
  const scenarios = useMemo(() => buildDownPaymentScenarios(input), [input]);
  const summary = useMemo(
    () => generateAiSummary(result, input),
    [result, input],
  );

  // Baseline for the closing-date impact readout = the initial scenario's days.
  const baseline = useMemo(
    () =>
      calculateCashToClose({
        ...input,
        prepaidInterestDays: initialInput.prepaidInterestDays,
      }),
    [input, initialInput.prepaidInterestDays],
  );

  const ctas = buildCtas(config);

  // Which scenario row matches the current down payment (for highlighting).
  const highlightPercent = [10, 15, 20, 25].find(
    (p) => Math.abs(result.downPaymentPercent - p) < 0.5,
  );

  return (
    <div className="ctc-root">
      <div className="ctc-shell" id="advisor">
        {!hideHeader && (
          <header className="ctc-header">
            <span className="ctc-eyebrow">{config.brandName}</span>
            <h1 className="ctc-title">Real Cash to Close Strategy Tool</h1>
            <p className="ctc-subtitle">
              Your down payment is not your total cash needed to close. See the
              real number — and the strategy to fund it
              {config.stateFocus ? ` in ${config.stateFocus}` : ''}.
            </p>
            {config.altLabel && (
              <span className="ctc-alt-label">{config.brandName}</span>
            )}
          </header>
        )}

        <div className="ctc-stack">
          {/* Dominant result */}
          <ResultCard result={result} />

          {/* Warnings */}
          <RiskWarning risk={result.risk} />

          {/* Inputs + AI summary */}
          <div className="ctc-grid ctc-grid-2">
            <InputsPanel input={input} onChange={patch} />
            <AiSummaryPanel summary={summary} />
          </div>

          {/* CTAs */}
          <div className="ctc-card">
            <CtaBar actions={ctas} />
          </div>

          {/* Full breakdown */}
          <div id="breakdown">
            <CostBreakdown result={result} />
          </div>

          {/* Scenario comparison */}
          <div id="scenarios">
            <ScenarioComparison
              scenarios={scenarios}
              highlightPercent={highlightPercent}
            />
          </div>

          {/* Closing date sensitivity */}
          <ClosingDateSensitivity
            days={input.prepaidInterestDays}
            onDaysChange={(d) => patch({ prepaidInterestDays: d })}
            prepaidInterest={result.prepaidInterest}
            totalCashToClose={result.totalCashToClose}
            baselineDays={initialInput.prepaidInterestDays}
            baselineCashToClose={baseline.totalCashToClose}
          />

          {/* Seller-credit strategy anchor + lead form */}
          <div id="credits">
            {config.showLeadForm ? (
              <LeadForm config={config} />
            ) : (
              <div className="ctc-card ctc-card-pad-lg">
                <h3 className="ctc-section-title">
                  Estimate seller credit needed
                </h3>
                <p className="ctc-section-sub" style={{ marginBottom: 0 }}>
                  A seller credit reduces your cash to close dollar-for-dollar. To
                  fully cover the{' '}
                  <strong>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      maximumFractionDigits: 0,
                    }).format(result.additionalFundsNeeded)}
                  </strong>{' '}
                  of costs above your down payment, you'd negotiate a credit up to
                  that amount (subject to program limits). A broker can confirm the
                  maximum allowed for your loan type.
                </p>
              </div>
            )}
          </div>

          <Disclaimer config={config} />
        </div>
      </div>
    </div>
  );
}

export default CashToCloseAdvisor;
