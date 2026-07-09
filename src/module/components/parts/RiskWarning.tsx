import type { RiskAssessment } from '../../types';

/**
 * Renders the below-20%-down and Non-QM/high-LTV warnings. The warning copy
 * comes straight from the deterministic risk assessment.
 */
export function RiskWarning({ risk }: { risk: RiskAssessment }) {
  if (risk.warnings.length === 0) return null;

  return (
    <div>
      {risk.warnings.map((message, i) => {
        const strong = risk.nonQmHighLtv && i === risk.warnings.length - 1;
        return (
          <div
            key={i}
            className={`ctc-warn ${strong ? 'strongwarn' : 'moderate'}`}
            role="alert"
          >
            <span className="ico" aria-hidden="true">
              {strong ? '⛔' : '⚠️'}
            </span>
            <span>
              <b>{strong ? 'Non-QM / High-LTV risk: ' : 'Below 20% down: '}</b>
              {message}
            </span>
          </div>
        );
      })}
    </div>
  );
}
