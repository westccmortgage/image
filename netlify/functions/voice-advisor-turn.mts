// Wallet WCCM — Voice advisor turn route.
//
// The phone agent (separate WWCCM-Voice repo) sends the caller's transcribed
// utterance here and gets back a short, speakable reply plus the updated profile.
// It reuses the EXACT same brain as the chat UI (runAdvisorTurn): deterministic
// parsing, intake order, and the verified calculators are the only source of
// numbers. An LLM — Anthropic direct or the Measured Decision V2 gateway
// (OpenAI / Anthropic / Google), selected by WWCCM_AI_PROVIDER — only re-phrases
// the deterministic reply for natural speech, grounded strictly in those numbers.
// If no provider is configured (or it errors), the deterministic reply is spoken
// as-is, so the phone line never goes silent.

import { runAdvisorTurn } from '../../src/site/scenario/voiceTurn';
import type { Language, ScenarioProfile, FieldKey } from '../../src/site/scenario/types';
import { phraseWithAI, isAiConfigured } from './_shared/aiProvider.mjs';

const LANG_NAME: Record<string, string> = {
  en: 'English',
  ru: 'Russian',
  es: 'Spanish',
  zh: 'Simplified Chinese',
};

function voiceSystemPrompt(langCode: string): string {
  const langName = LANG_NAME[langCode] || 'English';
  return `You are the SPOKEN voice of "Wallet WCCM — AI Mortgage Strategy Advisor", talking with a caller on the phone. You are warm, brief, and clear.

SPEAK ENTIRELY IN ${langName.toUpperCase()}.

HARD RULES:
- The numbers in CONTEXT come from a verified calculation engine. They are the ONLY numbers you may say. NEVER invent, estimate, recompute, or change any dollar amount, rate, LTV, or percentage.
- If "hasBoth" is false, the figures are an example, NOT the caller's. Do not present them as the caller's own; ask for whatever is missing.
- Keep it to 1–3 short spoken sentences. No lists, no markdown, no symbols, no emoji — this will be read aloud by text-to-speech, so write numbers and dollars the way they should be spoken.
- Ask at most ONE question — the "Next question" in CONTEXT — and only if the caller is not asking their own.
- Use cautious language: possible, estimated, may, subject to lender guidelines, requires broker review. NEVER say approved, qualified, guaranteed, or promise a rate.
- Never ask for a Social Security number, date of birth, or full bank or account numbers.
- You are an AI assistant, not a licensed loan officer; a licensed broker reviews every scenario.
- Stay faithful to the deterministic DRAFT reply provided; you may make it sound more natural but must not add numbers or claims beyond CONTEXT.`;
}

function money(v: unknown): string {
  return typeof v === 'number' && isFinite(v)
    ? '$' + Math.round(v).toLocaleString('en-US')
    : 'unknown';
}

function buildVoiceContext(result: ReturnType<typeof runAdvisorTurn>): string {
  const n = result.numbers;
  const lines = [
    `hasBoth (are these the caller's real numbers?): ${n.hasBoth ? 'true' : 'false'}`,
    `Down payment: ${money(n.downPayment)}`,
    `Total cash to close: ${money(n.totalCashToClose)}`,
    `Extra needed beyond down payment: ${money(n.additionalFundsNeeded)}`,
    `LTV: ${typeof n.ltv === 'number' ? n.ltv.toFixed(1) + '%' : 'unknown'}`,
    `Loan type: ${n.loanType || 'unknown'}`,
    `Monthly principal & interest: ${money(n.monthlyPI)}`,
    `Monthly housing (w/ taxes & insurance): ${money(n.monthlyHousing)}`,
  ];
  if (result.captured.length) lines.push(`Captured this turn: ${result.captured.join(', ')}`);
  if (result.nextQuestion) lines.push(`Next question to ask (only if the caller isn't asking their own): ${result.nextQuestion.prompt}`);
  if (!n.hasBoth) {
    lines.push(
      'INTAKE INCOMPLETE: purchase price and/or down payment not both known. Do NOT state closing costs or cash to close as the caller\'s own; ask the Next question (the down payment accepts a dollar amount OR a percent).',
    );
  }
  lines.push(`DRAFT reply to speak (stay faithful to this): ${result.reply}`);
  return `CONTEXT (engine-computed — the only numbers you may use):\n${lines.join('\n')}`;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // Optional shared-secret gate so only our phone server can reach the brain.
  const required = process.env.VOICE_SHARED_SECRET;
  if (required) {
    const got = req.headers.get('x-voice-secret');
    if (got !== required) return json({ error: 'unauthorized' }, 401);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const language = (body.language || 'en') as Language;
  const profile = (body.profile || {}) as ScenarioProfile;
  const pendingField = (body.pendingField ?? null) as FieldKey | null;

  const result = runAdvisorTurn({
    text: String(body.text || ''),
    profile,
    language,
    pendingField,
    isFirst: !!body.isFirst,
  });

  // Phrase for speech when a provider is configured and the caller didn't opt out.
  let spoken = result.reply;
  let source: 'ai' | 'local' = 'local';
  const wantPhrase = body.phrase !== false;
  if (wantPhrase && isAiConfigured()) {
    try {
      const history = Array.isArray(body.historySummary) ? body.historySummary.slice(-6) : [];
      const messages = [
        ...history
          .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && m.text)
          .map((m: any) => ({ role: m.role, content: String(m.text).slice(0, 1200) })),
        {
          role: 'user' as const,
          content: `${buildVoiceContext(result)}\n\nCaller just said: ${String(body.text || '').slice(0, 1200)}`,
        },
      ];
      const phrased = await phraseWithAI({
        system: voiceSystemPrompt(language),
        messages,
        maxTokens: 220,
      });
      if (phrased && phrased.trim()) {
        spoken = phrased.trim();
        source = 'ai';
      }
    } catch {
      // Any AI failure → keep the deterministic reply. The line never goes quiet.
      spoken = result.reply;
      source = 'local';
    }
  }

  return json({
    reply: spoken,
    replyLines: result.replyLines,
    source,
    profile: result.profile,
    pendingField: result.pendingField,
    nextQuestion: result.nextQuestion,
    captured: result.captured,
    numbers: result.numbers,
    readyForOptions: result.readyForOptions,
    requiresHumanReview: true,
  });
};

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const config = { path: '/api/voice-advisor-turn' };
