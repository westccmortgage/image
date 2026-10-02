// Wallet WCCM — provider-agnostic AI "phrasing" layer.
//
// WHY: the deterministic engine is the ONLY source of numbers. The AI's single
// job is to PHRASE an assistant message grounded in those numbers. That phrasing
// call can go to Anthropic directly, OR through the Measured Decision V2
// Cloudflare AI Gateway, which already fronts OpenAI, Anthropic and Google with
// unified billing/logging/fallback. Switching is one env var — NO advisor logic
// (parsing, question order, calculations, compliance) changes.
//
// Select the backend with WWCCM_AI_PROVIDER:
//   'anthropic'   (default) → api.anthropic.com directly (needs ANTHROPIC_API_KEY)
//   'cf-anthropic'          → V2 gateway, Anthropic Messages format (Claude models)
//   'cf-openai'             → V2 gateway, OpenAI Chat Completions format
//   'cf-google'             → V2 gateway, Google AI Studio (Gemini) format
//
// Gateway env (same names the V2 Supabase project already stores):
//   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_AI_GATEWAY_ID, CLOUDFLARE_AI_GATEWAY_TOKEN
// Provider keys when NOT using the gateway's stored "BYOK"/unified keys:
//   ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY (a.k.a. GEMINI_API_KEY)
// Set WWCCM_AI_GATEWAY_BYOK=true if the gateway injects provider keys for you
// (then the per-provider key above is not required here).
//
// The model id is WWCCM_MODEL; its meaning depends on the provider:
//   Anthropic → e.g. claude-haiku-4-5 / claude-sonnet-5 / claude-opus-5
//   OpenAI    → e.g. gpt-5.6-sol / gpt-4.1-mini
//   Google    → e.g. gemini-2.5-flash

const ANTHROPIC_VERSION = '2023-06-01';

export function aiProvider() {
  return (process.env.WWCCM_AI_PROVIDER || 'anthropic').toLowerCase();
}

export function defaultModel() {
  if (process.env.WWCCM_MODEL) return process.env.WWCCM_MODEL;
  switch (aiProvider()) {
    case 'cf-openai':
      return 'gpt-4.1-mini';
    case 'cf-google':
      return 'gemini-2.5-flash';
    default:
      return 'claude-haiku-4-5';
  }
}

const byok = () => String(process.env.WWCCM_AI_GATEWAY_BYOK || '').toLowerCase() === 'true';

function gatewayBase() {
  const acct = process.env.CLOUDFLARE_ACCOUNT_ID;
  const gw = process.env.CLOUDFLARE_AI_GATEWAY_ID;
  if (!acct || !gw) return null;
  return `https://gateway.ai.cloudflare.com/v1/${acct}/${gw}`;
}

/**
 * Is the selected provider fully configured? If not, the route should return 501
 * so the client falls back to deterministic local phrasing — never an error page.
 */
export function isAiConfigured() {
  const provider = aiProvider();
  if (provider === 'anthropic') return !!process.env.ANTHROPIC_API_KEY;

  // All cf-* providers need the gateway coordinates + token.
  const gwReady =
    !!gatewayBase() && !!process.env.CLOUDFLARE_AI_GATEWAY_TOKEN;
  if (!gwReady) return false;
  if (byok()) return true; // gateway supplies the provider key
  if (provider === 'cf-anthropic') return !!process.env.ANTHROPIC_API_KEY;
  if (provider === 'cf-openai') return !!process.env.OPENAI_API_KEY;
  if (provider === 'cf-google')
    return !!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
  return false;
}

/** A small, descriptive label for logs/health (never includes secrets). */
export function aiBackendLabel() {
  return `${aiProvider()}:${defaultModel()}`;
}

class AiError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.status = status || 502;
    this.detail = detail || '';
  }
}

/**
 * Phrase an assistant message. Provider-neutral input:
 *   { system: string, messages: [{role:'user'|'assistant', content:string}], model?, maxTokens? }
 * Returns a plain string (the assistant's text). Throws AiError on failure.
 */
export async function phraseWithAI({ system, messages, model, maxTokens = 500 }) {
  const mdl = model || defaultModel();
  const provider = aiProvider();
  switch (provider) {
    case 'anthropic':
      return anthropicMessages({ url: ANTHROPIC_DIRECT_URL, system, messages, model: mdl, maxTokens });
    case 'cf-anthropic':
      return anthropicMessages({
        url: `${requireGateway()}/anthropic/v1/messages`,
        system,
        messages,
        model: mdl,
        maxTokens,
        viaGateway: true,
      });
    case 'cf-openai':
      return openAiChat({ system, messages, model: mdl, maxTokens });
    case 'cf-google':
      return googleGenerate({ system, messages, model: mdl, maxTokens });
    default:
      throw new AiError('unknown_provider', 500, provider);
  }
}

const ANTHROPIC_DIRECT_URL = 'https://api.anthropic.com/v1/messages';

function requireGateway() {
  const base = gatewayBase();
  if (!base) throw new AiError('gateway_not_configured', 501, 'missing CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_AI_GATEWAY_ID');
  return base;
}

/** Gateway auth header (authorizes the call TO the gateway itself). */
function gatewayHeaders() {
  const token = process.env.CLOUDFLARE_AI_GATEWAY_TOKEN;
  return token ? { 'cf-aig-authorization': `Bearer ${token}` } : {};
}

// --- Anthropic Messages format (direct or via gateway) --------------------
async function anthropicMessages({ url, system, messages, model, maxTokens, viaGateway }) {
  const headers = {
    'content-type': 'application/json',
    'anthropic-version': ANTHROPIC_VERSION,
  };
  // When going through the gateway with BYOK/stored keys, the provider key is
  // injected by Cloudflare and we must not send our own.
  if (!(viaGateway && byok())) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new AiError('anthropic_key_missing', 501, 'ANTHROPIC_API_KEY not set');
    headers['x-api-key'] = key;
  }
  if (viaGateway) Object.assign(headers, gatewayHeaders());

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new AiError('upstream_error', 502, `${resp.status} ${detail.slice(0, 400)}`);
  }
  const data = await resp.json();
  const text = Array.isArray(data.content)
    ? data.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
    : '';
  if (!text) throw new AiError('empty_reply', 502, 'anthropic returned no text');
  return text;
}

// --- OpenAI Chat Completions via gateway ----------------------------------
async function openAiChat({ system, messages, model, maxTokens }) {
  const url = `${requireGateway()}/openai/v1/chat/completions`;
  const headers = { 'content-type': 'application/json', ...gatewayHeaders() };
  if (!byok()) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new AiError('openai_key_missing', 501, 'OPENAI_API_KEY not set');
    headers['authorization'] = `Bearer ${key}`;
  }
  const chatMessages = [
    { role: 'system', content: system },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];
  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: chatMessages }),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new AiError('upstream_error', 502, `${resp.status} ${detail.slice(0, 400)}`);
  }
  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content?.trim() || '';
  if (!text) throw new AiError('empty_reply', 502, 'openai returned no text');
  return text;
}

// --- Google AI Studio (Gemini) via gateway --------------------------------
async function googleGenerate({ system, messages, model, maxTokens }) {
  const base = `${requireGateway()}/google-ai-studio/v1/models/${encodeURIComponent(model)}:generateContent`;
  const headers = { 'content-type': 'application/json', ...gatewayHeaders() };
  let url = base;
  if (!byok()) {
    const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!key) throw new AiError('google_key_missing', 501, 'GOOGLE_API_KEY / GEMINI_API_KEY not set');
    headers['x-goog-api-key'] = key;
  }
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { maxOutputTokens: maxTokens },
  };
  const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new AiError('upstream_error', 502, `${resp.status} ${detail.slice(0, 400)}`);
  }
  const data = await resp.json();
  const text = (data?.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || '')
    .join('')
    .trim();
  if (!text) throw new AiError('empty_reply', 502, 'google returned no text');
  return text;
}
