import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  crmFieldsFromLead,
  submitCrmLead,
  createGrCrmAdapter,
  buildLead,
  parseScenario,
  mergeProfile,
} from '../index';

const EXAMPLE = "I want to buy a $2M home in California. I'm self-employed and have $400k down.";

function sampleLead() {
  const parsed = parseScenario(EXAMPLE);
  const profile = mergeProfile(parsed, {
    occupancy: 'primary', incomeDocPath: 'bank-statements', name: 'Jane Buyer',
    phone: '310-555-1212', email: 'jane@example.com', preferredContactTime: 'afternoons',
    preferredLanguage: 'en',
  });
  return buildLead({
    originalMessage: EXAMPLE, parsedScenario: parsed, profile, sourcePage: '/',
    now: () => '2026-07-10T00:00:00.000Z',
  });
}

afterEach(() => vi.restoreAllMocks());

describe('CRM lead mapping', () => {
  it('maps to {name,email,phone,message} with a scenario summary', () => {
    const f = crmFieldsFromLead(sampleLead());
    expect(f.name).toBe('Jane Buyer');
    expect(f.email).toBe('jane@example.com');
    expect(f.phone).toBe('310-555-1212');
    expect(f.message).toContain('Purchase price: $2,000,000');
    expect(f.message).toContain('Down payment: $400,000');
    expect(f.message).toContain('Preferred language: en');
    expect(f.message).toContain('Source: /');
  });
  it('never leaks sensitive keys into the CRM message', () => {
    const blob = JSON.stringify(crmFieldsFromLead(sampleLead())).toLowerCase();
    for (const banned of ['ssn', 'dob', 'account number', 'routing']) {
      expect(blob).not.toContain(banned);
    }
  });
});

describe('submitCrmLead posts to the server proxy (token stays server-side)', () => {
  it('POSTs to /api/crm-lead and returns ok on 200', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await submitCrmLead({ name: 'A', email: 'a@x.com', phone: '1', message: 'm' });
    expect(res.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/crm-lead');
    // The client only sends the lead fields — no token, no CRM URL.
    const body = JSON.parse(init.body as string);
    expect(Object.keys(body).sort()).toEqual(['email', 'message', 'name', 'phone']);
    expect(JSON.stringify(body).toLowerCase()).not.toContain('token');
    expect(JSON.stringify(body).toLowerCase()).not.toContain('grcrm');
  });
  it('returns ok:false (best-effort) when the proxy is not configured', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 501 })));
    expect((await submitCrmLead({ name: 'A', email: '', phone: '', message: 'm' })).ok).toBe(false);
  });
  it('never throws on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const res = await submitCrmLead({ name: 'A', email: '', phone: '', message: 'm' });
    expect(res.ok).toBe(false);
  });
});

describe('GR CRM adapter', () => {
  it('submits a lead through the /api/crm-lead proxy', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await createGrCrmAdapter().submit(sampleLead());
    expect(res.ok).toBe(true);
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe('/api/crm-lead');
  });
});
