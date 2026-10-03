const PROTOCOL = 'core-v2.voice-turn.1';
const AUTH_VERSION = 'core-v2-voice-hmac-v1';
const TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 64 * 1024;
const EXPECTED_PATH = '/functions/v1/core-v2-voice-turn';

export function coreVoiceEnabled(environment = process.env) {
  return environment.CORE_V2_VOICE_ENABLED === 'true';
}

export async function runCoreVoiceTurn(body, {
  environment = process.env,
  fetchImpl = fetch,
  nowSeconds = Math.floor(Date.now() / 1000),
  nonce = crypto.randomUUID().replaceAll('-', ''),
} = {}) {
  if (!coreVoiceEnabled(environment)) return null;
  if (!body?.callIdentity || !body?.requestId || !body?.turnId || !Number.isInteger(body?.expectedStateRevision)) {
    throw new Error('core_voice_contract_missing');
  }
  const payload = {
    protocol: PROTOCOL,
    requestId: String(body.requestId),
    callIdentity: String(body.callIdentity),
    turnId: String(body.turnId),
    expectedStateRevision: body.expectedStateRevision,
    language: body.language || 'en',
    utterance: { text: String(body.text || ''), final: true, sttConfidence: null },
    // Client history is delivery evidence, never state authority.
    deliveryEvidence: Array.isArray(body.historySummary) ? body.historySummary.slice(-12).map((entry) => ({
      role: entry.role,
      text: String(entry.text || '').slice(0, 1_200),
      turnRevision: Number.isInteger(entry.turnRevision) ? entry.turnRevision : 0,
      ...(entry.role === 'assistant' ? { delivery: entry.delivery || 'unknown' } : {}),
    })).filter((entry) => entry.role === 'user' || entry.role === 'assistant') : [],
  };
  // Drop unknown delivery values rather than widening the Core contract.
  for (const entry of payload.deliveryEvidence) {
    if (!['pending', 'delivered', 'interrupted', 'failed'].includes(entry.delivery)) delete entry.delivery;
  }
  const plan = await callCore(payload, { environment, fetchImpl, nowSeconds, nonce });
    if (!plan || plan.protocol !== PROTOCOL || plan.requestId !== payload.requestId
      || typeof plan.sessionId !== 'string' || !/^voice_[a-f0-9]{32}$/.test(plan.sessionId)
      || typeof plan.reply !== 'string' || !plan.reply.trim() || plan.reply.length > 2_000
      || plan.stateRevision !== payload.expectedStateRevision + 1
      || !['answer', 'clarify', 'pause', 'resume', 'end', 'human_handoff', 'refuse'].includes(plan.disposition)
      || !['none', 'offer', 'continue', 'stop'].includes(plan.applicationTransition)
      || typeof plan.requiresHumanReview !== 'boolean'
      || !plan.grounding || typeof plan.grounding !== 'object'
      || typeof plan.grounding.grounded !== 'boolean') {
      throw new Error('core_voice_invalid_response');
    }
  return plan;
}

export async function runCoreVoiceAdmission(body, options = {}) {
  const environment = options.environment ?? process.env;
  if (!coreVoiceEnabled(environment)) throw new Error('core_voice_disabled');
  if (!/^CA[a-f0-9]{32}$/i.test(String(body?.callIdentity || ''))
    || !/^[a-f0-9]{64}$/.test(String(body?.ownerIdentityDigest || ''))) {
    throw new Error('core_voice_admission_contract_missing');
  }
  const payload = {
    protocol: 'core-v2.voice-admission.1',
    callIdentity: String(body.callIdentity),
    ownerIdentityDigest: String(body.ownerIdentityDigest),
  };
  const lease = await callCore(payload, options);
  if (!lease || lease.protocol !== 'core-v2.voice-admission.1'
    || typeof lease.suiteId !== 'string'
    || lease.callIdentityDigest == null || !/^[a-f0-9]{64}$/.test(lease.callIdentityDigest)
    || !Number.isSafeInteger(lease.answeredAtMs) || !Number.isSafeInteger(lease.deadlineMs)
    || lease.deadlineMs <= lease.answeredAtMs
    || !Number.isInteger(lease.maximumTurns) || lease.maximumTurns < 1 || lease.maximumTurns > 60
    || !Number.isInteger(lease.maximumBrainRequests) || lease.maximumBrainRequests < 1 || lease.maximumBrainRequests > 100
    || !Number.isInteger(lease.maximumTtsCharacters) || lease.maximumTtsCharacters < 500 || lease.maximumTtsCharacters > 100000
    || typeof lease.repeated !== 'boolean') {
    throw new Error('core_voice_invalid_admission');
  }
  return lease;
}

export async function claimCoreVoiceAdmissionStream(body, options = {}) {
  const environment = options.environment ?? process.env;
  if (!coreVoiceEnabled(environment)) throw new Error('core_voice_disabled');
  if (!/^CA[a-f0-9]{32}$/i.test(String(body?.callIdentity || ''))
    || !/^[A-Za-z0-9_.:-]{1,80}$/.test(String(body?.suiteId || ''))) {
    throw new Error('core_voice_stream_contract_missing');
  }
  const claim = await callCore({
    protocol: 'core-v2.voice-admission-stream.1',
    callIdentity: String(body.callIdentity), suiteId: String(body.suiteId),
  }, options);
  if (!claim || claim.protocol !== 'core-v2.voice-admission-stream.1'
    || claim.suiteId !== body.suiteId || !/^[a-f0-9]{64}$/.test(String(claim.callIdentityDigest || ''))
    || claim.claimed !== true) throw new Error('core_voice_invalid_stream_claim');
  return claim;
}

async function callCore(payload, {
  environment = process.env,
  fetchImpl = fetch,
  nowSeconds = Math.floor(Date.now() / 1000),
  nonce = crypto.randomUUID().replaceAll('-', ''),
} = {}) {
  const url = environment.CORE_V2_VOICE_URL?.trim();
  const keyId = environment.CORE_V2_VOICE_KEY_ID?.trim();
  const secret = environment.CORE_V2_VOICE_HMAC_SECRET;
  if (!url || !keyId || !secret || secret.length < 32) throw new Error('core_voice_not_configured');
  const rawBody = JSON.stringify(payload);
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password
    || parsedUrl.pathname !== EXPECTED_PATH || parsedUrl.search || parsedUrl.hash) {
    throw new Error('core_voice_insecure_url');
  }
  const signature = await sign({ secret, method: 'POST', pathname: parsedUrl.pathname, timestamp: nowSeconds, nonce, rawBody });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, { method: 'POST', redirect: 'error', signal: controller.signal,
      headers: { 'content-type': 'application/json', 'x-core-voice-key-id': keyId,
        'x-core-voice-timestamp': String(nowSeconds), 'x-core-voice-nonce': nonce,
        'x-core-voice-signature': signature }, body: rawBody });
    if (!response.ok) throw new Error(`core_voice_http_${response.status}`);
    return await readBoundedJson(response);
  } finally { clearTimeout(timer); }
}

async function readBoundedJson(response) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) throw new Error('core_voice_response_too_large');
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_RESPONSE_BYTES) throw new Error('core_voice_response_too_large');
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function sign({ secret, method, pathname, timestamp, nonce, rawBody }) {
  const bodyDigest = await digest(rawBody);
  const canonical = [AUTH_VERSION, method.toUpperCase(), pathname, String(timestamp), nonce, bodyDigest].join('\n');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(canonical))));
}

export async function digest(value) {
  return base64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));
}

function base64Url(bytes) {
  return Buffer.from(bytes).toString('base64url');
}
