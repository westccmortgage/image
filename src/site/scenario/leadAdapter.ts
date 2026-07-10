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
// backend (email / Telegram / CRM / Arive-LOS / Google Sheet / webhook) can be
// wired in later without touching the UI. No backend is connected yet, so the
// default adapter stores locally and logs.
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

/** Placeholder adapters — implement when the backend is chosen. */
export function createEmailAdapter(): LeadSubmissionAdapter {
  return notConfigured('email');
}
export function createTelegramAdapter(): LeadSubmissionAdapter {
  return notConfigured('telegram');
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

function notConfigured(name: string): LeadSubmissionAdapter {
  return {
    name,
    async submit() {
      return { ok: false, error: `${name} adapter not configured`, adapter: name };
    },
  };
}

/** The adapter the app uses today. Swap for a real one when a backend exists. */
export const defaultLeadAdapter: LeadSubmissionAdapter = createLocalLogAdapter();

export async function submitLead(
  lead: LeadSubmission,
  adapter: LeadSubmissionAdapter = defaultLeadAdapter,
): Promise<LeadResult> {
  return adapter.submit(lead);
}
