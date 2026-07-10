import { useMemo, useRef, useState } from 'react';
import { formatMoney } from '../module';
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
  estimateCashToClose,
  strategyBullets,
  buildLead,
  submitLead,
  readUtm,
  labelForValue,
  FIELD_BY_KEY,
} from './scenario';
import type {
  FieldKey,
  Question,
  ScenarioProfile,
} from './scenario';

type Role = 'ai' | 'user';
interface Msg {
  id: number;
  role: Role;
  lines: string[];
}
type Stage = 'intake' | 'contact' | 'submitted';

const GREETING = [
  'Tell me about your scenario in a sentence — I’ll build a Loan Strategy Snapshot as we go.',
  'For example: “I want to buy a $2M home in California. I’m self-employed with $400k down.”',
];

/** Money / number out of a targeted answer ("2m", "800000", "740"). */
function numberFromText(text: string): number | null {
  const m = text.replace(/\$/g, '').match(/([\d,]+(?:\.\d+)?)\s*(k|mm|m|million|thousand)?/i);
  if (!m) return null;
  const base = parseFloat(m[1].replace(/,/g, ''));
  if (!Number.isFinite(base)) return null;
  const suf = m[2]?.toLowerCase();
  const mult = suf === 'k' || suf === 'thousand' ? 1_000 : suf ? 1_000_000 : 1;
  return base * mult;
}

/** Coerce a free-text answer into the field currently being asked. */
function coerceAnswer(q: Question, text: string): Partial<ScenarioProfile> {
  if (q.kind === 'choice' && q.options) {
    const t = text.toLowerCase();
    const hit = q.options.find(
      (o) => t.includes(o.value.toLowerCase()) || t.includes(o.label.toLowerCase()),
    );
    if (hit) return { [q.field]: hit.value } as Partial<ScenarioProfile>;
    return {};
  }
  if (q.kind === 'money' || q.kind === 'number') {
    const n = numberFromText(text);
    if (n == null) return {};
    if (q.field === 'fico') return { fico: Math.round(n) };
    return { [q.field]: n } as Partial<ScenarioProfile>;
  }
  return { [q.field]: text.trim() } as Partial<ScenarioProfile>;
}

function valueDisplay(key: FieldKey, p: ScenarioProfile): string {
  const v = p[key];
  if (v == null || v === '') return '';
  if (key === 'purchasePrice' || key === 'downPayment' || key === 'reserves')
    return formatMoney(Number(v));
  const def = FIELD_BY_KEY[key];
  if (def?.kind === 'choice') return labelForValue(key, String(v));
  return String(v);
}

const DISCLAIMER =
  'This is not a mortgage application, Loan Estimate, approval, or commitment to lend. This information is used for educational planning and scenario review only.';

export function StrategyAdvisor() {
  const idRef = useRef(1);
  const nextId = () => idRef.current++;

  const [messages, setMessages] = useState<Msg[]>([
    { id: nextId(), role: 'ai', lines: GREETING },
  ]);
  const [profile, setProfile] = useState<ScenarioProfile>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stage, setStage] = useState<Stage>('intake');
  const [text, setText] = useState('');
  const [contact, setContact] = useState({ name: '', phone: '', email: '' });
  const [result, setResult] = useState<{ ok: boolean; id?: string } | null>(null);

  const firstMsgRef = useRef<string>('');
  const parsedFirstRef = useRef<ScenarioProfile>({});

  const derived = useMemo(() => deriveScenario(profile), [profile]);
  const pct = completionPercent(profile);
  const focus = questions[0];

  const pushAi = (lines: string[]) =>
    setMessages((m) => [...m, { id: nextId(), role: 'ai', lines }]);
  const pushUser = (line: string) =>
    setMessages((m) => [...m, { id: nextId(), role: 'user', lines: [line] }]);

  function optionsLines(p: ScenarioProfile): string[] {
    const lines = ['Loan Strategy Snapshot'];
    for (const path of matchLoanPaths(p)) lines.push(`• ${path.name} — ${path.why}`);
    const est = estimateCashToClose(p);
    if (est)
      lines.push(
        `Estimated cash to close: about ${formatMoney(est.estimatedCashToClose)} (${est.note})`,
      );
    for (const b of strategyBullets(p)) lines.push(`• ${b}`);
    lines.push('I can prepare a personalized strategy summary for you. Where should we send it?');
    return lines;
  }

  function advance(nextProfile: ScenarioProfile) {
    if (isReadyForOptions(nextProfile)) {
      pushAi(optionsLines(nextProfile));
      setQuestions([]);
      setStage('contact');
      return;
    }
    const qs = nextQuestions(nextProfile, { max: 3 });
    setQuestions(qs);
    const ack = firstMsgRef.current ? 'Got it — updated your Scenario Profile.' : '';
    pushAi([ack, ...qs.map((q) => q.prompt)].filter(Boolean));
  }

  function handleText() {
    const t = text.trim();
    if (!t) return;
    setText('');
    pushUser(t);

    if (!firstMsgRef.current) {
      firstMsgRef.current = t;
      parsedFirstRef.current = parseScenario(t);
    }

    let patch = parseScenario(t);
    if (focus) patch = { ...patch, ...coerceAnswer(focus, t) };
    const next = mergeProfile(profile, patch);
    setProfile(next);
    advance(next);
  }

  function handleChip(field: FieldKey, value: string, label: string) {
    pushUser(label);
    const next = mergeProfile(profile, { [field]: value } as Partial<ScenarioProfile>);
    setProfile(next);
    advance(next);
  }

  async function handleSubmit() {
    const merged = mergeProfile(profile, contact);
    setProfile(merged);
    const lead = buildLead({
      originalMessage: firstMsgRef.current,
      parsedScenario: parsedFirstRef.current,
      profile: merged,
      sourcePage: '/strategy',
      utm: typeof window !== 'undefined' ? readUtm(window.location.search) : {},
    });
    const res = await submitLead(lead);
    setResult(res);
    setStage('submitted');
    pushUser(`Send it to ${contact.email || contact.phone || contact.name}`);
    pushAi([
      res.ok
        ? 'Perfect — your personalized strategy summary is on its way. A licensed broker will follow up.'
        : 'Saved your scenario. A licensed broker will follow up shortly.',
    ]);
  }

  const completed = (Object.keys(FIELD_BY_KEY) as FieldKey[]).filter(
    (k) => FIELD_BY_KEY[k].importance !== 'contact' && valueDisplay(k, profile),
  );
  const stillNeeded = missingRequired(profile);
  const helpful = missingHelpful(profile);
  const nextQ = stage === 'contact' ? null : nextBestQuestion(profile);

  return (
    <div className="sa-grid">
      {/* ---- conversation ---- */}
      <div className="sa-chat">
        <div className="sa-chat-head">
          <span className="ww-kicker">Borrower Strategy Profile</span>
          <h1 className="sa-title">AI Mortgage Strategy Advisor</h1>
          <p className="sa-sub">
            An AI intake that builds your scenario as you chat — not a long
            application. No SSN, DOB, account numbers, or documents.
          </p>
        </div>

        <div className="sa-stream">
          {messages.map((m) => (
            <div key={m.id} className={`sa-msg sa-${m.role}`}>
              {m.lines.map((l, i) => (
                <p key={i} className={i === 0 && l === 'Loan Strategy Snapshot' ? 'sa-snap-h' : undefined}>
                  {l}
                </p>
              ))}
            </div>
          ))}
        </div>

        {/* composer */}
        {stage === 'submitted' ? (
          <div className="sa-done">
            {result?.id ? <span className="sa-done-id">Ref {result.id.slice(0, 18)}…</span> : null}
          </div>
        ) : stage === 'contact' ? (
          <form
            className="sa-contact"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
          >
            <div className="sa-contact-row">
              <input
                className="sa-input"
                placeholder="Name"
                value={contact.name}
                onChange={(e) => setContact({ ...contact, name: e.target.value })}
                required
              />
              <input
                className="sa-input"
                placeholder="Phone"
                value={contact.phone}
                onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                required
              />
            </div>
            <input
              className="sa-input"
              type="email"
              placeholder="Email"
              value={contact.email}
              onChange={(e) => setContact({ ...contact, email: e.target.value })}
              required
            />
            <button className="ww-btn ww-btn-primary" type="submit">
              Send My Strategy Summary
            </button>
            <p className="sa-disclaimer">{DISCLAIMER}</p>
          </form>
        ) : (
          <div className="sa-composer">
            {focus?.kind === 'choice' && focus.options ? (
              <div className="sa-chips">
                {focus.options.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    className="sa-chip"
                    onClick={() => handleChip(focus.field, o.value, o.label)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            ) : null}
            <form
              className="sa-inputrow"
              onSubmit={(e) => {
                e.preventDefault();
                handleText();
              }}
            >
              <input
                className="sa-input"
                placeholder={focus ? focus.prompt : 'Describe your scenario…'}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button className="ww-btn ww-btn-primary" type="submit">
                Send
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ---- live Scenario Profile ---- */}
      <details className="sa-profile" open>
        <summary>
          Scenario Profile <b>{pct}% complete</b>
        </summary>
        <div className="sa-profile-body">
          <div className="sa-progress">
            <span style={{ width: `${pct}%` }} />
          </div>

          <div className="sa-sec-h">Completed</div>
          {completed.length === 0 && derived.loanAmount == null ? (
            <p className="sa-empty">Nothing yet — tell me about your scenario.</p>
          ) : (
            <ul className="sa-list">
              {completed.map((k) => (
                <li key={k}>
                  <span>{FIELD_BY_KEY[k].label}</span>
                  <b>{valueDisplay(k, profile)}</b>
                </li>
              ))}
              {derived.loanAmount != null && (
                <li>
                  <span>Loan amount</span>
                  <b>{formatMoney(derived.loanAmount)}</b>
                </li>
              )}
              {derived.ltv != null && (
                <li>
                  <span>LTV</span>
                  <b>{derived.ltv.toFixed(1)}%</b>
                </li>
              )}
            </ul>
          )}

          {stillNeeded.length > 0 && (
            <>
              <div className="sa-sec-h">Still needed</div>
              <ul className="sa-list sa-need">
                {stillNeeded.map((k) => (
                  <li key={k}>
                    <span>{FIELD_BY_KEY[k].label}</span>
                    <em>Needed</em>
                  </li>
                ))}
              </ul>
            </>
          )}

          {helpful.length > 0 && (
            <>
              <div className="sa-sec-h">Helpful</div>
              <ul className="sa-list sa-help">
                {helpful.map((k) => (
                  <li key={k}>
                    <span>{FIELD_BY_KEY[k].label}</span>
                    <em>Helpful</em>
                  </li>
                ))}
              </ul>
            </>
          )}

          {nextQ && (
            <div className="sa-next">
              <div className="sa-sec-h">Next question</div>
              <p>{nextQ.prompt}</p>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

export default StrategyAdvisor;
