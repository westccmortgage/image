# Document Review — Netlify Deploy Preview smoke test

End-to-end verification that uploaded documents are **stored securely**, the
**broker is notified with secure links**, and the **broker can download the
files** — before the borrower is ever shown a success message.

> **Secrets hygiene:** never paste real values of `DOCUMENT_ACCESS_TOKEN`,
> webhook URLs, or storage credentials into commits, screenshots, PR comments,
> chat, or logs. Use placeholders. Generate the token with
> `openssl rand -hex 32` and keep it only in Netlify env settings.

## 0. Preview + environment setup

- Deploy Preview for PR #14: `https://deploy-preview-14--tiny-phoenix-00df09.netlify.app`
- In **Netlify → Site configuration → Environment variables**, add (scope: *Deploy
  previews* or *All*):

  | Key | Value |
  |---|---|
  | `DOCUMENT_STORAGE_PROVIDER` | `netlify-blobs` |
  | `DOCUMENT_REVIEW_WEBHOOK` | a test webhook (e.g. a private `https://webhook.site/…` URL) |
  | `DOCUMENT_ACCESS_TOKEN` | a strong random token (`openssl rand -hex 32`) |

  (No `CONTEXT=production` on previews → real storage runs, no dev-sim.)
- **Trigger a redeploy** of the preview so the function picks up the vars.

## 1–5. Borrower flow

1. Open the preview URL.
2. Type a scenario (e.g. *"$2M home in Santa Clarita, CA, self-employed, $400k
   down"*) and confirm the **Loan Strategy Profile** updates (price, down, loan
   amount, LTV, county = Los Angeles).
3. Click the **📎 paperclip** → *Upload Documents for Broker Review*. Add **one
   PDF** and **one JPG/PNG** (harmless test files only).
4. Pick a **document type** for each file.
5. Enter **test** contact info (name, phone, email, preferred time, language) and
   click **Upload for Broker Review**.

## 6. Success is real, not simulated

Expected only after the function returns 200 (files stored + webhook delivered):
- a **Document Review Submitted** event with each file name + category,
- status **Submitted for broker review**,
- the multilingual **"Documents received…"** confirmation,
- **no** "Development mode" warning (that only appears with `dev-sim`).

## 7. Webhook payload

In the webhook inbox, confirm the JSON `New Document Review Request` includes:
borrower contact, preferred time + language, scenario/profile summary, document
types, **secure per-file links** (`…/api/document-file?key=…&token=…` or signed
URLs), timestamp, session id, and the *"not a completed mortgage application"*
disclaimer.

## 8. Secure download

Open each link from the webhook and verify:
- the actual file **bytes download**, with the **original file name** and correct
  content type;
- the URL is **not** a public bucket URL (it's the token-guarded
  `/api/document-file` endpoint for Netlify Blobs);
- editing the URL to a **wrong/missing token** returns **403 / 400** (no file).

## 9. Frontend + log security

- DevTools → Application → **Local Storage / Session Storage**: confirm **no**
  file bytes, base64, access token, signed-URL credentials, or full payload.
  (The active scenario is intentionally never persisted.)
- The browser response from `/api/document-review` is only
  `{ok,id,dev,stored}` — the token/links are sent to the **webhook only**, never
  to the browser.
- Netlify function logs must not print file contents or secrets.

## 10. Webhook-failure test

Temporarily set `DOCUMENT_REVIEW_WEBHOOK` to a failing endpoint (e.g.
`https://httpstat.us/500`) and redeploy. Submit again and verify:
- the UI shows the **failure** message ("We could not submit your documents
  yet…"), **no** "Documents received";
- **orphaned-file cleanup:** the function best-effort **deletes** the just-stored
  blobs on notify failure and returns `cleanedUp: true`. Any keys it can't delete
  are logged as `orphaned files need reconciliation` (keys only). Confirm the
  test file is **not** left in the Blobs store.

## 11. Storage-failure test

Temporarily break storage (e.g. set `DOCUMENT_STORAGE_PROVIDER=s3` without S3
creds, or an invalid provider) and redeploy. Submit again and verify:
- the webhook is **not** called,
- the UI shows the **failure** message,
- **no** Document Review event is added to the chat.

## 12. Start Over

Select files but **do not submit** → click **Start over** → the modal closes,
unsent files are dropped, and no document metadata remains in the session.

## 13. Mobile (~390px)

Paperclip accessible, upload opens as a bottom sheet, file names/categories
readable, contact fields usable, submit reachable, **no horizontal overflow**.

## 14. Languages

Repeat in **Russian** and **Simplified Chinese** (language selector). Confirm the
modal copy, safety note, contact prompt, status, failure message, and success
confirmation all switch languages.

---

### What is verified automatically (no preview needed)

- `npm test` covers: store-before-notify ordering, success only when both
  succeed, storage/webhook failure gating, orphaned-file cleanup, secure refs in
  the broker payload, dev-sim labeling, and *production-never-simulates*.
- The function handler was runtime-verified: unconfigured→501, dev-sim→ok+dev,
  dev-sim-in-production→refused, storage-unavailable→502; and the retrieval
  endpoint: no-token→501, missing-params→400, wrong-token→403.

### Rollback / token rotation

Netlify Blobs are private and have no auto-expiry. Rotating `DOCUMENT_ACCESS_TOKEN`
immediately invalidates every previously issued retrieval link. Supabase/S3
providers use signed URLs that expire after `DOCUMENT_SIGNED_URL_TTL` (default 7
days).
