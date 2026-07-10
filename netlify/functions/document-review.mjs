// Wallet WCCM — Document Review submission route.
//
// Receives documents uploaded for LICENSED BROKER REVIEW (never a completed
// mortgage application) and forwards a structured notification to the broker.
//
// Real file delivery requires a configured destination. If none is set this
// route returns 501 { error: 'not_configured' } so the client can show an
// honest configuration error instead of pretending the documents were sent.
//
// Configure ONE of:
//   DOCUMENT_REVIEW_WEBHOOK  — a Zapier/Make/webhook URL that receives the JSON
//                              notification (and, where supported, the files).
// Optional:
//   DOCUMENT_REVIEW_EMAIL    — reference address included in the notification.
//
// NOTE: forwarding raw file BYTES to arbitrary destinations requires a secure
// file-storage connector (e.g. Netlify Blobs / S3). Until that is wired, this
// route forwards the structured metadata + file names and flags that storage
// is pending, rather than silently dropping bytes.

const MAX_FILES = 10;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const webhook = process.env.DOCUMENT_REVIEW_WEBHOOK;
  if (!webhook) return json({ error: 'not_configured' }, 501);

  let form;
  try {
    form = await req.formData();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  let payload = {};
  try {
    payload = JSON.parse(form.get('payload') || '{}');
  } catch {
    payload = {};
  }

  const files = [];
  for (const [key, value] of form.entries()) {
    if (!key.startsWith('file_')) continue;
    if (value && typeof value === 'object' && 'name' in value) {
      if (value.size > MAX_FILE_BYTES) {
        return json({ error: 'file_too_large', name: value.name }, 413);
      }
      files.push({ name: value.name, size: value.size, type: value.type });
    }
  }
  if (files.length > MAX_FILES) return json({ error: 'too_many_files' }, 413);

  const contact = payload.contact || {};
  const notification = {
    title: 'New Document Review Request',
    disclaimer:
      'These documents were submitted for broker review, not as a completed mortgage application.',
    borrower: {
      name: contact.name || '',
      phone: contact.phone || '',
      email: contact.email || '',
      preferredContactTime: contact.preferredContactTime || '',
      preferredLanguage: contact.preferredLanguage || payload.preferredLanguage || '',
    },
    documentTypes: files.map((f, i) => (payload.documents?.[i]?.type) || 'unknown'),
    fileNames: files.map((f) => f.name),
    borrowerNote: payload.note || '',
    scenarioSummary: payload.originalMessage || '',
    loanStrategyProfile: payload.profile || {},
    missingFields: payload.missingFields || [],
    possibleLoanPaths: payload.possibleLoanPaths || [],
    cashToCloseEstimate: payload.cashToCloseEstimate || null,
    sourceUrl: payload.sourcePage || '',
    utm: payload.utm || {},
    timestamp: payload.timestamp || new Date().toISOString(),
    sessionId: payload.sessionId || '',
    email_reference: process.env.DOCUMENT_REVIEW_EMAIL || undefined,
    fileStorage: 'pending-connector', // bytes require a storage connector; names forwarded
  };

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(notification),
    });
    if (!res.ok) return json({ error: 'upstream_error', status: res.status }, 502);
    return json({ ok: true, id: `dr_${notification.timestamp}` });
  } catch (err) {
    return json({ error: 'forward_failure', detail: String(err).slice(0, 200) }, 502);
  }
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const config = { path: '/api/document-review' };
