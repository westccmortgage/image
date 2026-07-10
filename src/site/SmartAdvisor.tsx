import { useEffect, useMemo, useRef, useState } from 'react';
import {
  generateAiTakeaway,
  formatMoney,
  defaultScenario,
  COMPLIANCE_DISCLAIMER,
} from '../module';
import { CostBreakdown } from '../module/components/parts/CostBreakdown';
import { ScenarioComparison } from '../module/components/parts/ScenarioComparison';
import {
  parseScenario,
  mergeProfile,
  deriveScenario,
  missingRequired,
  missingHelpful,
  isReadyForOptions,
  nextQuestions,
  buildCompactProfile,
  hasFullNumbers,
  matchLoanPrograms,
  compareDownPaymentOptions,
  profileToEngineInput,
  calculateCashToClose,
  buildLead,
  submitLead,
  readUtm,
  readInitialProfile,
  clearAdvisorState,
  labelForValue,
  matchChoiceValue,
  buildReply,
  humanCaptured,
  askAdvisor,
  advisorMode,
  buildProgramSummaries,
  buildDocumentReviewPayload,
  submitDocumentReview,
  toSubmittedMetas,
  submitCrmLead,
  DOCUMENT_CATEGORIES,
  FIELD_BY_KEY,
} from './scenario';
import type {
  FieldKey, Language, Question, ScenarioProfile, LoanProgramMatch,
  ContactInfo, PendingUpload, SubmittedDocMeta, DocumentReviewResult,
} from './scenario';
import { DocumentReviewModal } from './DocumentReviewModal';
import { t, LANGUAGES } from './i18n';
import { PHONE_HREF } from './walletWccm';

type Role = 'ai' | 'user' | 'system' | 'event';
interface Msg { id: number; role: Role; lines: string[]; docEvent?: SubmittedDocMeta[] }

/** Bridge a conversational profile into the deterministic engine. */
const toInput = profileToEngineInput;

const CAT_LABEL_KEY: Record<string, Parameters<typeof t>[1]> = Object.fromEntries(
  DOCUMENT_CATEGORIES.map((c) => [c.value, c.labelKey as Parameters<typeof t>[1]]),
);
const catLabelKey = (v: string): Parameters<typeof t>[1] => CAT_LABEL_KEY[v] ?? 'catOther';

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
  if (/[?]|how much|what|why|when|which|can you|do i/i.test(text)) return {};
  return { [q.field]: text.trim() } as Partial<ScenarioProfile>;
}

function newlyCaptured(prev: ScenarioProfile, next: ScenarioProfile): FieldKey[] {
  const keys: FieldKey[] = [
    'purchasePrice', 'downPayment', 'state', 'zipOrCounty', 'county', 'occupancy',
    'employmentType', 'incomeDocPath', 'fico', 'reserves', 'borrowerGoal', 'loanPurpose',
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

const hasBothOf = hasFullNumbers;
const hasValueOf = (p: ScenarioProfile) => !!(p.purchasePrice || p.downPayment != null);

export function SmartAdvisor() {
  const idRef = useRef(1);
  const nextId = () => idRef.current++;

  const [lang, setLang] = useState<Language>('en');
  const [messages, setMessages] = useState<Msg[]>(() => [
    { id: nextId(), role: 'ai', lines: [t('en', 'heroTitle'), 'e.g. “$2M home in California, self-employed, $400k down.”'] },
  ]);
  const [profile, setProfile] = useState<ScenarioProfile>(readInitialProfile);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [text, setText] = useState('');
  const [thinking, setThinking] = useState(false);
  const [mode, setMode] = useState<'unknown' | 'live' | 'local'>('unknown');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [contact, setContact] = useState({ name: '', phone: '', email: '', time: '', language: 'en' as Language });
  const [result, setResult] = useState<{ ok: boolean } | null>(null);
  const firstMsgRef = useRef('');
  const parsedFirstRef = useRef<ScenarioProfile>({});
  const sessionIdRef = useRef(`s_${idRef.current}_${messages[0]?.id ?? 0}`);

  // Session hygiene: never hydrate a saved scenario; clear any legacy keys.
  useEffect(() => {
    clearAdvisorState();
  }, []);

  const both = hasBothOf(profile);
  const hasValue = hasValueOf(profile);
  const input = useMemo(() => toInput(profile), [profile]);
  const calc = useMemo(() => calculateCashToClose(both ? input : defaultScenario), [both, input]);
  const scenarios = useMemo(() => compareDownPaymentOptions(input), [input]);
  const takeaway = useMemo(() => generateAiTakeaway(calc, { loanType: input.loanType }), [calc, input.loanType]);
  const programs = useMemo(() => matchLoanPrograms(profile), [profile]);
  const derived = useMemo(() => deriveScenario(profile), [profile]);
  const compact = useMemo(() => buildCompactProfile(profile), [profile]);
  const pct = compact.pct;
  const focus = questions[0];
  const tr = (k: Parameters<typeof t>[1]) => t(lang, k);

  const streamRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = streamRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);

  const pushAi = (lines: string[]) => setMessages((m) => [...m, { id: nextId(), role: 'ai', lines }]);
  const pushUser = (line: string) => setMessages((m) => [...m, { id: nextId(), role: 'user', lines: [line] }]);
  const pushSystem = (line: string) => setMessages((m) => [...m, { id: nextId(), role: 'system', lines: [line] }]);

  function snapshotLines(p: ScenarioProfile, c: ReturnType<typeof calculateCashToClose>, isBoth: boolean): string[] {
    const lines = ['◈ Loan Strategy Snapshot'];
    if (isBoth) {
      lines.push(
        `You're looking at roughly ${formatMoney(c.totalCashToClose)} to close — about ${formatMoney(c.additionalFundsNeeded)} above your ${formatMoney(c.downPayment)} down payment (estimated, subject to lender guidelines).`,
      );
    }
    for (const pr of matchLoanPrograms(p).slice(0, 3)) {
      lines.push(`• ${pr.name} — ${pr.fit.toLowerCase()}. ${pr.why}`);
    }
    lines.push('When you’re ready, I can prepare a personalized strategy summary for a licensed broker to review.');
    return lines;
  }

  async function respondTo(next: ScenarioProfile, prev: ScenarioProfile, userText: string, isFirst: boolean) {
    setProfile(next);
    const captured = newlyCaptured(prev, next);
    const isBoth = hasBothOf(next);
    const activeInput = isBoth ? toInput(next) : defaultScenario;
    const c = calculateCashToClose(activeInput);
    const ready = isReadyForOptions(next);
    const nq = nextQuestions(next, { max: 1 })[0] ?? null;
    setQuestions(nq ? [nq] : []);

    const capturedText = captured.map((k) => humanCaptured(k, next, labelForValue)).filter(Boolean);
    const localLines = ready
      ? snapshotLines(next, c, isBoth)
      : buildReply({
          userText,
          capturedText,
          numbers: {
            hasBoth: isBoth,
            downPayment: c.downPayment,
            totalCashToClose: c.totalCashToClose,
            additionalFundsNeeded: c.additionalFundsNeeded,
            ltv: c.ltv,
            monthlyPI: c.monthlyPI,
            monthlyHousing: c.monthlyHousingPayment,
          },
          nextQuestion: nq,
          isFirstMessage: isFirst,
        });

    const nextPrograms = matchLoanPrograms(next);
    const warnings = isBoth ? c.risk.warnings.slice(0, 2) : [];
    const history = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: (m.role === 'ai' ? 'assistant' : 'user') as 'assistant' | 'user',
        text: m.lines.join(' '),
      }));

    setThinking(true);
    let live = null;
    try {
      live = await askAdvisor({
        userMessage: userText,
        language: lang,
        profile: next,
        missingFields: missingRequired(next).map((k) => FIELD_BY_KEY[k].label),
        nextQuestions: nq ? [nq.prompt] : [],
        possibleLoanPaths: buildProgramSummaries(nextPrograms),
        cashToCloseEstimate: {
          hasBoth: isBoth,
          downPayment: c.downPayment,
          totalCashToClose: c.totalCashToClose,
          additionalFundsNeeded: c.additionalFundsNeeded,
          ltv: c.ltv,
          loanType: activeInput.loanType,
          monthlyPI: c.monthlyPI,
          monthlyHousing: c.monthlyHousingPayment,
        },
        warnings,
        suggestedActions: ready ? ['prepare_strategy_summary', 'talk_to_broker'] : [],
        requiresHumanReview: true,
        historySummary: history,
        uploadedDocumentMeta: null,
        sessionId: sessionIdRef.current,
      });
    } finally {
      setThinking(false);
    }
    setMode(advisorMode());
    pushAi(live && live.assistantMessage.length ? live.assistantMessage : localLines);
  }

  function handleText() {
    const raw = text.trim();
    if (!raw) return;
    setText('');
    pushUser(raw);
    const isFirst = !firstMsgRef.current;
    if (isFirst) { firstMsgRef.current = raw; parsedFirstRef.current = parseScenario(raw); }
    let patch = parseScenario(raw);
    if (focus) patch = { ...patch, ...coerceAnswer(focus, raw) };
    void respondTo(mergeProfile(profile, patch), profile, raw, isFirst);
  }
  function handleChip(field: FieldKey, value: string, label: string) {
    pushUser(label);
    void respondTo(mergeProfile(profile, { [field]: value } as Partial<ScenarioProfile>), profile, label, false);
  }

  function startOver() {
    clearAdvisorState();
    setProfile({});
    setQuestions([]);
    setText('');
    setThinking(false);
    setDrawerOpen(false);
    setReviewOpen(false);
    setDocModalOpen(false); // unmounts the modal → any unsent files are dropped
    setResult(null);
    firstMsgRef.current = '';
    parsedFirstRef.current = {};
    idRef.current = 1;
    // Resetting messages clears any Document Review events from this session.
    setMessages([{ id: nextId(), role: 'ai', lines: [t(lang, 'heroTitle'), 'e.g. “$2M home in California, self-employed, $400k down.”'] }]);
  }

  /** Assemble the payload, route it through the adapter, and — only on success —
   *  record a permanent Document Review event + confirmation in the chat. */
  async function handleDocSubmit(files: PendingUpload[], dc: ContactInfo, note: string): Promise<DocumentReviewResult> {
    const merged = mergeProfile(profile, {
      name: dc.name, phone: dc.phone, email: dc.email,
      preferredContactTime: dc.preferredContactTime, preferredLanguage: dc.preferredLanguage,
    });
    setProfile(merged);
    const isBoth = hasBothOf(merged);
    const mInput = isBoth ? toInput(merged) : defaultScenario;
    const c = calculateCashToClose(mInput);
    const payload = buildDocumentReviewPayload({
      contact: dc,
      originalMessage: firstMsgRef.current,
      profile: merged,
      parsedScenario: parsedFirstRef.current,
      possibleLoanPaths: buildProgramSummaries(matchLoanPrograms(merged)),
      cashToCloseEstimate: isBoth
        ? {
            hasBoth: true,
            totalCashToClose: c.totalCashToClose,
            additionalFundsNeeded: c.additionalFundsNeeded,
            downPayment: c.downPayment,
            ltv: c.ltv,
            loanType: mInput.loanType,
          }
        : null,
      advisorSummary: isBoth ? generateAiTakeaway(c, { loanType: mInput.loanType }).bullets : undefined,
      missingFields: missingRequired(merged).map((k) => FIELD_BY_KEY[k].label),
      files,
      note,
      sourcePage: '/',
      utm: typeof window !== 'undefined' ? readUtm(window.location.search) : {},
      sessionId: sessionIdRef.current,
    });
    const metas = toSubmittedMetas(files);
    const res = await submitDocumentReview(payload, files);
    if (res.ok) {
      setMessages((m) => [
        ...m,
        { id: nextId(), role: 'event', lines: [], docEvent: metas },
        { id: nextId(), role: 'ai', lines: [tr('docSuccess')] },
        ...(res.dev ? [{ id: nextId(), role: 'system' as Role, lines: [tr('docDevMode')] }] : []),
      ]);
      // Capture this intentional broker-review submission in the CRM too
      // (best-effort; never blocks the borrower). Token stays server-side.
      const docLines = [
        'Wallet WCCM — Document Review submitted',
        ...metas.map((d) => `• ${d.name} — ${d.category || 'other'}`),
        note ? `Note: ${note}` : '',
        merged.purchasePrice ? `Purchase price: $${merged.purchasePrice.toLocaleString('en-US')}` : '',
        merged.city || merged.state ? `Location: ${[merged.city, merged.state].filter(Boolean).join(', ')}` : '',
        dc.preferredContactTime ? `Preferred time: ${dc.preferredContactTime}` : '',
        dc.preferredLanguage ? `Preferred language: ${dc.preferredLanguage}` : '',
      ].filter(Boolean);
      void submitCrmLead({ name: dc.name, email: dc.email, phone: dc.phone, message: docLines.join('\n') });
    }
    return res;
  }

  function paperclip() {
    setDocModalOpen(true);
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    const merged = mergeProfile(profile, {
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      preferredContactTime: contact.time,
      preferredLanguage: contact.language,
    });
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
    pushSystem(tr('reviewSent'));
    setTimeout(() => setReviewOpen(false), 1400);
  }

  function mic() {
    pushSystem(tr('micSoon'));
  }

  const patchNumbers = (patch: Partial<ScenarioProfile>) => setProfile((p) => mergeProfile(p, patch));

  const completed = (Object.keys(FIELD_BY_KEY) as FieldKey[]).filter(
    (k) => FIELD_BY_KEY[k].importance !== 'contact' && valueDisplay(k, profile),
  );
  const stillNeeded = missingRequired(profile);
  const helpful = missingHelpful(profile);

  const thirdPartyPlusGov = calc.thirdPartyFeesTotal + calc.governmentFeesTotal;
  const credits = calc.sellerCredit + calc.lenderCredit;
  const formula = [
    { op: '', label: 'Down payment', amount: calc.downPayment },
    { op: '+', label: 'Loan / lender fees', amount: calc.lenderFeesTotal },
    { op: '+', label: 'Title / escrow / third-party', amount: thirdPartyPlusGov },
    { op: '+', label: 'Prepaids / taxes / insurance', amount: calc.prepaidsAndEscrowTotal },
    { op: '−', label: 'Credits', amount: credits },
  ];

  const countyText = profile.county
    ? `${profile.county}${profile.countyConfidence === 'confirmed' ? '' : ` — ${tr('countyNeedsConfirm')}`}`
    : '';

  return (
    <div className="sm">
      <div className="sm-aurora" aria-hidden="true" />

      {/* ---------- hero ---------- */}
      <header className="sm-hero">
        <span className="sm-kicker">
          <i className="sm-dot" /> Wallet WCCM · {tr('productName')}
        </span>
        <h1 className="sm-core">{tr('heroTitle')}</h1>
        <p className="sm-sub">{tr('heroSubtitle')}</p>
        <div className="sm-cards">
          <div className="sm-card">
            <span className="k">{tr('downPayment')}</span>
            <span className="v">{both ? formatMoney(calc.downPayment) : '—'}</span>
          </div>
          <div className="sm-card is-key">
            <span className="k">{tr('cashToClose')}</span>
            <span className="v">{both ? formatMoney(calc.totalCashToClose) : '—'}</span>
            <span className="sm-scan" aria-hidden="true" />
          </div>
          <div className="sm-card is-extra">
            <span className="k">{tr('extraNeeded')}</span>
            <span className="v">{both ? formatMoney(calc.additionalFundsNeeded) : '—'}</span>
          </div>
        </div>
        <p className={`sm-tag ${both ? 'is-live' : 'is-example'}`}>
          {both
            ? `${tr('liveYourScenario')} · LTV ${calc.ltv.toFixed(1)}% · ${input.loanType}`
            : tr('exampleOnly')}
        </p>
      </header>

      {/* ---------- main: console + compact profile ---------- */}
      <div className="sm-main">
        <section className="sm-panel sm-console">
          <div className="sm-panel-h">
            <span>{tr('console')}</span>
            <div className="sm-console-tools">
              <div className="sm-langsel" role="group" aria-label="Language">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    className={`sm-lang ${lang === l.code ? 'is-active' : ''}`}
                    onClick={() => setLang(l.code)}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <button type="button" className="sm-startover" onClick={startOver}>{tr('startOver')}</button>
            </div>
          </div>

          {mode === 'local' && <div className="sm-mode is-local">{tr('localMode')}</div>}

          <div className="sm-stream" ref={streamRef}>
            {messages.map((m) => (
              m.role === 'event' && m.docEvent ? (
                <div key={m.id} className="sm-docevent">
                  <div className="sm-docevent-h">📄 {tr('docEventTitle')}</div>
                  <ul>
                    {m.docEvent.map((d, i) => (
                      <li key={i}><b>{d.name}</b> — {d.category ? tr(catLabelKey(d.category)) : tr('catOther')}</li>
                    ))}
                  </ul>
                  <div className="sm-docevent-status">✓ {tr('docSubmittedStatus')}</div>
                </div>
              ) : (
                <div key={m.id} className={`sm-msg sm-${m.role}`}>
                  {m.lines.map((l, i) => (
                    <p key={i} className={l.startsWith('◈') ? 'sm-snap-h' : undefined}>{l}</p>
                  ))}
                </div>
              )
            ))}
            {thinking && (
              <div className="sm-msg sm-ai sm-typing" aria-live="polite">
                <p><i /><i /><i /></p>
              </div>
            )}
          </div>

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
              <button type="button" className="sm-iconbtn" onClick={paperclip} title={tr('docUploadCta')} aria-label={tr('docModalTitle')}>📎</button>
              <button type="button" className="sm-iconbtn" onClick={mic} title={tr('micSoon')} aria-label="Voice input (coming soon)">🎙️</button>
              <input className="sm-input" value={text} onChange={(e) => setText(e.target.value)}
                placeholder={focus ? focus.prompt : tr('describePlaceholder')} />
              <button className="sm-btn sm-btn-primary" type="submit">{tr('send')}</button>
            </form>
          </div>
          <p className="sm-compliance">{tr('complianceShort')}</p>
        </section>

        {/* compact profile (desktop side card) */}
        <aside className="sm-side">
          <div className="sm-panel sm-profile-compact">
            <div className="sm-pc-head">
              <span>{tr('profileTitle')}</span>
              <b>{pct}% {tr('complete')}</b>
            </div>
            <div className="sm-bar"><span style={{ width: `${pct}%` }} /></div>
            {compact.facts.length === 0 ? (
              <p className="sm-empty">{tr('nothingYet')}</p>
            ) : (
              <ul className="sm-pc-facts">
                {compact.facts.map((f) => (
                  <li key={f.key + f.label}><span>{f.label}</span><b>{f.value}</b></li>
                ))}
              </ul>
            )}
            {compact.nextQuestion && (
              <div className="sm-pc-next"><span>{tr('next')}</span><p>{compact.nextQuestion}</p></div>
            )}
            {compact.criticalMissing.length > 0 && (
              <div className="sm-pc-missing">
                <span>{tr('stillNeeded')}</span>
                <div className="sm-badgelist">
                  {compact.criticalMissing.map((m) => (<em key={m}>{m}</em>))}
                </div>
              </div>
            )}
            <button type="button" className="sm-btn sm-btn-ghost sm-pc-btn" onClick={() => setDrawerOpen(true)}>
              {tr('viewFullProfile')}
            </button>
          </div>
        </aside>
      </div>

      {/* mobile sticky compact bar → opens the same drawer as a bottom sheet */}
      <button type="button" className="sm-mobilebar" onClick={() => setDrawerOpen(true)}>
        <span className="sm-mb-info">
          <b>{tr('profileTitle')} {pct}% {tr('complete')}</b>
          <small>
            {both
              ? `${formatMoney(profile.purchasePrice!)} · ${formatMoney(profile.downPayment!)} down · ${derived.ltv?.toFixed(0)}% LTV`
              : compact.nextQuestion ?? tr('nothingYet')}
          </small>
        </span>
        <span className="sm-mb-btn">{tr('openProfile')}</span>
      </button>

      {/* ---------- strategy takeaway (only once the numbers are the user's) ---------- */}
      {both && (
        <section className="sm-panel sm-wide">
          <div className="sm-panel-h"><span>AI Strategy</span><span className="sm-beta">beta</span></div>
          <ul className="sm-bullets">{takeaway.bullets.map((b, i) => (<li key={i}>{b}</li>))}</ul>
        </section>
      )}

      {/* ---------- CTAs (only after value is provided) ---------- */}
      {hasValue && (
        <section className="sm-cta">
          <button type="button" className="sm-btn sm-btn-primary" onClick={() => setReviewOpen(true)}>{tr('prepareSummary')}</button>
          <button type="button" className="sm-btn sm-btn-soft" onClick={() => setReviewOpen(true)}>{tr('sendScenario')}</button>
          <a className="sm-btn sm-btn-ghost" href={PHONE_HREF}>{tr('talkBroker')}</a>
        </section>
      )}

      {/* ---------- full-disclosure accordion ---------- */}
      <section className="sm-panel sm-wide">
        <details className="sm-acc">
          <summary>Important disclosures</summary>
          <p className="sm-fineprint sm-mt">{COMPLIANCE_DISCLAIMER}</p>
        </details>
      </section>

      {/* ---------- Full profile drawer / bottom sheet ---------- */}
      {drawerOpen && (
        <div className="sm-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="sm-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={tr('profileTitle')}>
            <div className="sm-drawer-head">
              <span>{tr('profileTitle')} · {pct}% {tr('complete')}</span>
              <button type="button" className="sm-x" onClick={() => setDrawerOpen(false)} aria-label={tr('close')}>×</button>
            </div>
            <div className="sm-drawer-body">
              {/* profile details */}
              <details className="sm-acc" open>
                <summary>Profile details</summary>
                <ul className="sm-list sm-mt">
                  {completed.map((k) => (
                    <li key={k}><span>{FIELD_BY_KEY[k].label}</span><b>{valueDisplay(k, profile)}</b></li>
                  ))}
                  {countyText && (<li><span>County</span><b>{countyText}</b></li>)}
                  {derived.loanAmount != null && (<li><span>Loan amount</span><b>{formatMoney(derived.loanAmount)}</b></li>)}
                  {derived.ltv != null && (<li><span>LTV</span><b>{derived.ltv.toFixed(1)}%</b></li>)}
                  {completed.length === 0 && derived.loanAmount == null && (<li><span>{tr('nothingYet')}</span><b /></li>)}
                </ul>
              </details>

              {/* missing information */}
              <details className="sm-acc" open>
                <summary>Missing information</summary>
                {stillNeeded.length > 0 && (<>
                  <div className="sm-sec sm-mt">{tr('stillNeeded')}</div>
                  <div className="sm-badgelist">{stillNeeded.map((k) => (<em key={k}>{FIELD_BY_KEY[k].label}</em>))}</div>
                </>)}
                {helpful.length > 0 && (<>
                  <div className="sm-sec sm-mt">{tr('helpful')}</div>
                  <div className="sm-badgelist is-soft">{helpful.map((k) => (<em key={k}>{FIELD_BY_KEY[k].label}</em>))}</div>
                </>)}
                {stillNeeded.length === 0 && helpful.length === 0 && (<p className="sm-mt">Nothing critical outstanding.</p>)}
              </details>

              {/* cash-to-close estimate */}
              <details className="sm-acc" open={both}>
                <summary>{tr('estCashToClose')}</summary>
                {both ? (
                  <>
                    <div className="sm-formula sm-mt">
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
                    <details className="sm-acc"><summary>Adjust numbers</summary>
                      <div className="sm-row2 sm-mt">
                        <label className="sm-field"><span>Purchase price</span>
                          <input type="number" step={1000} value={input.purchasePrice}
                            onChange={(e) => patchNumbers({ purchasePrice: Number(e.target.value) })} /></label>
                        <label className="sm-field"><span>Down payment</span>
                          <input type="number" step={1000} value={input.downPayment}
                            onChange={(e) => patchNumbers({ downPayment: Number(e.target.value) })} /></label>
                      </div>
                    </details>
                    <details className="sm-acc"><summary>Show full breakdown</summary>
                      <div className="ctc-root sm-mt"><CostBreakdown result={calc} /></div>
                    </details>
                    <details className="sm-acc"><summary>Down-payment comparison</summary>
                      <div className="ctc-root sm-report sm-mt">
                        <ScenarioComparison scenarios={scenarios}
                          highlightPercent={[10, 15, 20, 25].find((p) => Math.abs(calc.downPaymentPercent - p) < 0.5)} />
                      </div>
                    </details>
                  </>
                ) : (
                  <p className="sm-mt">Add a purchase price and down payment and I’ll compute your exact cash to close.</p>
                )}
              </details>

              {/* possible loan paths */}
              <details className="sm-acc" open>
                <summary>{tr('possiblePaths')}</summary>
                <div className="sm-programs sm-mt">
                  {programs.map((pr) => (<ProgramCard key={pr.id} p={pr} tr={tr} />))}
                </div>
                <p className="sm-prog-note">* Estimated at an assumed planning rate for comparison — not a quoted rate. Possible paths only, subject to lender guidelines and broker review.</p>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Strategy Review Request modal ---------- */}
      {reviewOpen && (
        <div className="sm-modal-overlay" onClick={() => setReviewOpen(false)}>
          <div className="sm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={tr('reviewTitle')}>
            <div className="sm-modal-head">
              <span>{tr('reviewTitle')}</span>
              <button type="button" className="sm-x" onClick={() => setReviewOpen(false)} aria-label={tr('close')}>×</button>
            </div>
            {result?.ok || result ? (
              <div className="sm-modal-body"><p className="sm-done">{tr('reviewSent')}</p></div>
            ) : (
              <form className="sm-modal-body" onSubmit={submitReview}>
                <p className="sm-review-intro">{tr('reviewIntro')}</p>
                <div className="sm-row2">
                  <label className="sm-field"><span>{tr('name')}</span>
                    <input required value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} /></label>
                  <label className="sm-field"><span>{tr('phone')}</span>
                    <input required value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} /></label>
                </div>
                <label className="sm-field"><span>{tr('email')}</span>
                  <input required type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} /></label>
                <div className="sm-row2">
                  <label className="sm-field"><span>{tr('contactTime')}</span>
                    <input value={contact.time} onChange={(e) => setContact({ ...contact, time: e.target.value })} placeholder="e.g. weekday afternoons" /></label>
                  <label className="sm-field"><span>{tr('preferredLanguage')}</span>
                    <select value={contact.language} onChange={(e) => setContact({ ...contact, language: e.target.value as Language })}>
                      {LANGUAGES.map((l) => (<option key={l.code} value={l.code}>{l.label}</option>))}
                    </select></label>
                </div>
                <button className="sm-btn sm-btn-primary" type="submit">{tr('sendRequest')}</button>
                <p className="sm-fineprint">{tr('complianceShort')}</p>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ---------- Document Review upload modal ---------- */}
      {docModalOpen && (
        <DocumentReviewModal
          lang={lang}
          profile={profile}
          onClose={() => setDocModalOpen(false)}
          onSubmit={handleDocSubmit}
        />
      )}
    </div>
  );
}

function ProgramCard({ p, tr }: { p: LoanProgramMatch; tr: (k: Parameters<typeof t>[1]) => string }) {
  const fitClass = p.fit.startsWith('Possible strong') ? 'is-strong'
    : p.fit.startsWith('Possible') ? 'is-ok' : 'is-review';
  return (
    <div className="sm-program">
      <div className="sm-prog-head">
        <b>{p.name}</b>
        <span className={`sm-prog-fit ${fitClass}`}>{p.fit}</span>
      </div>
      <p className="sm-prog-why">{p.why}</p>
      <div className="sm-prog-meta">
        {p.paymentEstimate != null && (<span>{tr('estPayment')}: {formatMoney(p.paymentEstimate)}/mo*</span>)}
        {p.cashToCloseEstimate != null && (<span>{tr('estCashToClose')}: {formatMoney(p.cashToCloseEstimate)}*</span>)}
      </div>
      {p.missing.length > 0 && (
        <div className="sm-prog-line"><em>{tr('missingData')}:</em> {p.missing.join(', ')}</div>
      )}
      <div className="sm-prog-line"><em>{tr('docsNeeded')}:</em> {p.documentation.join(', ')}</div>
      <div className="sm-prog-line"><em>{tr('mainRisks')}:</em> {p.risks.join('; ')}</div>
    </div>
  );
}

export default SmartAdvisor;
