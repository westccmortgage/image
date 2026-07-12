// Wallet WCCM — CRM lead proxy.
//
// Forwards INTENTIONAL broker-review lead submissions (Strategy Review Request
// and Document Review contact) to the authorized GR CRM. Credentials live ONLY
// here on the server and are never exposed to the browser.
//
// Two supported credential schemes (either works):
//   • Legacy single var:  GRCRM_WEBHOOK  (full URL, token embedded in the URL)
//   • Split vars (spec):  GR_CRM_WEBHOOK_URL + optional GR_CRM_WEBHOOK_TOKEN
//                         (token sent as `Authorization: Bearer <token>`)
//
// This is NOT a global form beacon: the client calls it only when the borrower
// deliberately submits for broker review, never on chat input or keystrokes.
//
// Fail closed: if delivery is disabled or no credentials are configured, we do
// NOT report success. The browser only ever receives an authoritative ok/error
// — never the token, URL, or CRM internals.

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // Feature flag — explicit "false"/"0"/"off" disables delivery (fail closed).
  const flag = process.env.GRCRM_DELIVERY_ENABLED;
  if (flag != null && /^(false|0|off|no)$/i.test(String(flag).trim())) {
    return json({ error: 'delivery_disabled' }, 503);
  }

  const { url: target, token } = resolveCredentials();
  if (!target) return json({ error: 'not_configured' }, 501);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const leadType = body.leadType === 'document_review' ? 'document_review' : 'strategy_review';

  // Map to the CRM's expected shape and bound field sizes. Source metadata is
  // attached for lead attribution (harmless extra fields).
  const payload = {
    name: String(body.name || '').slice(0, 200),
    email: String(body.email || '').slice(0, 200),
    phone: String(body.phone || '').slice(0, 60),
    message: String(body.message || '').slice(0, 5000),
    source: 'walletwccm.com',
    sourceProduct: 'wwccm',
    sourceExperience: 'ai_mortgage_strategy_advisor',
    leadType,
  };

  const headers = { 'content-type': 'application/json' };
  if (token) headers['authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(target, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) return json({ error: 'upstream_error', status: res.status }, 502);
    return json({ ok: true });
  } catch (err) {
    // Never echo the target URL / token in errors.
    return json({ error: 'forward_failure', detail: String(err?.name || 'error').slice(0, 60) }, 502);
  }
};

/** Resolve CRM credentials from either the split or legacy env scheme. */
function resolveCredentials() {
  const splitUrl = process.env.GR_CRM_WEBHOOK_URL;
  if (splitUrl) return { url: splitUrl, token: process.env.GR_CRM_WEBHOOK_TOKEN || '' };
  const legacy = process.env.GRCRM_WEBHOOK; // full URL incl. token
  if (legacy) return { url: legacy, token: '' };
  return { url: '', token: '' };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

export const config = { path: '/api/crm-lead' };
