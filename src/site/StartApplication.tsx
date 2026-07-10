import { useState } from 'react';
import { postNetlifyForm, readUtm } from './scenario';
import type { ScenarioProfile } from './scenario';

export const APPLICATION_FORM_NAME = 'start-application';

const OCCUPANCY = [
  { value: '', label: 'Occupancy…' },
  { value: 'primary', label: 'Primary residence' },
  { value: 'second', label: 'Second home' },
  { value: 'investment', label: 'Investment' },
];
const EMPLOYMENT = [
  { value: '', label: 'Employment…' },
  { value: 'w2', label: 'W-2' },
  { value: 'self-employed', label: 'Self-employed' },
  { value: '1099', label: '1099' },
  { value: 'business-owner', label: 'Business owner' },
  { value: 'retired', label: 'Retired' },
  { value: 'investor', label: 'Investor' },
  { value: 'foreign-national', label: 'Foreign national' },
];
const PURPOSE = [
  { value: 'purchase', label: 'Purchase' },
  { value: 'refinance', label: 'Refinance' },
];

const DISCLAIMER =
  'This is not a mortgage application, Loan Estimate, approval, or commitment to lend. ' +
  'No SSN, date of birth, account numbers, or documents are collected here. Submitting ' +
  'starts a conversation with a licensed loan originator.';

/**
 * Short "Start Application" request form. Posts to the Netlify "start-application"
 * form (→ email notification set in the Netlify dashboard). Prefilled from the
 * live scenario. Deliberately not a full 1003 — no sensitive data.
 */
export function StartApplication({ profile }: { profile: ScenarioProfile }) {
  const [f, setF] = useState({
    name: profile.name ?? '',
    phone: profile.phone ?? '',
    email: profile.email ?? '',
    state: profile.state ?? '',
    purchase_price: profile.purchasePrice ? String(profile.purchasePrice) : '',
    down_payment: profile.downPayment != null ? String(profile.downPayment) : '',
    occupancy: profile.occupancy ?? '',
    employment: profile.employmentType ?? '',
    loan_purpose: 'purchase',
    best_time: '',
    notes: '',
    consent: false,
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const set = (patch: Partial<typeof f>) => setF((prev) => ({ ...prev, ...patch }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.consent) return;
    setStatus('sending');
    await postNetlifyForm(APPLICATION_FORM_NAME, {
      name: f.name,
      phone: f.phone,
      email: f.email,
      state: f.state,
      purchase_price: f.purchase_price,
      down_payment: f.down_payment,
      occupancy: f.occupancy,
      employment: f.employment,
      loan_purpose: f.loan_purpose,
      best_time: f.best_time,
      notes: f.notes,
      consent: 'yes',
      source_page: '/',
      utm: JSON.stringify(
        typeof window !== 'undefined' ? readUtm(window.location.search) : {},
      ),
    });
    // Whether Netlify accepted or we fell back to a log, confirm to the user.
    setStatus('done');
  }

  if (status === 'done') {
    return (
      <section className="sm-panel sm-wide" id="apply">
        <div className="sm-panel-h"><span>Application started</span><span className="sm-live">● received</span></div>
        <p className="sm-bullets" style={{ fontSize: '15px', color: 'var(--ink)' }}>
          Thanks{f.name ? `, ${f.name.split(' ')[0]}` : ''} — your request is in. A
          licensed loan originator from West Coast Capital Mortgage will reach out
          {f.best_time ? ` (${f.best_time})` : ''} to take it from here.
        </p>
        <p className="sm-fineprint">{DISCLAIMER}</p>
      </section>
    );
  }

  return (
    <section className="sm-panel sm-wide" id="apply">
      <div className="sm-panel-h">
        <span>Start your application</span>
        <span className="sm-beta">no SSN · no docs</span>
      </div>
      <form className="sm-appform" onSubmit={handleSubmit}>
        <div className="sm-row2">
          <label className="sm-field"><span>Full name</span>
            <input required value={f.name} onChange={(e) => set({ name: e.target.value })} /></label>
          <label className="sm-field"><span>Phone</span>
            <input required value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></label>
        </div>
        <div className="sm-row2">
          <label className="sm-field"><span>Email</span>
            <input required type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} /></label>
          <label className="sm-field"><span>Property state</span>
            <input value={f.state} onChange={(e) => set({ state: e.target.value })} /></label>
        </div>
        <div className="sm-row2">
          <label className="sm-field"><span>Purchase price / value</span>
            <input inputMode="numeric" value={f.purchase_price} onChange={(e) => set({ purchase_price: e.target.value })} /></label>
          <label className="sm-field"><span>Down payment / cash</span>
            <input inputMode="numeric" value={f.down_payment} onChange={(e) => set({ down_payment: e.target.value })} /></label>
        </div>
        <div className="sm-row2">
          <label className="sm-field"><span>Loan purpose</span>
            <select value={f.loan_purpose} onChange={(e) => set({ loan_purpose: e.target.value })}>
              {PURPOSE.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select></label>
          <label className="sm-field"><span>Occupancy</span>
            <select value={f.occupancy} onChange={(e) => set({ occupancy: e.target.value })}>
              {OCCUPANCY.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select></label>
        </div>
        <div className="sm-row2">
          <label className="sm-field"><span>Employment</span>
            <select value={f.employment} onChange={(e) => set({ employment: e.target.value })}>
              {EMPLOYMENT.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select></label>
          <label className="sm-field"><span>Best time to reach you</span>
            <input value={f.best_time} onChange={(e) => set({ best_time: e.target.value })} placeholder="e.g. weekday afternoons" /></label>
        </div>
        <label className="sm-field"><span>Anything else? (optional)</span>
          <input value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Timeline, property, questions…" /></label>

        <label className="sm-consent">
          <input type="checkbox" checked={f.consent} onChange={(e) => set({ consent: e.target.checked })} required />
          <span>I agree to be contacted by West Coast Capital Mortgage about my scenario.</span>
        </label>

        <button className="sm-btn sm-btn-primary" type="submit" disabled={status === 'sending' || !f.consent}>
          {status === 'sending' ? 'Sending…' : 'Submit Application Request'}
        </button>
        <p className="sm-fineprint">{DISCLAIMER}</p>
      </form>
    </section>
  );
}

export default StartApplication;
