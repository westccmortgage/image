import { useEffect, useMemo, useRef, useState } from 'react';
import {
  calculateCashToClose,
  buildDownPaymentScenarios,
  generateAiTakeaway,
  formatMoney,
  defaultScenario,
  COMPLIANCE_DISCLAIMER,
} from '../module';
import type { CashToCloseInput, LoanType } from '../module';
import { CostBreakdown } from '../module/components/parts/CostBreakdown';
import { ScenarioComparison } from '../module/components/parts/ScenarioComparison';
import {
  parseScenario,
  mergeProfile,
  deriveScenario,
  missingRequired,
  missingHelpful,
  completionPercent,
  isReadyForOptions,
  nextQuestions,
  nextBestQuestion,
  matchLoanPaths,
  strategyBullets,
  buildLead,
  submitLead,
  readUtm,
  labelForValue,
  matchChoiceValue,
  buildReply,
  humanCaptured,
  FIELD_BY_KEY,
} from './scenario';
import type { FieldKey, Question, ScenarioProfile } from './scenario';
import { StartApplication } from './StartApplication';
import { PHONE_HREF, walletWccmConfig } from './walletWccm';

type Role = 'ai' | 'user';
interface Msg { id: number; role: Role; lines: string[] }
type Stage = 'intake' | 'contact' | 'submitted';

const GREETING = [
  'I’m your cash-to-close engine. Describe your scenario and I’ll compute the real numbers as we talk.',
  'e.g. “$2M home in California, self-employed, $400k down.”',
];

const SHORT_WARNINGS = {
  belowTwenty:
    'Below 20% down may affect rate, PMI/MI, pricing adjustments, monthly payment, and verified funds needed to close.',
  nonQm:
    'Non-QM high-LTV financing may materially affect rate, pricing, mortgage insurance, approval strength, and cash to close.',
};
const DISCLAIMER =
  'This is not a mortgage application, Loan Estimate, approval, or commitment to lend. This information is used for educational planning and scenario review only.';

/** Bridge the conversational profile into the deterministic cash-to-close engine. */
function profileToInput(p: ScenarioProfile): { input: CashToCloseInput; isTheirs: boolean } {
  const input: CashToCloseInput = { ...defaultScenario };
  let isTheirs = false;
  if (p.purchasePrice) { input.purchasePrice = p.purchasePrice; isTheirs = true; }
  if (p.downPayment != null) { input.downPayment = p.downPayment; isTheirs = true; }
  if (p.state) input.state = p.state;
  if (p.zipOrCounty && /^\d{5}$/.test(p.zipOrCounty)) input.zip = p.zipOrCounty;
  const doc = p.incomeDocPath;
  if (p.occupancy === 'investment' || doc === 'dscr') input.loanType = 'Non-QM';
  else if (doc === 'bank-statements' || doc === 'p-and-l' || doc === 'asset-depletion') input.loanType = 'Non-QM';
  else if (doc === 'full-doc') input.loanType = (input.purchasePrice ?? 0) > 806_500 ? 'Jumbo' : 'Conventional';
  return { input, isTheirs };
}

function numberFromText(text: string): number | null {
  const m = text.replace(/\$/g, '').match(/([\d,]+(?:\.\d+)?)\s*(k|mm|m|million|thousand)?/i);
  if (!m) return null;
  const base = parseFloat(m[1].replace(/,/g, ''));
  if (!Number.isFinite(base)) return null;
  const suf = m[2]?.toLowerCase();
  const mult = suf === 'k' || suf === 'thousand' ? 1_000 : suf ? 1_000_000 : 1;
  return base * mult;
}
function coerceAnswer(q: Question, text: string): Partial<ScenarioProfile> {
  if (q.kind === 'choice' && q.options) {
    const val = matchChoiceValue(q.field, q.options, text);
    return val ? ({ [q.field]: val } as Partial<ScenarioProfile>) : {};
  }
  if (q.kind === 'money' || q.kind === 'number') {
    const n = numberFromText(text);
    if (n == null) return {};
    return q.field === 'fico' ? { fico: Math.round(n) } : ({ [q.field]: n } as Partial<ScenarioProfile>);
  }
  // Free text (state / ZIP): don't swallow a question as the answer.
  if (/[?]|how much|what|why|when|which|can you|do i/i.test(text)) return {};
  return { [q.field]: text.trim() } as Partial<ScenarioProfile>;
}

/** Fields newly filled between two profiles (non-contact). */
function newlyCaptured(prev: ScenarioProfile, next: ScenarioProfile): FieldKey[] {
  const keys: FieldKey[] = [
    'purchasePrice', 'downPayment', 'state', 'zipOrCounty', 'occupancy',
    'employmentType', 'incomeDocPath', 'fico', 'reserves', 'borrowerGoal',
  ];
  return keys.filter((k) => {
    const a = prev[k];
    const b = next[k];
    const has = (v: unknown) => v !== undefined && v !== null && v !== '';
    return has(b) && (!has(a) || a !== b);
  });
}
function valueDisplay(key: FieldKey, p: ScenarioProfile): string {
  const v = p[key];
  if (v == null || v === '') return '';
  if (key === 'purchasePrice' || key === 'downPayment' || key === 'reserves') return formatMoney(Number(v));
  const def = FIELD_BY_KEY[key];
  if (def?.kind === 'choice') return labelForValue(key, String(v));
  return String(v);
}

export function SmartAdvisor() {
  const idRef = useRef(1);
  const nextId = () => idRef.current++;

  const [messages, setMessages] = useState<Msg[]>([{ id: nextId(), role: 'ai', lines: GREETING }]);
  const [profile, setProfile] = useState<ScenarioProfile>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stage, setStage] = useState<Stage>('intake');
  const [text, setText] = useState('');
  const [contact, setContact] = useState({ name: '', phone: '', email: '' });
  const [result, setResult] = useState<{ ok: boolean; id?: string } | null>(null);
  const firstMsgRef = useRef('');
  const parsedFirstRef = useRef<ScenarioProfile>({});

  // Numbers only go "live" once BOTH price and down payment are known — until
  // then we show the example, so the chat never voices a half-real figure.
  const hasBoth = !!(profile.purchasePrice && profile.downPayment != null);
  const input = useMemo(() => profileToInput(profile).input, [profile]);
  const isTheirs = hasBoth;
  const calc = useMemo(
    () => calculateCashToClose(hasBoth ? input : defaultScenario),
    [hasBoth, input],
  );
  const scenarios = useMemo(() => buildDownPaymentScenarios(input), [input]);
  const takeaway = useMemo(() => generateAiTakeaway(calc, { loanType: input.loanType }), [calc, input.loanType]);
  const derived = useMemo(() => deriveScenario(profile), [profile]);
  const pct = completionPercent(profile);
  const focus = questions[0];

  // Keep the conversation pinned to the latest message (no manual scrolling).
  const streamRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = streamRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const pushAi = (lines: string[]) => setMessages((m) => [...m, { id: nextId(), role: 'ai', lines }]);
  const pushUser = (line: string) => setMessages((m) => [...m, { id: nextId(), role: 'user', lines: [line] }]);

  function optionsLines(p: ScenarioProfile, cashToClose: number): string[] {
    const lines = [
      '◈ Loan Strategy Snapshot',
      `Based on everything, you're looking at about ${formatMoney(cashToClose)} to close. Here are paths that fit:`,
    ];
    for (const path of matchLoanPaths(p)) lines.push(`• ${path.name} — ${path.why}`);
    for (const b of strategyBullets(p)) lines.push(`• ${b}`);
    lines.push('I can prepare a personalized strategy summary for you. Where should we send it?');
    return lines;
  }

  /** Core turn: merge facts, speak the numbers, ask ONE next question. */
  function respondTo(next: ScenarioProfile, prev: ScenarioProfile, userText: string, isFirst: boolean) {
    setProfile(next);
    const captured = newlyCaptured(prev, next);
    const both = !!(next.purchasePrice && next.downPayment != null);
    const activeInput = both ? profileToInput(next).input : defaultScenario;
    const c = calculateCashToClose(activeInput);

    if (isReadyForOptions(next)) {
      pushAi(optionsLines(next, c.totalCashToClose));
      setQuestions([]);
      setStage('contact');
      return;
    }
    const nq = nextQuestions(next, { max: 1 })[0] ?? null;
    setQuestions(nq ? [nq] : []);
    pushAi(
      buildReply({
        userText,
        capturedText: captured
          .map((k) => humanCaptured(k, next, labelForValue))
          .filter(Boolean),
        numbers: {
          hasBoth: both,
          downPayment: c.downPayment,
          totalCashToClose: c.totalCashToClose,
          additionalFundsNeeded: c.additionalFundsNeeded,
          ltv: c.ltv,
          monthlyPI: c.monthlyPI,
          monthlyHousing: c.monthlyHousingPayment,
        },
        nextQuestion: nq,
        isFirstMessage: isFirst,
      }),
    );
  }

  function handleText() {
    const t = text.trim();
    if (!t) return;
    setText('');
    pushUser(t);
    const isFirst = !firstMsgRef.current;
    if (isFirst) { firstMsgRef.current = t; parsedFirstRef.current = parseScenario(t); }
    let patch = parseScenario(t);
    if (focus) patch = { ...patch, ...coerceAnswer(focus, t) };
    respondTo(mergeProfile(profile, patch), profile, t, isFirst);
  }
  function handleChip(field: FieldKey, value: string, label: string) {
    pushUser(label);
    respondTo(mergeProfile(profile, { [field]: value } as Partial<ScenarioProfile>), profile, label, false);
  }
  async function handleSubmit() {
    const merged = mergeProfile(profile, contact);
    setProfile(merged);
    const lead = buildLead({
      originalMessage: firstMsgRef.current,
      parsedScenario: parsedFirstRef.current,
      profile: merged,
      sourcePage: '/',
      utm: typeof window !== 'undefined' ? readUtm(window.location.search) : {},
    });
    const res = await submitLead(lead);
    setResult(res);
    setStage('submitted');
    pushUser(`Send it to ${contact.email || contact.phone || contact.name}`);
    pushAi([res.ok
      ? 'Sent. Your personalized strategy summary is on its way — a licensed broker will follow up.'
      : 'Saved. A licensed broker will follow up shortly.']);
  }

  // quick-adjust numbers directly (also fills the profile)
  const patchNumbers = (patch: Partial<ScenarioProfile>) => setProfile((p) => mergeProfile(p, patch));

  const completed = (Object.keys(FIELD_BY_KEY) as FieldKey[]).filter(
    (k) => FIELD_BY_KEY[k].importance !== 'contact' && valueDisplay(k, profile),
  );
  const stillNeeded = missingRequired(profile);
  const helpful = missingHelpful(profile);
  const nextQ = stage === 'contact' ? null : nextBestQuestion(profile);

  const thirdPartyPlusGov = calc.thirdPartyFeesTotal + calc.governmentFeesTotal;
  const credits = calc.sellerCredit + calc.lenderCredit;
  const formula = [
    { op: '', label: 'Down payment', amount: calc.downPayment },
    { op: '+', label: 'Loan / lender fees', amount: calc.lenderFeesTotal },
    { op: '+', label: 'Title / escrow / third-party', amount: thirdPartyPlusGov },
    { op: '+', label: 'Prepaids / taxes / insurance', amount: calc.prepaidsAndEscrowTotal },
    { op: '−', label: 'Credits', amount: credits },
  ];

  return (
    <div className="sm">
      <div className="sm-aurora" aria-hidden="true" />

      {/* ---------- hero ---------- */}
      <header className="sm-hero">
        <span className="sm-kicker">
          <i className="sm-dot" /> Wallet WCCM · AI Cash-to-Close Engine
        </span>
        <h1 className="sm-core">Your down payment is not your cash to close.</h1>
        <div className="sm-cards">
          <div className="sm-card">
            <span className="k">Down payment</span>
            <span className="v">{formatMoney(calc.downPayment)}</span>
          </div>
          <div className="sm-card is-key">
            <span className="k">Estimated cash to close</span>
            <span className="v">{formatMoney(calc.totalCashToClose)}</span>
            <span className="sm-scan" aria-hidden="true" />
          </div>
          <div className="sm-card is-extra">
            <span className="k">Extra needed</span>
            <span className="v">{formatMoney(calc.additionalFundsNeeded)}</span>
          </div>
        </div>
        <p className="sm-tag">
          {isTheirs ? 'Live — your scenario' : 'Example scenario — describe yours below to update'} ·
          LTV {calc.ltv.toFixed(1)}% · {input.loanType}
        </p>
      </header>

      {/* ---------- main: console + readout ---------- */}
      <div className="sm-main">
        {/* console */}
        <section className="sm-panel sm-console">
          <div className="sm-panel-h">
            <span>AI Strategy Console</span>
            <span className="sm-live">● live</span>
          </div>
          <div className="sm-stream" ref={streamRef}>
            {messages.map((m) => (
              <div key={m.id} className={`sm-msg sm-${m.role}`}>
                {m.lines.map((l, i) => (
                  <p key={i} className={l.startsWith('◈') ? 'sm-snap-h' : undefined}>{l}</p>
                ))}
              </div>
            ))}
          </div>

          {stage === 'submitted' ? (
            <div className="sm-done">{result?.id ? `Ref ${result.id.slice(0, 20)}…` : 'Received.'}</div>
          ) : stage === 'contact' ? (
            <form className="sm-contact" onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
              <div className="sm-row2">
                <input className="sm-input" placeholder="Name" value={contact.name} required
                  onChange={(e) => setContact({ ...contact, name: e.target.value })} />
                <input className="sm-input" placeholder="Phone" value={contact.phone} required
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
              </div>
              <input className="sm-input" type="email" placeholder="Email" value={contact.email} required
                onChange={(e) => setContact({ ...contact, email: e.target.value })} />
              <button className="sm-btn sm-btn-primary" type="submit">Send My Strategy Summary</button>
              <p className="sm-fine">{DISCLAIMER}</p>
            </form>
          ) : (
            <div className="sm-composer">
              {focus?.kind === 'choice' && focus.options ? (
                <div className="sm-chips">
                  {focus.options.map((o) => (
                    <button key={o.value} type="button" className="sm-chip"
                      onClick={() => handleChip(focus.field, o.value, o.label)}>{o.label}</button>
                  ))}
                </div>
              ) : null}
              <form className="sm-inputrow" onSubmit={(e) => { e.preventDefault(); handleText(); }}>
                <input className="sm-input" value={text} onChange={(e) => setText(e.target.value)}
                  placeholder={focus ? focus.prompt : 'Describe your scenario…'} />
                <button className="sm-btn sm-btn-primary" type="submit">Send</button>
              </form>
            </div>
          )}
        </section>

        {/* readout */}
        <aside className="sm-side">
          <details className="sm-panel sm-profile" open>
            <summary>
              <span>Scenario Profile</span>
              <b>{pct}%</b>
            </summary>
            <div className="sm-profile-body">
              <div className="sm-bar"><span style={{ width: `${pct}%` }} /></div>
              <div className="sm-sec">Completed</div>
              {completed.length === 0 && derived.loanAmount == null ? (
                <p className="sm-empty">Nothing yet — describe your scenario.</p>
              ) : (
                <ul className="sm-list">
                  {completed.map((k) => (
                    <li key={k}><span>{FIELD_BY_KEY[k].label}</span><b>{valueDisplay(k, profile)}</b></li>
                  ))}
                  {derived.loanAmount != null && (<li><span>Loan amount</span><b>{formatMoney(derived.loanAmount)}</b></li>)}
                  {derived.ltv != null && (<li><span>LTV</span><b>{derived.ltv.toFixed(1)}%</b></li>)}
                </ul>
              )}
              {stillNeeded.length > 0 && (<>
                <div className="sm-sec">Still needed</div>
                <ul className="sm-list sm-need">
                  {stillNeeded.map((k) => (<li key={k}><span>{FIELD_BY_KEY[k].label}</span><em>Needed</em></li>))}
                </ul>
              </>)}
              {helpful.length > 0 && (<>
                <div className="sm-sec">Helpful</div>
                <ul className="sm-list sm-help">
                  {helpful.map((k) => (<li key={k}><span>{FIELD_BY_KEY[k].label}</span><em>Helpful</em></li>))}
                </ul>
              </>)}
              {nextQ && (<div className="sm-next"><div className="sm-sec">Next</div><p>{nextQ.prompt}</p></div>)}
            </div>
          </details>

        </aside>
      </div>

      {/* ---------- AI Strategy: takeaway + how the cash to close adds up ---------- */}
      <section className="sm-panel sm-wide">
        <div className="sm-panel-h"><span>AI Strategy</span><span className="sm-beta">beta</span></div>
        <ul className="sm-bullets">{takeaway.bullets.map((b, i) => (<li key={i}>{b}</li>))}</ul>

        <div className="sm-strategy-sub">How the cash to close adds up</div>
        <div className="sm-formula">
          {formula.map((r, i) => (
            <div className="sm-frow" key={i}>
              <span className="op">{r.op || ' '}</span>
              <span className="fl">{r.label}</span>
              <span className="fa">{r.op === '−' && r.amount > 0 ? '−' : ''}{formatMoney(r.amount)}</span>
            </div>
          ))}
          <div className="sm-frow is-total">
            <span className="op">=</span><span className="fl">Estimated cash to close</span>
            <span className="fa">{formatMoney(calc.totalCashToClose)}</span>
          </div>
        </div>
        <details className="sm-acc">
          <summary>Adjust numbers</summary>
          <div className="sm-row2 sm-mt">
            <label className="sm-field"><span>Purchase price</span>
              <input type="number" step={1000} value={input.purchasePrice}
                onChange={(e) => patchNumbers({ purchasePrice: Number(e.target.value) })} /></label>
            <label className="sm-field"><span>Down payment</span>
              <input type="number" step={1000} value={input.downPayment}
                onChange={(e) => patchNumbers({ downPayment: Number(e.target.value) })} /></label>
          </div>
          <div className="sm-row2 sm-mt">
            <label className="sm-field"><span>State</span>
              <input value={profile.state ?? input.state ?? ''}
                onChange={(e) => patchNumbers({ state: e.target.value })} /></label>
            <label className="sm-field"><span>Loan type</span>
              <select value={input.loanType} onChange={(e) => patchNumbers({ incomeDocPath: e.target.value === 'Non-QM' ? 'bank-statements' : 'full-doc' } as Partial<ScenarioProfile>)}>
                {(['Conventional', 'FHA', 'VA', 'Jumbo', 'Non-QM'] as LoanType[]).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select></label>
          </div>
        </details>
        <details className="sm-acc">
          <summary>Show full breakdown</summary>
          <div className="ctc-root sm-mt"><CostBreakdown result={calc} /></div>
        </details>
      </section>

      {/* ---------- warnings ---------- */}
      {(calc.risk.belowTwentyDown || calc.risk.nonQmHighLtv) && (
        <section className="sm-warns">
          {calc.risk.belowTwentyDown && (
            <details className="sm-warn"><summary><span className="wi">!</span>{SHORT_WARNINGS.belowTwenty}</summary>
              <p className="sm-mt sm-explain">{calc.risk.warnings[0]}</p></details>
          )}
          {calc.risk.nonQmHighLtv && (
            <details className="sm-warn is-strong"><summary><span className="wi">!</span>{SHORT_WARNINGS.nonQm}</summary>
              <p className="sm-mt sm-explain">{calc.risk.warnings[calc.risk.warnings.length - 1]}</p></details>
          )}
        </section>
      )}

      {/* ---------- CTAs ---------- */}
      <section className="sm-cta">
        <a className="sm-btn sm-btn-primary" href="#apply">Start Application</a>
        <a className="sm-btn sm-btn-ghost" href={PHONE_HREF}>Talk to a Mortgage Broker</a>
      </section>

      {/* ---------- full report ---------- */}
      <section className="sm-panel sm-wide">
        <details className="sm-acc">
          <summary>Full calculation report</summary>
          <div className="ctc-root sm-report sm-mt">
            <ScenarioComparison
              scenarios={scenarios}
              highlightPercent={[10, 15, 20, 25].find((p) => Math.abs(calc.downPaymentPercent - p) < 0.5)}
            />
          </div>
        </details>
      </section>

      {/* ---------- Start Application form (→ Netlify email) ---------- */}
      <StartApplication profile={profile} />

      <p className="sm-fineprint">{walletWccmConfig.disclosureText ?? COMPLIANCE_DISCLAIMER}</p>
    </div>
  );
}

export default SmartAdvisor;
