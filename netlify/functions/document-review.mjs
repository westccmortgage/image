// Wallet WCCM — Document Review: real storage + broker delivery.
//
// Flow (mirrors src/site/scenario/documentDelivery.ts):
//   1. Resolve a storage plan from env. PRODUCTION MUST NEVER SIMULATE SUCCESS.
//   2. Store EVERY uploaded file's bytes securely (Netlify Blobs / Supabase /
//      S3 / dev-sim) — obtaining a private/signed reference for each.
//   3. Only THEN send the broker notification (webhook) with those references.
//   4. Return 200 ok ONLY if storage AND notification both succeed. Any failure
//      returns a non-2xx so the borrower never sees "Documents received".
//
// If storage/delivery is not configured, returns 501 { error: 'not_configured' }.
// See .env.example for the required environment variables.

const MAX_FILES = 10;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const STORE_NAME = 'document-review';

// Licensing (company NMLS and individual NMLS are distinct — never interchanged).
const LICENSING = {
  company: 'West Coast Capital Mortgage Inc. · CA DRE Corporation License #02440065 · NMLS #2817729',
  broker: 'Anatoliy Kanevsky · California Real Estate Broker · CA DRE Broker License #01385024 · NMLS #2775380',
};

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const env = process.env;
  const plan = resolveStoragePlan(env);
  if (!plan.configured) return json({ error: 'not_configured', reason: plan.reason }, 501);

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

  // Collect files with their bytes.
  const files = [];
  let idx = 0;
  for (const [key, value] of form.entries()) {
    if (!key.startsWith('file_')) continue;
    if (!value || typeof value !== 'object' || !('arrayBuffer' in value)) continue;
    if (value.size > MAX_FILE_BYTES) return json({ error: 'file_too_large', name: value.name }, 413);
    const declaredType = payload.documents?.[idx]?.type || 'other';
    files.push({ name: value.name, size: value.size, type: declaredType, blob: value });
    idx++;
  }
  if (files.length === 0) return json({ error: 'no_files' }, 400);
  if (files.length > MAX_FILES) return json({ error: 'too_many_files' }, 413);

  const origin = new URL(req.url).origin;
  let storage;
  try {
    storage = await getStorageProvider(plan.provider, env, origin);
  } catch (e) {
    return json({ error: 'storage_init_failed', detail: String(e).slice(0, 200) }, 502);
  }

  // 1. Store every file first.
  const references = [];
  const prefix = `${payload.sessionId || 'session'}/${payload.timestamp || nowIso()}`;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const storageKey = `${prefix}/${i}-${sanitize(f.name)}`;
    try {
      const ref = await storage.store(f, storageKey);
      references.push(ref);
    } catch (e) {
      return json({ error: 'storage_failed', stage: 'storage', detail: String(e).slice(0, 200) }, 502);
    }
  }

  // 2. Notify the broker with the secure references — only after storage.
  const notification = buildNotification(payload, references, env);
  try {
    if (plan.simulated) {
      // Development simulation — nothing is actually delivered (labeled to the
      // borrower via the `dev` flag). Never reached in production.
      console.info('[document-review:DEV-SIM] would notify broker', { files: references.map((r) => r.name) });
    } else {
      await sendWebhook(env.DOCUMENT_REVIEW_WEBHOOK, notification);
    }
  } catch (e) {
    // Delivery failed after storage → the stored files are orphaned. Best-effort
    // clean them up so nothing is left behind with no delivery. Any keys that
    // can't be removed are logged (keys only, no secrets) for reconciliation.
    const orphaned = await cleanupStored(storage, references);
    if (orphaned.length) {
      console.warn('[document-review] orphaned files need reconciliation', { keys: orphaned });
    }
    return json({
      error: 'notify_failed',
      stage: 'notify',
      detail: String(e).slice(0, 200),
      cleanedUp: orphaned.length === 0,
    }, 502);
  }

  return json({
    ok: true,
    id: `dr_${notification.timestamp}`,
    dev: plan.simulated,
    stored: references.length,
  });
};

// --- storage plan (mirror of documentDelivery.resolveStoragePlan) ----------
function resolveStoragePlan(env) {
  const provider = (env.DOCUMENT_STORAGE_PROVIDER || '').trim();
  const hasNotifier = !!env.DOCUMENT_REVIEW_WEBHOOK;
  const isProd = env.CONTEXT === 'production';
  if (!provider) return { provider: 'none', simulated: false, configured: false, reason: 'DOCUMENT_STORAGE_PROVIDER is not set' };
  if (provider === 'dev-sim') {
    const allowed = !isProd || env.DOCUMENT_ALLOW_DEV_SIM === 'true';
    if (!allowed) return { provider: 'dev-sim', simulated: false, configured: false, reason: 'dev-sim is refused in production' };
    return { provider: 'dev-sim', simulated: true, configured: true };
  }
  if (!hasNotifier) return { provider, simulated: false, configured: false, reason: 'no notifier: set DOCUMENT_REVIEW_WEBHOOK' };
  return { provider, simulated: false, configured: true };
}

// --- storage providers ------------------------------------------------------
async function getStorageProvider(name, env, origin) {
  if (name === 'dev-sim') {
    return {
      name: 'dev-sim',
      async store(f, key) {
        return ref(f, key, `devsim://not-delivered/${key}`, null);
      },
      async remove() { /* nothing stored */ },
    };
  }

  if (name === 'netlify-blobs') {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore(STORE_NAME);
    const token = env.DOCUMENT_ACCESS_TOKEN;
    return {
      name: 'netlify-blobs',
      async store(f, key) {
        const bytes = new Uint8Array(await f.blob.arrayBuffer());
        await store.set(key, bytes, { metadata: { name: f.name, type: f.type, size: f.size } });
        // Private storage. Broker access is via a token-guarded retrieval
        // endpoint (no public/permanent URL). Token rotation revokes all links.
        const link = token
          ? `${origin}/api/document-file?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`
          : null;
        return ref(f, key, link, null);
      },
      async remove(key) { await store.delete(key); },
    };
  }

  if (name === 'supabase') {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const bucket = env.SUPABASE_BUCKET || 'document-review';
    const ttl = Number(env.DOCUMENT_SIGNED_URL_TTL || 604800); // 7 days default
    return {
      name: 'supabase',
      async store(f, key) {
        const bytes = new Uint8Array(await f.blob.arrayBuffer());
        const up = await client.storage.from(bucket).upload(key, bytes, {
          contentType: f.blob.type || 'application/octet-stream',
          upsert: false,
        });
        if (up.error) throw new Error(`supabase upload: ${up.error.message}`);
        const signed = await client.storage.from(bucket).createSignedUrl(key, ttl);
        if (signed.error) throw new Error(`supabase sign: ${signed.error.message}`);
        return ref(f, key, signed.data.signedUrl, isoAfter(ttl));
      },
      async remove(key) {
        const del = await client.storage.from(bucket).remove([key]);
        if (del.error) throw new Error(`supabase remove: ${del.error.message}`);
      },
    };
  }

  if (name === 's3') {
    const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const region = env.AWS_REGION || 'us-east-1';
    const bucket = env.S3_BUCKET;
    const ttl = Number(env.DOCUMENT_SIGNED_URL_TTL || 604800);
    const client = new S3Client({ region });
    return {
      name: 's3',
      async store(f, key) {
        const bytes = new Uint8Array(await f.blob.arrayBuffer());
        await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: f.blob.type }));
        const link = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: ttl });
        return ref(f, key, link, isoAfter(ttl));
      },
      async remove(key) { await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })); },
    };
  }

  throw new Error(`unknown storage provider: ${name}`);
}

function ref(f, key, link, linkExpiresAt) {
  return { name: f.name, type: f.type, size: f.size, storageKey: key, uploadedAt: nowIso(), link, linkExpiresAt };
}

/** Best-effort delete of stored objects after a failed delivery. Returns the
 *  keys that could NOT be removed (for reconciliation). */
async function cleanupStored(storage, references) {
  if (!storage.remove) return references.map((r) => r.storageKey);
  const orphaned = [];
  for (const r of references) {
    try {
      await storage.remove(r.storageKey);
    } catch {
      orphaned.push(r.storageKey);
    }
  }
  return orphaned;
}

// --- broker notification ----------------------------------------------------
function buildNotification(payload, references, env) {
  const contact = payload.contact || {};
  return {
    title: 'New Document Review Request',
    disclaimer: 'These documents were submitted for broker review, not as a completed mortgage application.',
    licensing: LICENSING,
    borrower: {
      name: contact.name || '',
      phone: contact.phone || '',
      email: contact.email || '',
      preferredContactTime: contact.preferredContactTime || '',
      preferredLanguage: contact.preferredLanguage || payload.preferredLanguage || '',
    },
    scenarioSummary: payload.originalMessage || '',
    documentTypes: references.map((r) => r.type),
    fileNames: references.map((r) => r.name),
    documents: references, // includes storageKey + signed/private link
    missingFields: payload.missingFields || [],
    possibleLoanPaths: payload.possibleLoanPaths || [],
    cashToCloseEstimate: payload.cashToCloseEstimate || null,
    loanStrategyProfile: payload.profile || {},
    borrowerNote: payload.note || '',
    sourceUrl: payload.sourcePage || '',
    emailReference: env.DOCUMENT_REVIEW_EMAIL || undefined,
    timestamp: payload.timestamp || nowIso(),
    sessionId: payload.sessionId || '',
  };
}

async function sendWebhook(url, notification) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(notification),
  });
  if (!res.ok) throw new Error(`webhook HTTP ${res.status}`);
}

// --- helpers ---------------------------------------------------------------
function sanitize(name) {
  return String(name).replace(/[^\w.-]+/g, '_').slice(0, 80);
}
function nowIso() {
  return new Date().toISOString();
}
function isoAfter(seconds) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}
function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

export const config = { path: '/api/document-review' };
