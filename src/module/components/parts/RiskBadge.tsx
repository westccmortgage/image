import type { RiskAssessment } from '../../types';

/** Small pill showing the LTV risk tier. */
export function RiskBadge({ risk }: { risk: RiskAssessment }) {
  return <span className={`ctc-badge ${risk.tier}`}>{risk.label}</span>;
}
