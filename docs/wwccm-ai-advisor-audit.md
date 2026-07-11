# WWCCM — AI Mortgage Strategy Advisor: Implementation Audit

> Project: **WWCCM** — West Coast Capital Mortgage Inc. (`wwccm.com`).
> Repo: `github.com/westccmortgage/image`. Branch: `claude/cash-to-close-advisor-ccdx9u`.
> This document contains **no secret values**.

This audit records the state of the WWCCM advisor before/at the start of the
production-hardening phase, so behavior changes can be reviewed against a known
baseline. It is scoped **only** to WWCCM — it does not touch, import, or mirror
WCCI.online architecture.

## 1. Project isolation (verified)

| Check | Value |
|---|---|
| Working directory | `/home/user/image` |
| Git remote | `https://github.com/westccmortgage/image` |
| Active branch | `claude/cash-to-close-advisor-ccdx9u` |
| package.json name | `wallet-wccm` |
| package.json identity | "West Coast Capital Mortgage Inc. (CA DRE Corporation License #02440065 · NMLS #2817729)" |
| Netlify config | Wallet WCCM standalone site (`wwccm.com`) |
| Deploy target | Netlify static `dist/` + `netlify/functions` |

**Contamination scan:** no WCCI source, crawler, `scripts/sync-site-resources.ts`,
global resource index, Supabase cross-site table, multi-brand router, Telegram
code/env, `webhook.site` production URL, exposed CRM/webhook token, or
"Valley…" legal-name variation. Two stale code *comments* in `src/module` that
listed "WCCI" as an example host site were removed in this phase.

## 2. Frontend framework & routing

- **React 18 + TypeScript + Vite**, `react-router-dom`.
- SPA; Netlify redirect serves `index.html` for all non-`/api/*` routes.
- Entry page: `src/pages/SmartPage.tsx` → `src/site/SmartAdvisor.tsx`.
- Light/dark theme; language owned at page level.

## 3. AI provider & server-side route

- **Anthropic Messages API** via serverless function
  `netlify/functions/mortgage-strategy-advisor.mjs`.
- `ANTHROPIC_API_KEY` is **server-side only**. Model defaults to
  `claude-haiku-4-5`, overridable via `WWCCM_MODEL`.
- Without the key the function returns `501` and the client falls back to a
  **local rule-based engine** (deterministic; labeled "Local advisor mode").
- System prompt lives server-side and is not exposed to the browser.
- Structured output is requested and parsed on the server.

## 4. Conversation & profile state

- Active-session conversation held in React state (`SmartAdvisor.tsx`),
  history summarized and sent to the route each turn.
- **Loan Strategy Profile** (`ScenarioProfile`) built by
  `src/site/scenario/parseScenario.ts` + `coerceAnswer` in `SmartAdvisor.tsx`,
  merged via `mergeProfile`.
- `readInitialProfile` / `clearAdvisorState` enforce **session hygiene** — no
  borrower scenario is hydrated across browser sessions; legacy keys cleared on
  mount. Only a non-sensitive language preference is persisted.
- **Start Over** clears chat, profile, questions, text, thinking, drawers,
  review/doc modals, unsent files, doc-review events, mic state, and IDs.

## 5. Deterministic calculations

- Untouched, tested engine under `src/module` (`calculateCashToClose`,
  `compareDownPaymentOptions`, `generateAiTakeaway`).
- Verified example ($1,399,000 / $1,250,000 / 7.25% / 26 days) preserved and
  labeled **"Example only"**; it is not shown as the borrower's result until
  the user provides both price and down payment.
- Parser plausibility floors (this phase) stop implausible amounts (e.g. a
  "$400" home, "$20" down) from ever populating a scenario; a small
  down-payment number is read as a **percent** ("put 20 down" → 20%).

## 6. Program matcher & location

- `src/site/scenario/loanPrograms.ts` matches possible paths cautiously.
- `src/site/scenario/location.ts` resolves loan-limit area conservatively —
  **Santa Clarita never resolves to Santa Clara County**; an unmapped city is
  left needing ZIP/county confirmation.

## 7. i18n

- `src/site/i18n.ts` — EN/RU/ES/ZH dictionary + detection
  (explicit → `?lang` → browser → `en`).
- Field-level i18n in `src/site/scenario/fieldsI18n.ts`.

## 8. Microphone

- `src/site/useSpeech.ts` — real Web Speech API STT
  (`SpeechRecognition`/`webkitSpeechRecognition`), locale-mapped
  (en-US/ru-RU/es-US/zh-CN), transcript into the composer (editable, no
  auto-submit), stops on Start Over / language change / unmount / modal open.
  Localized denied/unsupported states; no "coming soon" chat message.

## 9. Document review

- `src/site/DocumentReviewModal.tsx` (paperclip → "Upload Documents for Broker
  Review"): multi-file, per-file category, validation, contact-after-upload.
- `netlify/functions/document-review.mjs`: real storage (netlify-blobs /
  supabase / s3 / dev-sim) + webhook notify; success **only** after storage
  **and** notify succeed; orphaned-file cleanup on notify failure; production
  never simulates. `netlify/functions/document-file.mjs`: token-guarded private
  retrieval (`DOCUMENT_ACCESS_TOKEN`).

## 10. CRM

- `netlify/functions/crm-lead.mjs` → GR CRM (`grcrm.com`), reads a server-side
  webhook (currently `GRCRM_WEBHOOK`), maps `{name,email,phone,message,source}`.
  501 if unset, 502 on upstream failure. **No token in the browser bundle.**
- Client adapter: `src/site/scenario/leadAdapter.ts`.

## 11. Environment variables in use (names only)

`ANTHROPIC_API_KEY`, `WWCCM_MODEL`, `DOCUMENT_STORAGE_PROVIDER`,
`DOCUMENT_REVIEW_WEBHOOK`, `DOCUMENT_ACCESS_TOKEN`, `DOCUMENT_ALLOW_DEV_SIM`,
`DOCUMENT_SIGNED_URL_TTL`, `DOCUMENT_REVIEW_EMAIL`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`, AWS S3 vars, `GRCRM_WEBHOOK`.

## 12. Tests

- Vitest suites for the engine, scenario parser, i18n, licensing, CRM lead, and
  (this phase) company-facts + resource registry. All green.

## 13. Known limitations (to address in later phases)

- No verified live pricing/program data source — paths must be labeled planning
  assumptions / broker-review-required (Section 7 work).
- Conversation-state model is lighter than the full typed
  `MortgageConversationState` in the spec (Section 5 work).
- GR CRM env var is `GRCRM_WEBHOOK` (single URL) rather than the spec's
  `GR_CRM_WEBHOOK_URL` + `GR_CRM_WEBHOOK_TOKEN` split; a rename must be
  coordinated with the owner's existing Netlify config to avoid breakage.
- Resource registry + feature flags added this phase; not yet wired into the
  server route / UI degraded states.
- Full 22-item acceptance-test matrix is partially covered; remaining tests are
  tracked per phase.
