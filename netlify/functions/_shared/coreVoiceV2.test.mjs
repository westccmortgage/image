import { describe, expect, it, vi } from 'vitest';

import { runCoreVoiceTurn, sign } from './coreVoiceV2.mjs';

const SECRET = 'local-fixture-secret-that-is-at-least-thirty-two-characters';
const URL = 'https://example.test/functions/v1/core-v2-voice-turn';
const body = {
  text: 'Can you hear me?',
  language: 'en',
  callIdentity: 'CA0123456789abcdef0123456789abcdef',
  requestId: 'request:call:1',
  turnId: 'call:1',
  expectedStateRevision: 0,
  historySummary: [{ role: 'assistant', text: 'Welcome', turnRevision: 0, delivery: 'delivered' }],
};

describe('disabled Core voice adapter', () => {
  it('performs no request unless explicitly enabled', async () => {
    const fetchImpl = vi.fn();
    expect(await runCoreVoiceTurn(body, { environment: {}, fetchImpl })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fails closed when enabled without a complete service credential', async () => {
    await expect(runCoreVoiceTurn(body, {
      environment: { CORE_V2_VOICE_ENABLED: 'true', CORE_V2_VOICE_URL: URL },
      fetchImpl: vi.fn(),
    })).rejects.toThrow('core_voice_not_configured');
  });

  it('rejects a non-HTTPS Core endpoint even when credentials are present', async () => {
    await expect(runCoreVoiceTurn(body, {
      environment: {
        CORE_V2_VOICE_ENABLED: 'true', CORE_V2_VOICE_URL: 'http://core.example.test/voice',
        CORE_V2_VOICE_KEY_ID: 'netlify-wallet-voice', CORE_V2_VOICE_HMAC_SECRET: SECRET,
      },
      fetchImpl: vi.fn(),
    })).rejects.toThrow('core_voice_insecure_url');
  });

  it('signs the exact bounded body and never forwards tenant, policy, or budget authority', async () => {
    const nowSeconds = 1_800_000_000;
    const nonce = 'abcdefghijklmnop';
    const fetchImpl = vi.fn(async (_url, init) => {
      const sent = JSON.parse(init.body);
      expect(sent.tenantId).toBeUndefined();
      expect(sent.policy).toBeUndefined();
      expect(sent.budget).toBeUndefined();
      expect(sent.deliveryEvidence[0].delivery).toBe('delivered');
      expect(init.redirect).toBe('error');
      expect(init.headers['x-core-voice-signature']).toBe(await sign({
        secret: SECRET,
        method: 'POST',
        pathname: '/functions/v1/core-v2-voice-turn',
        timestamp: nowSeconds,
        nonce,
        rawBody: init.body,
      }));
      return new Response(JSON.stringify({
        protocol: 'core-v2.voice-turn.1',
        requestId: body.requestId,
        sessionId: 'voice_0123456789abcdef0123456789abcdef',
        reply: 'Yes, I can hear you.',
        stateRevision: 1,
        disposition: 'answer',
        grounding: { grounded: true },
        applicationTransition: 'none',
        requiresHumanReview: false,
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    const plan = await runCoreVoiceTurn(body, {
      environment: {
        CORE_V2_VOICE_ENABLED: 'true',
        CORE_V2_VOICE_URL: URL,
        CORE_V2_VOICE_KEY_ID: 'netlify-wallet-voice',
        CORE_V2_VOICE_HMAC_SECRET: SECRET,
      },
      fetchImpl, nowSeconds, nonce,
    });
    expect(plan.reply).toBe('Yes, I can hear you.');
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('rejects a misrouted request or an arbitrary state revision', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      protocol: 'core-v2.voice-turn.1',
      requestId: 'request:another-call:1',
      sessionId: 'voice_0123456789abcdef0123456789abcdef',
      reply: 'This response belongs elsewhere.',
      stateRevision: 999,
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    await expect(runCoreVoiceTurn(body, {
      environment: {
        CORE_V2_VOICE_ENABLED: 'true', CORE_V2_VOICE_URL: URL,
        CORE_V2_VOICE_KEY_ID: 'netlify-wallet-voice', CORE_V2_VOICE_HMAC_SECRET: SECRET,
      },
      fetchImpl,
    })).rejects.toThrow('core_voice_invalid_response');
  });

  it('rejects credential-bearing URLs, redirects, and oversized responses', async () => {
    const environment = {
      CORE_V2_VOICE_ENABLED: 'true', CORE_V2_VOICE_URL: 'https://user:pass@example.test/functions/v1/core-v2-voice-turn',
      CORE_V2_VOICE_KEY_ID: 'netlify-wallet-voice', CORE_V2_VOICE_HMAC_SECRET: SECRET,
    };
    await expect(runCoreVoiceTurn(body, { environment, fetchImpl: vi.fn() }))
      .rejects.toThrow('core_voice_insecure_url');

    environment.CORE_V2_VOICE_URL = URL;
    const redirecting = vi.fn(async () => new Response(null, {
      status: 302, headers: { location: 'https://attacker.example.test/steal' },
    }));
    await expect(runCoreVoiceTurn(body, { environment, fetchImpl: redirecting }))
      .rejects.toThrow('core_voice_http_302');
    expect(redirecting.mock.calls[0][1].redirect).toBe('error');

    const oversized = vi.fn(async () => new Response('x'.repeat(65 * 1024)));
    await expect(runCoreVoiceTurn(body, { environment, fetchImpl: oversized }))
      .rejects.toThrow('core_voice_response_too_large');
  });
});
