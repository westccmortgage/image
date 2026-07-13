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
  fieldLabel,
  fieldQuestion,
  fieldOptionLabel,
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
  isLikelyPercent,
  isStrategyReady,
  MIN_PLAUSIBLE_PRICE,
  MIN_PLAUSIBLE_DOWN,
  DOCUMENT_CATEGORIES,
  FIELD_BY_KEY,
} from './scenario';
import type {
  FieldKey, Language, Question, ScenarioProfile, LoanProgramMatch,
  ContactInfo, PendingUpload, SubmittedDocMeta, DocumentReviewResult,
} from './scenario';
import { DocumentReviewModal } from './DocumentReviewModal';
import { t, LANGUAGES } from './i18n';
import { useSpeech } from './useSpeech';
import { PHONE_HREF } from './walletWccm';

const CHIPS: { label: 'chipBuying' | 'chipRefi' | 'chipSelfEmployed' | 'chipInvestment' | 'chipCashToClose'; starter: 'chipStarterBuying' | 'chipStarterRefi' | 'chipStarterSelfEmployed' | 'chipStarterInvestment' | 'chipStarterCashToClose' }[] = [
  { label: 'chipBuying', starter: 'chipStarterBuying' },
  { label: 'chipRefi', starter: 'chipStarterRefi' },
  { label: 'chipSelfEmployed', starter: 'chipStarterSelfEmployed' },
  { label: 'chipInvestment', starter: 'chipStarterInvestment' },
  { label: 'chipCashToClose', starter: 'chipStarterCashToClose' },
];

// Mobile: at most four compact starter actions with short labels.
const MOBILE_CHIPS: { label: 'chipBuyingShort' | 'chipRefiShort' | 'chipSelfEmployedShort' | 'chipInvestmentShort'; starter: 'chipStarterBuying' | 'chipStarterRefi' | 'chipStarterSelfEmployed' | 'chipStarterInvestment' }[] = [
  { label: 'chipBuyingShort', starter: 'chipStarterBuying' },
  { label: 'chipRefiShort', starter: 'chipStarterRefi' },
  { label: 'chipSelfEmployedShort', starter: 'chipStarterSelfEmployed' },
  { label: 'chipInvestmentShort', starter: 'chipStarterInvestment' },
];

type Role = 'ai' | 'user' | 'system' | 'event' | 'offer';
interface Msg { id: number; role: Role; lines: string[]; docEvent?: SubmittedDocMeta[] }

/** True on phone-width viewports — drives the simplified mobile product view. */
function useIsMobile(query = '(max-width: 767px)'): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}

/** Bridge a conversational profile into the deterministic engine. */
const toInput = profileToEngineInput;

const CAT_LABEL_KEY: Record<string, Parameters<typeof t>[1]> = Object.fromEntries(
  DOCUMENT_CATEGORIES.map((c) => [c.value, c.labelKey as Parameters<typeof t>[1]]),
);
const catLabelKey = (v: string): Parameters<typeof t>[1] => CAT_LABEL_KEY[v] ?? 'catOther';

function numberFromText(text: string): { value: number; hadDollarSign: boolean } | null {
  const hadDollarSign = text.includes('$');
  const m = text.replace(/\$/g, '').match(/([\d,]+(?:\.\d+)?)\s*(k|mm|m|million|thousand)?/i);
  if (!m) return null;
  const base = parseFloat(m[1].replace(/,/g, ''));
  if (!Number.isFinite(base)) return null;
  const suf = m[2]?.toLowerCase();
  const mult = suf === 'k' || suf === 'thousand' ? 1_000 : suf ? 1_000_000 : 1;
  return { value: base * mult, hadDollarSign };
}
function coerceAnswer(q: Question, text: string, profile: ScenarioProfile): Partial<ScenarioProfile> {
  if (q.kind === 'choice' && q.options) {
    const val = matchChoiceValue(q.field, q.options, text);
    return val ? ({ [q.field]: val } as Partial<ScenarioProfile>) : {};
  }
  if (q.kind === 'money' || q.kind === 'number') {
    const parsed = numberFromText(text);
    if (parsed == null) return {};
    const { value, hadDollarSign } = parsed;
    if (q.field === 'fico') return { fico: Math.round(value) };
    // A home price of "$400" or a "$20" down payment is never real — reject the
    // implausible value so the advisor re-asks instead of committing nonsense.
    if (q.field === 'purchasePrice') {
      return value >= MIN_PLAUSIBLE_PRICE ? { purchasePrice: value } : {};
    }
    if (q.field === 'downPayment') {
      // "20" (no $) in answer to the down-payment question means 20 percent.
      if (isLikelyPercent(value, hadDollarSign)) {
        const patch: Partial<ScenarioProfile> = { downPaymentPercent: value };
        if (profile.purchasePrice) patch.downPayment = Math.round((profile.purchasePrice * value) / 100);
        return patch;
      }
      return value >= MIN_PLAUSIBLE_DOWN ? { downPayment: value } : {};
    }
    return value > 0 ? ({ [q.field]: value } as Partial<ScenarioProfile>) : {};
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
function valueDisplay(lang: Language, key: FieldKey, p: ScenarioProfile): string {
  const v = p[key];
  if (v == null || v === '') return '';
  if (key === 'purchasePrice' || key === 'downPayment' || key === 'reserves') return formatMoney(Number(v));
  const def = FIELD_BY_KEY[key];
  if (def?.kind === 'choice') return fieldOptionLabel(lang, key, String(v));
  return String(v);
}

const hasBothOf = hasFullNumbers;
const hasValueOf = (p: ScenarioProfile) => !!(p.purchasePrice || p.downPayment != null);

export function SmartAdvisor({ lang, onLangChange }: { lang: Language; onLangChange: (l: Language) => void }) {
  const idRef = useRef(1);
  const nextId = () => idRef.current++;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [profile, setProfile] = useState<ScenarioProfile>(readInitialProfile);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [text, setText] = useState('');
  const [thinking, setThinking] = useState(false);
  const [mode, setMode] = useState<'unknown' | 'live' | 'local'>('unknown');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [composerFocused, setComposerFocused] = useState(false);
  const [contact, setContact] = useState({ name: '', phone: '', email: '', time: '', language: lang });
  const [result, setResult] = useState<{ ok: boolean } | null>(null);
  const isMobile = useIsMobile();
  const summaryOfferedRef = useRef(false);
  const firstMsgRef = useRef('');
  const parsedFirstRef = useRef<ScenarioProfile>({});
  const sessionIdRef = useRef(`s_${idRef.current}`);
  const textRef = useRef('');
  textRef.current = text;

  // Working microphone (Web Speech API). Status/error is UI state, never chat.
  const speech = useSpeech({ lang, getText: () => textRef.current, setText });

  // Session hygiene: never hydrate a saved scenario; clear any legacy keys.
  useEffect(() => {
    clearAdvisorState();
  }, []);

  /** Change language: stop the mic, then bubble up (page persists the pref). */
  function changeLang(next: Language) {
    speech.stop();
    onLangChange(next);
  }

  const conversationStarted = messages.some((m) => m.role === 'user');

  const both = hasBothOf(profile);
  const hasValue = hasValueOf(profile);
  const input = useMemo(() => toInput(profile), [profile]);
  const calc = useMemo(() => calculateCashToClose(both ? input : defaultScenario), [both, input]);
  const scenarios = useMemo(() => compareDownPaymentOptions(input), [input]);
  const programs = useMemo(() => matchLoanPrograms(profile), [profile]);
  const derived = useMemo(() => deriveScenario(profile), [profile]);
  const compact = useMemo(() => buildCompactProfile(profile, lang), [profile, lang]);
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
  const dismissOffer = (id: number) => setMessages((m) => m.filter((x) => x.id !== id));

  function snapshotLines(p: ScenarioProfile, c: ReturnType<typeof calculateCashToClose>, isBoth: boolean): string[] {
    const lines = [`◈ ${tr('snapshotHeader')}`];
    if (isBoth) {
      lines.push(
        `${formatMoney(c.totalCashToClose)} · +${formatMoney(c.additionalFundsNeeded)} > ${formatMoney(c.downPayment)} (est.)`,
      );
    }
    for (const pr of matchLoanPrograms(p).slice(0, 3)) {
      lines.push(`• ${pr.name} — ${pr.fit.toLowerCase()}. ${pr.why}`);
    }
    lines.push(tr('snapshotReadyPrompt'));
    return lines;
  }

  async function respondTo(next: ScenarioProfile, prev: ScenarioProfile, userText: string, isFirst: boolean) {
    setProfile(next);
    const captured = newlyCaptured(prev, next);
    const isBoth = hasBothOf(next);
    const activeInput = isBoth ? toInput(next) : defaultScenario;
    const c = calculateCashToClose(activeInput);
    const ready = isReadyForOptions(next);
    const rawNq = nextQuestions(next, { max: 1 })[0] ?? null;
    // Localize the question prompt so both the composer and the local-mode chat
    // ask in the selected language.
    const nq = rawNq ? { ...rawNq, prompt: fieldQuestion(lang, rawNq.field, next.loanPurpose) } : null;
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
        missingFields: missingRequired(next).map((k) => fieldLabel(lang, k, next.loanPurpose)),
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

    // Readiness-gated strategy-summary offer — shown ONCE, only after enough core
    // information exists, and never auto-opened (the user confirms via a button).
    if (isStrategyReady(next) && !summaryOfferedRef.current) {
      summaryOfferedRef.current = true;
      setMessages((m) => [...m, { id: nextId(), role: 'offer', lines: [tr('summaryOffer')] }]);
    }
  }

  function handleText() {
    const raw = text.trim();
    if (!raw) return;
    setText('');
    pushUser(raw);
    const isFirst = !firstMsgRef.current;
    if (isFirst) { firstMsgRef.current = raw; parsedFirstRef.current = parseScenario(raw); }
    let patch = parseScenario(raw);
    if (focus) patch = { ...patch, ...coerceAnswer(focus, raw, profile) };
    void respondTo(mergeProfile(profile, patch), profile, raw, isFirst);
  }
  function handleChip(field: FieldKey, value: string, label: string) {
    pushUser(label);
    void respondTo(mergeProfile(profile, { [field]: value } as Partial<ScenarioProfile>), profile, label, false);
  }

  function startOver() {
    speech.stop();
    clearAdvisorState();
    setProfile({});
    setQuestions([]);
    setText('');
    setThinking(false);
    setDrawerOpen(false);
    setReviewOpen(false);
    setDocModalOpen(false); // unmounts the modal → any unsent files are dropped
    setSummaryOpen(false);
    setResult(null);
    summaryOfferedRef.current = false;
    firstMsgRef.current = '';
    parsedFirstRef.current = {};
    idRef.current = 1;
    // Empty the stream → the localized onboarding shows again, and any Document
    // Review events / stale mic notes from this session are cleared.
    setMessages([]);
  }

  /** A quick-action chip inserts a localized starter phrase — it does NOT send. */
  function handleChipStarter(starterKey: Parameters<typeof t>[1]) {
    speech.clearError();
    setText(tr(starterKey));
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
      missingFields: missingRequired(merged).map((k) => fieldLabel(lang, k, merged.loanPurpose)),
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
    speech.stop(); // never leave the mic listening behind an open modal
    setDocModalOpen(true);
  }
  function openReview() {
    speech.stop();
    setReviewOpen(true);
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


  const patchNumbers = (patch: Partial<ScenarioProfile>) => setProfile((p) => mergeProfile(p, patch));

  const completed = (Object.keys(FIELD_BY_KEY) as FieldKey[]).filter(
    (k) => FIELD_BY_KEY[k].importance !== 'contact' && valueDisplay(lang, k, profile),
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
        <h1 className="sm-core">
          <span className="sm-h1-desktop">{tr('heroTitle')}</span>
          <span className="sm-h1-mobile">{tr('heroTitleMobile')}</span>
        </h1>
        <p className="sm-sub sm-sub-desktop">{tr('heroSubtitle')}</p>
        <p className="sm-sub sm-sub-mobile">{tr('heroLineMobile')}</p>
        {/* No empty numerical result cards here — results live in the Final
            Strategy Summary (one authoritative source, desktop + mobile). */}
      </header>

      {/* ---------- main: console + compact profile ---------- */}
      <div className="sm-main">
        <section className="sm-panel sm-console">
          <div className="sm-panel-h">
            <span>{tr('console')}</span>
            <div className="sm-console-tools">
              <div className="sm-langsel" role="group" aria-label={tr('languageLabel')}>
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    className={`sm-lang ${lang === l.code ? 'is-active' : ''}`}
                    aria-pressed={lang === l.code}
                    onClick={() => changeLang(l.code)}
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
            {!conversationStarted && (
              <>
                <div className="sm-msg sm-ai sm-onboard">
                  <p>{tr(isMobile ? 'onboardingGreetingMobile' : 'onboardingGreeting')}</p>
                  <p className="sm-onboard-eg">{tr('onboardingExample')}</p>
                </div>
                <div className="sm-starters">
                  {(isMobile ? MOBILE_CHIPS : CHIPS).map((c) => (
                    <button key={c.label} type="button" className="sm-chip"
                      onClick={() => handleChipStarter(c.starter)}>{tr(c.label)}</button>
                  ))}
                </div>
              </>
            )}
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
              ) : m.role === 'offer' ? (
                <div key={m.id} className="sm-offer">
                  <p>{m.lines[0]}</p>
                  <div className="sm-offer-actions">
                    <button type="button" className="sm-btn sm-btn-primary sm-btn-sm" onClick={() => setSummaryOpen(true)}>
                      {tr('summaryViewCta')}
                    </button>
                    <button type="button" className="sm-btn sm-btn-ghost sm-btn-sm" onClick={() => dismissOffer(m.id)}>
                      {tr('summaryContinueCta')}
                    </button>
                  </div>
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
                    onClick={() => handleChip(focus.field, o.value, fieldOptionLabel(lang, focus.field, o.value))}>{fieldOptionLabel(lang, focus.field, o.value)}</button>
                ))}
              </div>
            ) : null}
            {speech.listening && (
              <div className="sm-listening" aria-live="polite">
                <span className="sm-listening-dot" aria-hidden="true" /> {tr('micListening')}
              </div>
            )}
            {(speech.status === 'denied' || speech.status === 'unsupported') && (
              <div className="sm-micnote" role="status">
                {tr(speech.status === 'denied' ? 'micDenied' : 'micUnsupported')}
              </div>
            )}
            <form className="sm-inputrow" onSubmit={(e) => { e.preventDefault(); handleText(); }}>
              <button type="button" className="sm-iconbtn" onClick={paperclip} title={tr('docUploadCta')} aria-label={tr('attachAria')}>📎</button>
              <button
                type="button"
                className={`sm-iconbtn sm-micbtn ${speech.listening ? 'is-listening' : ''}`}
                onClick={speech.toggle}
                title={tr(speech.listening ? 'micStop' : 'micStart')}
                aria-label={tr(speech.listening ? 'micStop' : 'micStart')}
                aria-pressed={speech.listening}
              >🎙️</button>
              <textarea
                className="sm-input sm-input-ta"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onFocus={() => setComposerFocused(true)}
                onBlur={() => setComposerFocused(false)}
                onKeyDown={(e) => {
                  // Enter sends; Shift+Enter inserts a newline (standard chat UX).
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleText();
                  }
                }}
                rows={1}
                placeholder={focus ? fieldQuestion(lang, focus.field, profile.loanPurpose) : tr('composerPlaceholder')}
              />
              <button className="sm-btn sm-btn-primary sm-sendbtn" type="submit" aria-label={tr('send')}>
                <span className="sm-send-label">{tr('send')}</span>
                <span className="sm-send-icon" aria-hidden="true">➤</span>
              </button>
            </form>
          </div>
          <p className="sm-trust">{tr('trustLine')}</p>
          <p className="sm-compliance">{tr('complianceShort')}</p>
        </section>

        {/* compact profile (desktop side card) */}
        <aside className="sm-side">
          <div className="sm-panel sm-profile-compact">
            <div className="sm-pc-head">
              <span>{tr('profileTitle')}</span>
              {pct > 0 && <b>{pct}% {tr('complete')}</b>}
            </div>
            {pct > 0 && <div className="sm-bar"><span style={{ width: `${pct}%` }} /></div>}
            {compact.facts.length === 0 ? (
              <p className="sm-waiting">{tr('profileWaiting')}</p>
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

      {/* Mobile sticky compact bar (56–68px) → opens the profile bottom sheet.
          Hidden while the composer is focused so it never covers the keyboard. */}
      <button
        type="button"
        className={`sm-mobilebar ${composerFocused ? 'is-hidden' : ''}`}
        onClick={() => setDrawerOpen(true)}
        aria-hidden={composerFocused}
        tabIndex={composerFocused ? -1 : 0}
      >
        <span className="sm-mb-info">
          <b>{tr('profileTitle')}{pct > 0 ? ` · ${pct}%` : ''}</b>
        </span>
        <span className="sm-mb-btn">{tr('openProfile')}</span>
      </button>

      {/* ---------- strategy takeaway (only once the numbers are the user's) ---------- */}
      {/* The automatic strategy bullets were removed — numeric results now live
          only in the Final Strategy Summary (one authoritative source). */}

      {/* ---------- CTAs (only after value is provided) ---------- */}
      {hasValue && (
        <section className="sm-cta">
          <button type="button" className="sm-btn sm-btn-primary" onClick={openReview}>{tr('prepareSummary')}</button>
          <button type="button" className="sm-btn sm-btn-soft" onClick={openReview}>{tr('sendScenario')}</button>
          <a className="sm-btn sm-btn-ghost" href={PHONE_HREF}>{tr('talkBroker')}</a>
        </section>
      )}

      {/* ---------- full-disclosure accordion ---------- */}
      <section className="sm-panel sm-wide">
        <details className="sm-acc">
          <summary>{tr('importantDisclosures')}</summary>
          <p className="sm-fineprint sm-mt">{COMPLIANCE_DISCLAIMER}</p>
        </details>
      </section>

      {/* ---------- Full profile drawer / bottom sheet ---------- */}
      {drawerOpen && (
        <div className="sm-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="sm-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={tr('profileTitle')}>
            <div className="sm-drawer-head">
              <span>{tr('profileTitle')} · {pct}% {tr('complete')}</span>
              <button type="button" className="sm-x" onClick={() => setDrawerOpen(false)} aria-label={tr('close')}>×</button>
            </div>
            <div className="sm-drawer-body">
              {/* profile details */}
              <details className="sm-acc" open>
                <summary>{tr('profileDetails')}</summary>
                <ul className="sm-list sm-mt">
                  {completed.map((k) => (
                    <li key={k}><span>{fieldLabel(lang, k, profile.loanPurpose)}</span><b>{valueDisplay(lang, k, profile)}</b></li>
                  ))}
                  {countyText && (<li><span>{tr('countyLabel')}</span><b>{countyText}</b></li>)}
                  {derived.loanAmount != null && (<li><span>{tr('loanAmountLabel')}</span><b>{formatMoney(derived.loanAmount)}</b></li>)}
                  {derived.ltv != null && (<li><span>LTV</span><b>{derived.ltv.toFixed(1)}%</b></li>)}
                  {completed.length === 0 && derived.loanAmount == null && (<li><span>{tr('profileWaiting')}</span><b /></li>)}
                </ul>
              </details>

              {/* missing information */}
              <details className="sm-acc" open>
                <summary>{tr('missingInformation')}</summary>
                {stillNeeded.length > 0 && (<>
                  <div className="sm-sec sm-mt">{tr('stillNeeded')}</div>
                  <div className="sm-badgelist">{stillNeeded.map((k) => (<em key={k}>{fieldLabel(lang, k, profile.loanPurpose)}</em>))}</div>
                </>)}
                {helpful.length > 0 && (<>
                  <div className="sm-sec sm-mt">{tr('helpful')}</div>
                  <div className="sm-badgelist is-soft">{helpful.map((k) => (<em key={k}>{fieldLabel(lang, k, profile.loanPurpose)}</em>))}</div>
                </>)}
                {stillNeeded.length === 0 && helpful.length === 0 && (<p className="sm-mt">{tr('nothingCritical')}</p>)}
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
                        <span className="op">=</span><span className="fl">{tr('cashToClose')}</span>
                        <span className="fa">{formatMoney(calc.totalCashToClose)}</span>
                      </div>
                    </div>
                    <details className="sm-acc"><summary>{tr('adjustNumbers')}</summary>
                      <div className="sm-row2 sm-mt">
                        <label className="sm-field"><span>{tr('purchasePriceLabel')}</span>
                          <input type="number" step={1000} value={input.purchasePrice}
                            onChange={(e) => patchNumbers({ purchasePrice: Number(e.target.value) })} /></label>
                        <label className="sm-field"><span>{tr('downPayment')}</span>
                          <input type="number" step={1000} value={input.downPayment}
                            onChange={(e) => patchNumbers({ downPayment: Number(e.target.value) })} /></label>
                      </div>
                    </details>
                    <details className="sm-acc"><summary>{tr('showFullBreakdown')}</summary>
                      <div className="ctc-root sm-mt"><CostBreakdown result={calc} /></div>
                    </details>
                    <details className="sm-acc"><summary>{tr('downPaymentComparison')}</summary>
                      <div className="ctc-root sm-report sm-mt">
                        <ScenarioComparison scenarios={scenarios}
                          highlightPercent={[10, 15, 20, 25].find((p) => Math.abs(calc.downPaymentPercent - p) < 0.5)} />
                      </div>
                    </details>
                  </>
                ) : (
                  <p className="sm-mt">{tr('addPriceAndDown')}</p>
                )}
              </details>

              {/* possible loan paths */}
              <details className="sm-acc" open>
                <summary>{tr('possiblePaths')}</summary>
                <div className="sm-programs sm-mt">
                  {programs.map((pr) => (<ProgramCard key={pr.id} p={pr} tr={tr} />))}
                </div>
                <p className="sm-prog-note">{tr('programNote')}</p>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Strategy Review Request modal ---------- */}
      {reviewOpen && (
        <div className="sm-modal-overlay" onClick={() => setReviewOpen(false)}>
          <div className="sm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={tr('reviewTitle')}>
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
                    <input value={contact.time} onChange={(e) => setContact({ ...contact, time: e.target.value })} placeholder={tr('contactTimePlaceholder')} /></label>
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

      {/* ---------- Strategy summary (mobile-first bottom sheet; reuses the
           deterministic engine — no duplicate calculator) ---------- */}
      {summaryOpen && (
        <div className="sm-summary-overlay" onClick={() => setSummaryOpen(false)}>
          <div className="sm-summary" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={tr('summaryTitle')}>
            <div className="sm-summary-head">
              <span>{tr('summaryTitle')}</span>
              <button type="button" className="sm-x" onClick={() => setSummaryOpen(false)} aria-label={tr('close')}>×</button>
            </div>
            <div className="sm-summary-body">
              <dl className="sm-sum-grid">
                <div><dt>{tr('purchasePriceLabel')}</dt><dd>{profile.purchasePrice ? formatMoney(profile.purchasePrice) : '—'}</dd></div>
                <div><dt>{tr('downPayment')}</dt><dd>{profile.downPayment != null ? formatMoney(profile.downPayment) : '—'}</dd></div>
                <div><dt>{tr('loanAmountLabel')}</dt><dd>{derived.loanAmount != null ? formatMoney(derived.loanAmount) : '—'}</dd></div>
                <div><dt>{tr('summaryMonthlyPayment')}</dt><dd>{both ? formatMoney(calc.monthlyHousingPayment) : '—'}</dd></div>
                <div className="is-key"><dt>{tr('cashToClose')}</dt><dd>{both ? formatMoney(calc.totalCashToClose) : '—'}</dd></div>
                <div><dt>{tr('extraNeeded')}</dt><dd>{both ? formatMoney(calc.additionalFundsNeeded) : '—'}</dd></div>
              </dl>

              <div className="sm-sum-sec">
                <h4>{tr('possiblePaths')}</h4>
                <ul className="sm-sum-paths">
                  {programs.slice(0, 3).map((p) => (
                    <li key={p.id}><b>{p.name}</b> — {p.fit}</li>
                  ))}
                </ul>
              </div>

              {stillNeeded.length > 0 && (
                <div className="sm-sum-sec">
                  <h4>{tr('stillNeeded')}</h4>
                  <div className="sm-badgelist">
                    {stillNeeded.map((k) => (<em key={k}>{fieldLabel(lang, k, profile.loanPurpose)}</em>))}
                  </div>
                </div>
              )}

              <p className="sm-sum-note">{tr('summaryPlanningNote')}</p>
              <p className="sm-sum-date">{tr('summaryEstDate')}: {new Date().toLocaleDateString(lang)}</p>
            </div>
            <div className="sm-summary-actions">
              <button type="button" className="sm-btn sm-btn-primary" onClick={() => { setSummaryOpen(false); openReview(); }}>
                {tr('sendScenario')}
              </button>
              <button type="button" className="sm-btn sm-btn-soft" onClick={() => { setSummaryOpen(false); setDrawerOpen(true); }}>
                {tr('adjustScenario')}
              </button>
              <button type="button" className="sm-btn sm-btn-ghost" onClick={() => setSummaryOpen(false)}>
                {tr('continueChat')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProgramCard({ p, tr }: { p: LoanProgramMatch; tr: (k: Parameters<typeof t>[1]) => string }) {
  const fitClass = p.fit.startsWith('Possible strong') ? 'is-strong'
    : p.fit.startsWith('Possible') ? 'is-ok' : 'is-review';
  const dataKey: Parameters<typeof t>[1] =
    p.dataStatus === 'verified_current' ? 'dataVerifiedCurrent'
    : p.dataStatus === 'broker_review_required' ? 'dataBrokerReview'
    : p.dataStatus === 'missing_pricing_data' ? 'dataMissingPricing'
    : 'dataConfiguredAssumption';
  const dataClass = p.dataStatus === 'verified_current' ? 'is-verified' : 'is-assumption';
  return (
    <div className="sm-program">
      <div className="sm-prog-head">
        <b>{p.name}</b>
        <span className={`sm-prog-fit ${fitClass}`}>{p.fit}</span>
      </div>
      <div className="sm-prog-data">
        <span className={`sm-prog-datatag ${dataClass}`}>{tr(dataKey)}</span>
        {p.effectiveDate && <span className="sm-prog-date">{p.effectiveDate}</span>}
      </div>
      <p className="sm-prog-why">{p.why}</p>
      <div className="sm-prog-meta">
        {p.paymentEstimate != null && (<span>{tr('estPayment')}: {formatMoney(p.paymentEstimate)}{tr('perMonth')}*</span>)}
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
