import type { Language, LoanProgramMatch, ScenarioProfile } from './types';

// ---------------------------------------------------------------------------
// Client bridge to the real AI route (Netlify function → Anthropic) at
// POST /api/mortgage-strategy-advisor.
//
// The deterministic tools stay authoritative: the client computes every number
// and passes it in. The route's LLM only PHRASES an assistant message, in the
// selected language, grounded strictly in the numbers provided. If the route is
// not configured (no API key), unreachable, or slow, this returns null and the
// caller falls back to the local rule-based advisor ("Local advisor mode").
// ---------------------------------------------------------------------------

export interface AdvisorRequest {
  userMessage: string;
  language: Language;
  profile: ScenarioProfile;
  missingFields: string[];
  nextQuestions: string[];
  possibleLoanPaths: { name: string; fit: string; dataStatus: string; effectiveDate: string | null }[];
  cashToCloseEstimate: {
    hasBoth: boolean;
    calculationReady: boolean;
    downPayment: number;
    totalCashToClose: number;
    additionalFundsNeeded: number;
    ltv: number;
    loanType: string;
    monthlyPI: number;
    monthlyHousing: number;
    totalClosingCosts: number;
    lenderFeesTotal: number;
    thirdPartyFeesTotal: number;
    governmentFeesTotal: number;
    prepaidsAndEscrowTotal: number;
    sellerCredit: number;
    lenderCredit: number;
  };
  warnings: string[];
  suggestedActions: string[];
  requiresHumanReview: boolean;
  historySummary: { role: 'user' | 'assistant'; text: string }[];
  uploadedDocumentMeta: null;
  sessionId: string;
}

export interface AdvisorResponse {
  assistantMessage: string[];
  requiresHumanReview: boolean;
}

const ENDPOINT = '/api/mortgage-strategy-advisor';
const TIMEOUT_MS = 15_000;

type Mode = 'unknown' | 'live' | 'local';
let mode: Mode = 'unknown';

/** 'live' once the route has answered, 'local' once it reported not-configured. */
export function advisorMode(): Mode {
  return mode;
}

export function buildProgramSummaries(programs: LoanProgramMatch[]): { name: string; fit: string; dataStatus: string; effectiveDate: string | null }[] {
  return programs.map((p) => ({ name: p.name, fit: p.fit, dataStatus: p.dataStatus, effectiveDate: p.effectiveDate }));
}

/** Ask the live advisor route. Returns null to signal a local fallback. */
export async function askAdvisor(req: AdvisorRequest): Promise<AdvisorResponse | null> {
  if (typeof window !== 'undefined' &&
      (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') &&
      new URLSearchParams(window.location.search).get('advisorMock') === '1') {
    mode = 'live';
    const c = req.cashToCloseEstimate;
    const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return {
      assistantMessage: c.calculationReady
        ? [
            `Mock provider response: principal and interest ${fmt(c.monthlyPI)} per month; total housing ${fmt(c.monthlyHousing)} per month. All figures came from the local deterministic calculation.`,
            ...req.warnings.map((warning) => `Warning: ${warning}`),
          ]
        : [`Mock provider response: I still need ${req.missingFields[0] ?? 'the missing scenario details'} before calculating.`],
      requiresHumanReview: true,
    };
  }
  if (mode === 'local' || typeof fetch === 'undefined') return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
    if (resp.status === 501) {
      mode = 'local'; // not configured — stop calling for this session
      return null;
    }
    if (!resp.ok) return null;
    const data = (await resp.json()) as { assistantMessage?: string; requiresHumanReview?: boolean };
    if (!data.assistantMessage) return null;
    mode = 'live';
    return {
      assistantMessage: data.assistantMessage
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
      requiresHumanReview: !!data.requiresHumanReview,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
