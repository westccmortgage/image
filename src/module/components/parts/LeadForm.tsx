import { useState } from 'react';
import type { BrandConfig } from '../../brand';

/** Optional inline lead-capture form (enabled via config.showLeadForm). */
export function LeadForm({ config }: { config: BrandConfig }) {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="ctc-card ctc-card-pad-lg" id="contact">
      <h3 className="ctc-section-title">Talk to a mortgage broker</h3>
      <p className="ctc-section-sub">
        Get a personalized cash-to-close strategy
        {config.stateFocus ? ` for ${config.stateFocus}` : ''}. No obligation.
      </p>

      {submitted ? (
        <div className="ctc-warn moderate" role="status">
          <span className="ico" aria-hidden="true">✅</span>
          <span>Thanks — a licensed broker will reach out shortly.</span>
        </div>
      ) : (
        <form
          className="ctc-lead"
          action={config.leadFormAction}
          method="post"
          onSubmit={(e) => {
            if (!config.leadFormAction) {
              e.preventDefault();
              setSubmitted(true);
            }
          }}
        >
          <div className="ctc-lead-row">
            <input className="ctc-input" name="name" placeholder="Full name" required />
            <input className="ctc-input" name="phone" placeholder="Phone" required />
          </div>
          <input className="ctc-input" name="email" type="email" placeholder="Email" required />
          <textarea
            className="ctc-input"
            name="notes"
            rows={3}
            placeholder="Purchase price, timeline, questions…"
          />
          <button className="ctc-btn ctc-btn-gold" type="submit">
            Request my strategy
          </button>
        </form>
      )}
    </div>
  );
}
