import { afterEach, describe, expect, it, vi } from 'vitest';

import voiceAdmission from './voice-admission.mts';

const OWNER = '+14245550123';
const CALL = 'CA0123456789abcdef0123456789abcdef';
const SECRET = 'render-to-netlify-fixture-secret';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function configure() {
  vi.stubEnv('VOICE_SHARED_SECRET', SECRET);
  vi.stubEnv('VOICE_TEST_ALLOWED_CALLER', OWNER);
  vi.stubEnv('CORE_V2_VOICE_ENABLED', 'true');
  vi.stubEnv('CORE_V2_VOICE_URL', 'https://core.example.test/functions/v1/core-v2-voice-turn');
  vi.stubEnv('CORE_V2_VOICE_KEY_ID', 'netlify-wallet-voice');
  vi.stubEnv('CORE_V2_VOICE_HMAC_SECRET', 'core-fixture-secret-that-is-at-least-thirty-two-characters');
}

describe('voice admission boundary', () => {
  it('rejects unauthenticated and non-owner calls before Core', async () => {
    configure();
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    const unauthorized = await voiceAdmission(new Request('https://walletwccm.com/api/voice-admission', {
      method: 'POST', body: JSON.stringify({ action: 'admit', callIdentity: CALL, caller: OWNER }),
    }));
    expect(unauthorized.status).toBe(401);
    const wrongOwner = await voiceAdmission(new Request('https://walletwccm.com/api/voice-admission', {
      method: 'POST', headers: { 'x-voice-secret': SECRET },
      body: JSON.stringify({ action: 'admit', callIdentity: CALL, caller: '+14245550999' }),
    }));
    expect(wrongOwner.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('hashes the exact owner before the signed Core request', async () => {
    configure();
    const fetchMock = vi.fn(async (_url, init) => {
      const sent = JSON.parse(init.body);
      expect(sent).toEqual({ protocol: 'core-v2.voice-admission.1', callIdentity: CALL,
        ownerIdentityDigest: 'a429301c2976bf5fab4c6288327f3ea563211c2a1332429e0d63e6d8e0ae1af5' });
      expect(sent.caller).toBeUndefined();
      return new Response(JSON.stringify({ protocol: 'core-v2.voice-admission.1', suiteId: 'owner-call-1',
        callIdentityDigest: 'b'.repeat(64), answeredAtMs: 1800000000000, deadlineMs: 1800000120000,
        maximumTurns: 6, maximumBrainRequests: 12, maximumTtsCharacters: 8000, repeated: false }));
    });
    vi.stubGlobal('fetch', fetchMock);
    const response = await voiceAdmission(new Request('https://walletwccm.com/api/voice-admission', {
      method: 'POST', headers: { 'x-voice-secret': SECRET },
      body: JSON.stringify({ action: 'admit', callIdentity: CALL, caller: OWNER }),
    }));
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
