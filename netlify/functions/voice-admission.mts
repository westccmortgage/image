import { claimCoreVoiceAdmissionStream, runCoreVoiceAdmission } from './_shared/coreVoiceV2.mjs';

declare const process: { env: Record<string, string | undefined> };

const E164 = /^\+[1-9][0-9]{7,14}$/;
const CALL_SID = /^CA[a-f0-9]{32}$/i;

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const sharedSecret = process.env.VOICE_SHARED_SECRET;
  if (!sharedSecret) return json({ error: 'service_not_configured' }, 503);
  const supplied = req.headers.get('x-voice-secret');
  if (!supplied || !(await secureEqual(supplied, sharedSecret))) return json({ error: 'unauthorized' }, 401);

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 2_000) return json({ error: 'payload_too_large' }, 413);
    body = JSON.parse(raw);
  } catch { return json({ error: 'bad_request' }, 400); }
  const action = String(body?.action || 'admit');
  const callIdentity = String(body?.callIdentity || '');
  const caller = String(body?.caller || '');
  if (!CALL_SID.test(callIdentity) || !E164.test(caller)
    || !['admit', 'claim_stream'].includes(action)
    || Object.keys(body).some((key) => !['action', 'callIdentity', 'caller', 'suiteId'].includes(key))) {
    return json({ error: 'bad_request' }, 400);
  }

  const allowedCaller = process.env.VOICE_TEST_ALLOWED_CALLER || '';
  if (!E164.test(allowedCaller) || !(await secureEqual(caller, allowedCaller))) {
    return json({ error: 'caller_not_admitted' }, 403);
  }
  try {
    if (action === 'claim_stream') {
      const suiteId = String(body.suiteId || '');
      if (!/^[A-Za-z0-9_.:-]{1,80}$/.test(suiteId)) return json({ error: 'bad_request' }, 400);
      return json(await claimCoreVoiceAdmissionStream({ callIdentity, suiteId }), 200);
    }
    const ownerIdentityDigest = await sha256Hex(caller);
    const lease = await runCoreVoiceAdmission({ callIdentity, ownerIdentityDigest });
    return json(lease, 200);
  } catch {
    // Admission is a purchase boundary. Any timeout or ambiguous outcome is
    // fail-closed; the caller service must not blindly retry it.
    return json({ error: 'admission_unavailable' }, 503);
  }
};

async function sha256Hex(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function secureEqual(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ]);
  const av = new Uint8Array(a); const bv = new Uint8Array(b);
  let difference = av.length ^ bv.length;
  for (let i = 0; i < av.length; i += 1) difference |= av[i] ^ bv[i];
  return difference === 0;
}

function json(value: unknown, status: number): Response {
  return new Response(JSON.stringify(value), { status, headers: {
    'content-type': 'application/json', 'cache-control': 'no-store',
  } });
}

export const config = { path: '/api/voice-admission' };
