import { missingHelpful, missingRequired } from './profile';
import { matchLoanPaths, estimateCashToClose, strategyBullets } from './loanPaths';
import type {
  CashToCloseEstimate,
  FieldKey,
  LoanPath,
  ScenarioProfile,
} from './types';

// ---------------------------------------------------------------------------
// Lead submission — structured object + a pluggable adapter interface so a
// backend (secure webhook / email / CRM / Arive-LOS / Google Sheet / secure
// broker dashboard) can be wired in later without touching the UI. No backend
// is connected yet, so the default adapter stores locally and logs.
// ---------------------------------------------------------------------------

export interface LeadSubmission {
  /** The borrower's original free-text message. */
  originalMessage: string;
  /** Facts parsed straight from natural language. */
  parsedScenario: ScenarioProfile;
  /** Full merged profile (parsed + answered form fields). */
  formFields: ScenarioProfile;
  /** What's still missing at submit time. */
  missingFields: { required: FieldKey[]; helpful: FieldKey[] };
  /** Matched loan-path options. */
  loanPaths: LoanPath[];
  /** Planning cash-to-close estimate (null if not enough data). */
  cashToCloseEstimate: CashToCloseEstimate | null;
  /** AI strategy summary bullets. */
  strategySummary: string[];
  timestamp: string;
  sourcePage: string;
  utm: Record<string, string>;
}

export interface LeadResult {
  ok: boolean;
  id?: string;
  error?: string;
  adapter: string;
}

/** Implement this to route leads to any backend. */
export interface LeadSubmissionAdapter {
  name: string;
  submit(lead: LeadSubmission): Promise<LeadResult>;
}

export interface BuildLeadContext {
  originalMessage: string;
  parsedScenario: ScenarioProfile;
  profile: ScenarioProfile;
  sourcePage?: string;
  utm?: Record<string, string>;
  /** Injectable clock for deterministic tests. */
  now?: () => string;
}

/** Assemble the full structured lead object from the current session. */
export function buildLead(ctx: BuildLeadContext): LeadSubmission {
  const now = ctx.now ?? (() => new Date().toISOString());
  return {
    originalMessage: ctx.originalMessage,
    parsedScenario: ctx.parsedScenario,
    formFields: ctx.profile,
    missingFields: {
      required: missingRequired(ctx.profile),
      helpful: missingHelpful(ctx.profile),
    },
    loanPaths: matchLoanPaths(ctx.profile),
    cashToCloseEstimate: estimateCashToClose(ctx.profile),
    strategySummary: strategyBullets(ctx.profile),
    timestamp: now(),
    sourcePage: ctx.sourcePage ?? '/strategy',
    utm: ctx.utm ?? {},
  };
}

/** Read UTM params from a query string (browser: window.location.search). */
export function readUtm(search: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const params = new URLSearchParams(search);
    for (const [k, v] of params.entries()) {
      if (k.toLowerCase().startsWith('utm_')) out[k] = v;
    }
  } catch {
    /* ignore */
  }
  return out;
}

// --- Default adapter: local storage + console log (no backend connected) ----
export function createLocalLogAdapter(
  storageKey = 'wwccm_leads',
): LeadSubmissionAdapter {
  return {
    name: 'local-log',
    async submit(lead) {
      const id = `lead_${lead.timestamp}_${Math.abs(hash(JSON.stringify(lead.formFields)))}`;
      try {
        console.info('[leadSubmissionAdapter] captured lead', { id, lead });
        if (typeof localStorage !== 'undefined') {
          const prev = JSON.parse(localStorage.getItem(storageKey) || '[]');
          prev.push({ id, ...lead });
          localStorage.setItem(storageKey, JSON.stringify(prev));
        }
        return { ok: true, id, adapter: 'local-log' };
      } catch (e) {
        return { ok: false, error: String(e), adapter: 'local-log' };
      }
    },
  };
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

// ---------------------------------------------------------------------------
// Backend adapter scaffolds. Each is a clean, ready-to-implement stub — drop in
// the fetch/SDK call and register it below. Until configured they report
// "not configured" so nothing silently no-ops.
// ---------------------------------------------------------------------------
export function createWebhookAdapter(url?: string): LeadSubmissionAdapter {
  return {
    name: 'webhook',
    async submit(lead) {
      if (!url) return { ok: false, error: 'webhook URL not configured', adapter: 'webhook' };
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(lead),
        });
        return { ok: res.ok, adapter: 'webhook', error: res.ok ? undefined : `HTTP ${res.status}` };
      } catch (e) {
        return { ok: false, error: String(e), adapter: 'webhook' };
      }
    },
  };
}

// --- Netlify Forms (email) adapter -----------------------------------------
// Active email path today. Netlify captures the POST and emails it to the
// address configured in: Netlify → Forms → the "scenario-lead" form →
// Form notifications → Add notification → Email. No API keys or server code.
// The hidden static form in index.html lets Netlify detect the form at build.
export const NETLIFY_FORM_NAME = 'scenario-lead';

/** Flatten a lead into the Netlify form fields (urlencoded). Pure/testable. */
export function encodeNetlifyForm(
  formName: string,
  lead: LeadSubmission,
): string {
  const f = lead.formFields;
  const fields: Record<string, string> = {
    'form-name': formName,
    name: f.name ?? '',
    phone: f.phone ?? '',
    email: f.email ?? '',
    contact_time: f.preferredContactTime ?? '',
    language: f.preferredLanguage ?? '',
    loan_purpose: f.loanPurpose ?? '',
    county: f.county ?? '',
    purchase_price: f.purchasePrice != null ? String(f.purchasePrice) : '',
    down_payment: f.downPayment != null ? String(f.downPayment) : '',
    state: f.state ?? '',
    zip_or_county: f.zipOrCounty ?? '',
    occupancy: f.occupancy ?? '',
    employment: f.employmentType ?? '',
    income_doc: f.incomeDocPath ?? '',
    goal: f.borrowerGoal ?? '',
    fico: f.fico != null ? String(f.fico) : '',
    loan_paths: lead.loanPaths.map((p) => p.name).join(', '),
    cash_to_close:
      lead.cashToCloseEstimate != null
        ? String(lead.cashToCloseEstimate.estimatedCashToClose)
        : '',
    strategy_summary: lead.strategySummary.join(' | '),
    missing_required: lead.missingFields.required.join(', '),
    source_page: lead.sourcePage,
    original_message: lead.originalMessage,
    scenario_json: JSON.stringify(lead),
  };
  return new URLSearchParams(fields).toString();
}

export function createNetlifyFormsAdapter(opts?: {
  formName?: string;
  action?: string;
}): LeadSubmissionAdapter {
  const formName = opts?.formName ?? NETLIFY_FORM_NAME;
  const action = opts?.action ?? '/';
  return {
    name: 'netlify-forms',
    async submit(lead) {
      try {
        const res = await fetch(action, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: encodeNetlifyForm(formName, lead),
        });
        return {
          ok: res.ok,
          adapter: 'netlify-forms',
          error: res.ok ? undefined : `HTTP ${res.status}`,
        };
      } catch (e) {
        return { ok: false, error: String(e), adapter: 'netlify-forms' };
      }
    },
  };
}

// Placeholder adapters — implement when the backend is chosen. Approved
// delivery channels: secure webhook, email, CRM, Arive / LOS, secure broker
// dashboard, Google Sheet.
export function createEmailAdapter(): LeadSubmissionAdapter {
  return notConfigured('email');
}
export function createCrmAdapter(): LeadSubmissionAdapter {
  return notConfigured('crm');
}
export function createAriveAdapter(): LeadSubmissionAdapter {
  return notConfigured('arive-los');
}
export function createGoogleSheetAdapter(): LeadSubmissionAdapter {
  return notConfigured('google-sheet');
}
export function createBrokerDashboardAdapter(): LeadSubmissionAdapter {
  return notConfigured('broker-dashboard');
}

function notConfigured(name: string): LeadSubmissionAdapter {
  return {
    name,
    async submit() {
      return { ok: false, error: `${name} adapter not configured`, adapter: name };
    },
  };
}

// --- GR CRM (authorized) via a server-side proxy ---------------------------
// Intentional broker-review submissions are forwarded to the GR CRM through the
// /api/crm-lead Netlify function, which holds the CRM webhook URL + token
// server-side. The token is NEVER embedded in the browser, and this is only
// called on deliberate submissions — never on chat input.
export const CRM_LEAD_ENDPOINT = '/api/crm-lead';

export interface CrmLeadFields {
  name: string;
  email: string;
  phone: string;
  message: string;
}

/** Flatten a lead into the CRM's {name,email,phone,message} shape. */
export function crmFieldsFromLead(lead: LeadSubmission): CrmLeadFields {
  const f = lead.formFields;
  const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
  const lines = ['Wallet WCCM — AI Mortgage Strategy Advisor lead'];
  if (f.purchasePrice) lines.push(`Purchase price: ${money(f.purchasePrice)}`);
  if (f.downPayment != null) lines.push(`Down payment: ${money(f.downPayment)}`);
  if (f.loanPurpose) lines.push(`Purpose: ${f.loanPurpose}`);
  if (f.occupancy) lines.push(`Occupancy: ${f.occupancy}`);
  if (f.employmentType) lines.push(`Employment: ${f.employmentType}`);
  if (f.incomeDocPath) lines.push(`Income docs: ${f.incomeDocPath}`);
  if (f.city || f.state) lines.push(`Location: ${[f.city, f.state].filter(Boolean).join(', ')}`);
  if (f.county) lines.push(`County: ${f.county}`);
  if (f.preferredContactTime) lines.push(`Preferred time: ${f.preferredContactTime}`);
  if (f.preferredLanguage) lines.push(`Preferred language: ${f.preferredLanguage}`);
  if (lead.cashToCloseEstimate) lines.push(`Est. cash to close: ${money(lead.cashToCloseEstimate.estimatedCashToClose)}`);
  if (lead.loanPaths.length) lines.push(`Possible paths: ${lead.loanPaths.map((p) => p.name).join(', ')}`);
  if (lead.missingFields.required.length) lines.push(`Missing: ${lead.missingFields.required.join(', ')}`);
  if (lead.originalMessage) lines.push(`Message: ${lead.originalMessage}`);
  lines.push(`Source: ${lead.sourcePage}`);
  return { name: f.name ?? '', email: f.email ?? '', phone: f.phone ?? '', message: lines.join('\n') };
}

/** POST a lead to the CRM proxy. Best-effort — never throws. */
export async function submitCrmLead(fields: CrmLeadFields): Promise<LeadResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(CRM_LEAD_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(fields),
      signal: controller.signal,
    });
    return res.ok
      ? { ok: true, adapter: 'gr-crm' }
      : { ok: false, adapter: 'gr-crm', error: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, adapter: 'gr-crm', error: String(e) };
  } finally {
    clearTimeout(timer);
  }
}

export function createGrCrmAdapter(): LeadSubmissionAdapter {
  return {
    name: 'gr-crm',
    async submit(lead) {
      return submitCrmLead(crmFieldsFromLead(lead));
    },
  };
}

/**
 * The adapter the app uses today: submit via Netlify Forms (→ email
 * notification) AND forward to the GR CRM (best-effort, in parallel). If the
 * Netlify POST fails (e.g. local dev), fall back to the local/log adapter so a
 * lead is never silently lost. The CRM delivery never blocks the borrower's
 * confirmation.
 */
export function createDefaultAdapter(): LeadSubmissionAdapter {
  const primary = createNetlifyFormsAdapter();
  const fallback = createLocalLogAdapter();
  const crm = createGrCrmAdapter();
  return {
    name: 'netlify-forms+gr-crm+local',
    async submit(lead) {
      // CRM is additive/best-effort and runs in parallel with the email path.
      const crmPromise = crm.submit(lead).catch(() => undefined);
      const r = await primary.submit(lead);
      await crmPromise;
      if (r.ok) return r;
      const fb = await fallback.submit(lead);
      return { ...fb, error: r.error ?? fb.error };
    },
  };
}

export const defaultLeadAdapter: LeadSubmissionAdapter = createDefaultAdapter();

export async function submitLead(
  lead: LeadSubmission,
  adapter: LeadSubmissionAdapter = defaultLeadAdapter,
): Promise<LeadResult> {
  return adapter.submit(lead);
}

/**
 * Post an arbitrary set of fields to a named Netlify form (→ email
 * notification, configured in the Netlify dashboard). Falls back to a console
 * log so a submission is never silently lost in dev. Used by the Start
 * Application form ("start-application").
 */
export async function postNetlifyForm(
  formName: string,
  fields: Record<string, string>,
  action = '/',
): Promise<LeadResult> {
  const body = new URLSearchParams({ 'form-name': formName, ...fields }).toString();
  try {
    const res = await fetch(action, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (res.ok) return { ok: true, adapter: 'netlify-forms' };
    throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    try {
      console.info(`[netlify-form:${formName}] fallback capture`, fields);
    } catch {
      /* ignore */
    }
    return { ok: false, adapter: 'netlify-forms', error: String(e) };
  }
}
