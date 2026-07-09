import type { AiSummary } from '../../ai/aiCashToCloseSummary';

/** Renders the AI Strategy Summary produced by the local mock generator. */
export function AiSummaryPanel({ summary }: { summary: AiSummary }) {
  return (
    <div className="ctc-ai">
      <div className="ctc-ai-head">
        <span className="ctc-ai-badge">
          <span className="ctc-ai-dot" aria-hidden="true" />
          AI Strategy Summary
        </span>
      </div>

      <h3 className="ctc-ai-headline">{summary.headline}</h3>
      <p className="ctc-ai-takeaway">{summary.keyTakeaway}</p>

      <div className="ctc-ai-sections">
        {summary.sections.map((section) => (
          <div className="ctc-ai-item" key={section.id}>
            <h4>{section.title}</h4>
            <p>{section.body}</p>
          </div>
        ))}
      </div>

      <p className="ctc-nmls" style={{ marginTop: 16 }}>
        {summary.generatedBy}
      </p>
    </div>
  );
}
