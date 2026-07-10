// Client bridge to the live "brain" (Netlify function → Anthropic).
//
// The deterministic engine stays authoritative: we send the already-computed
// numbers and the model only phrases them. If the function is not configured
// (no API key), unreachable, or slow, this returns null and the caller falls
// back to the local rule-based `buildReply` — so the chat never breaks.

export interface LiveBrainNumbers {
  hasBoth: boolean;
  purchasePrice: number | null;
  downPayment: number;
  loanAmount: number | null;
  totalCashToClose: number;
  additionalFundsNeeded: number;
  ltv: number;
  loanType: string;
  monthlyPI: number;
  monthlyHousing: number;
}

export interface LiveBrainRequest {
  userText: string;
  captured: string[];
  numbers: LiveBrainNumbers;
  nextQuestion: string | null;
  history: { role: 'user' | 'assistant'; text: string }[];
}

const ENDPOINT = '/api/chat';
const TIMEOUT_MS = 12_000;

// Once the function answers "not configured" (501) we stop calling it for the
// rest of the session, so we don't add latency to every message.
let disabled = false;

export function liveBrainDisabled(): boolean {
  return disabled;
}

/** Returns the assistant reply split into lines, or null to fall back locally. */
export async function askLiveBrain(req: LiveBrainRequest): Promise<string[] | null> {
  if (disabled || typeof fetch === 'undefined') return null;

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
      disabled = true; // not configured — don't try again this session
      return null;
    }
    if (!resp.ok) return null;
    const data = (await resp.json()) as { reply?: string };
    if (!data.reply) return null;
    return data.reply
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return null; // network/timeout/abort → local fallback
  } finally {
    clearTimeout(timer);
  }
}
