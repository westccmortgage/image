// Wallet WCCM — private document retrieval for broker review.
//
// Netlify Blobs are private (no public URL). The broker's link points here with
// a shared access token. This endpoint verifies the token, streams the file,
// and forces a download. Rotating DOCUMENT_ACCESS_TOKEN revokes every issued
// link. (Supabase/S3 providers use their own signed URLs and do not use this.)

const STORE_NAME = 'document-review';

export default async (req) => {
  if (req.method !== 'GET') return text('method_not_allowed', 405);

  const token = process.env.DOCUMENT_ACCESS_TOKEN;
  if (!token) return text('not_configured', 501);

  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  const provided = url.searchParams.get('token');
  if (!key || !provided) return text('bad_request', 400);
  if (!safeEqual(provided, token)) return text('forbidden', 403);

  let getStore;
  try {
    ({ getStore } = await import('@netlify/blobs'));
  } catch (e) {
    return text(`storage_unavailable: ${e}`, 502);
  }

  const store = getStore(STORE_NAME);
  const blob = await store.get(key, { type: 'arrayBuffer' });
  if (!blob) return text('not_found', 404);

  const meta = await store.getMetadata(key).catch(() => null);
  const filename = meta?.metadata?.name || key.split('/').pop() || 'document';
  return new Response(blob, {
    status: 200,
    headers: {
      'content-type': 'application/octet-stream',
      'content-disposition': `attachment; filename="${filename.replace(/"/g, '')}"`,
      'cache-control': 'private, no-store',
    },
  });
};

// Length-aware constant-time-ish comparison.
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function text(body, status = 200) {
  return new Response(body, { status, headers: { 'content-type': 'text/plain' } });
}

export const config = { path: '/api/document-file' };
