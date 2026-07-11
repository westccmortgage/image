# WWCCM — GR CRM Lead Delivery

Intentional broker-review submissions are forwarded to the authorized GR CRM
(`grcrm.com`) **server-side only**, via `netlify/functions/crm-lead.mjs`
(`/api/crm-lead`). The browser never sees the CRM URL or token — only an
authoritative `{ ok: true }` or an error.

## Two lead types

1. **Strategy Review** — the borrower submits the Strategy Review Request form.
2. **Document Review** — the borrower submits documents for broker review; the
   contact + scenario summary is also forwarded (best-effort, after storage +
   notify succeed).

## Credentials (set ONE scheme, server-side)

| Scheme | Vars | Token transport |
|---|---|---|
| Legacy (in production now) | `GRCRM_WEBHOOK` | embedded in the URL |
| Split (spec-preferred) | `GR_CRM_WEBHOOK_URL` + `GR_CRM_WEBHOOK_TOKEN` | `Authorization: Bearer` |

The function accepts either. **Do not rename `GRCRM_WEBHOOK` in Netlify without
adding the split vars first** — delivery would fail closed until credentials
resolve. The previously exposed frontend capture token is compromised and must
be **rotated**.

## Fail-closed behavior

- `GRCRM_DELIVERY_ENABLED=false` → `503 delivery_disabled`, no success shown.
- No credentials configured → `501 not_configured` (borrower flow unaffected).
- Upstream non-2xx or fetch failure → `502`, no success shown.
- Errors never echo the target URL or token.

## Payload (mapped to the CRM's shape)

```json
{
  "name": "…", "email": "…", "phone": "…", "message": "…",
  "source": "wwccm.com",
  "sourceProduct": "wwccm",
  "sourceExperience": "ai_mortgage_strategy_advisor",
  "leadType": "strategy_review | document_review"
}
```

The `message` is assembled client-side from non-sensitive scenario fields
(scenario summary, possible paths, missing info, cash-to-close estimate +
assumptions, document names/categories, secure links for document review, a
disclaimer that this is not a completed mortgage application). Field sizes are
bounded server-side.

## Consent

Only submitted after explicit contact consent. The browser receives only the
authoritative result — never the token, secure broker-only links, storage
credentials, or the private webhook destination.

## Not customer-facing

GR CRM is never exposed as a borrower resource in the resource registry and is
explicitly excluded by the resource resolver's forbidden-URL guard.
