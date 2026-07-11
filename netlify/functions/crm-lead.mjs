// Wallet WCCM — CRM lead proxy.
//
// Forwards INTENTIONAL broker-review lead submissions (Strategy Review Request
// and Document Review contact) to the authorized GR CRM. The CRM webhook URL —
// which contains the access token — lives ONLY here on the server
// (GRCRM_WEBHOOK env var) and is never exposed to the browser.
//
// This is NOT a global form beacon: the client calls it only when the borrower
// deliberately submits for broker review, never on chat input or keystrokes.
//
// If GRCRM_WEBHOOK is not set, returns 501 { error: 'not_configured' }.

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const target = process.env.GRCRM_WEBHOOK; // full URL incl. token — server-only
  if (!target) return json({ error: 'not_configured' }, 501);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  // Map to the CRM's expected shape and bound field sizes.
  const payload = {
    name: String(body.name || '').slice(0, 200),
    email: String(body.email || '').slice(0, 200),
    phone: String(body.phone || '').slice(0, 60),
    message: String(body.message || '').slice(0, 5000),
    source: 'wwccm.com',
  };

  try {
    const res = await fetch(target, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return json({ error: 'upstream_error', status: res.status }, 502);
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'forward_failure', detail: String(err).slice(0, 200) }, 502);
  }
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

export const config = { path: '/api/crm-lead' };
