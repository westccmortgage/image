import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../../../../netlify/functions/voice-advisor-turn.mts';

const url = 'https://walletwccm.com/api/voice-advisor-turn';

function request(secret?: string, body: unknown = { text: 'Purchase price is 800000', phrase: false }) {
  return new Request(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(secret ? { 'x-voice-secret': secret } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('voice advisor endpoint security', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('fails closed when the server secret is missing', async () => {
    vi.stubEnv('VOICE_SHARED_SECRET', '');
    const response = await handler(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'service_not_configured' });
  });

  it('rejects a missing or incorrect caller secret', async () => {
    vi.stubEnv('VOICE_SHARED_SECRET', 'correct-secret');
    expect((await handler(request())).status).toBe(401);
    expect((await handler(request('wrong-secret'))).status).toBe(401);
  });

  it('accepts an authenticated deterministic turn without contacting AI', async () => {
    vi.stubEnv('VOICE_SHARED_SECRET', 'correct-secret');
    vi.stubEnv('VOICE_ALLOW_AI_PHRASING', '');
    vi.stubEnv('ANTHROPIC_API_KEY', 'configured-but-unused');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const response = await handler(request('correct-secret', { text: 'Purchase price is 800000', phrase: true }));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.source).toBe('local');
    expect(payload.requiresHumanReview).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('never falls back to the questionnaire when conversational Core is enabled but unconfigured', async () => {
    vi.stubEnv('VOICE_SHARED_SECRET', 'correct-secret');
    vi.stubEnv('CORE_V2_VOICE_ENABLED', 'true');
    vi.stubEnv('CORE_V2_VOICE_URL', '');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const response = await handler(request('correct-secret', {
      text: 'Can you explain a HELOC?',
      callIdentity: 'CA0123456789abcdef0123456789abcdef',
      requestId: 'request:CA0123456789abcdef0123456789abcdef:1',
      turnId: 'CA0123456789abcdef0123456789abcdef:1',
      expectedStateRevision: 0,
    }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'core_voice_unavailable' });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('rejects invalid and oversized transcript input', async () => {
    vi.stubEnv('VOICE_SHARED_SECRET', 'correct-secret');
    expect((await handler(request('correct-secret', { text: '' }))).status).toBe(400);
    expect((await handler(request('correct-secret', { text: 'x'.repeat(2001) }))).status).toBe(400);
  });
});
