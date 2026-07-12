# WWCCM — Company Facts (Source of Truth)

All company/broker identity and licensing render from a **single** module:
`src/config/company-facts.ts`. Do not duplicate these values in components,
prompts, metadata, or CRM messages — import them.

## Two distinct entities (never interchange)

| | Company | Individual broker |
|---|---|---|
| Name | West Coast Capital Mortgage Inc. | Anatoliy Kanevsky |
| Title | — | California Real Estate Broker |
| License type | **Corporation** License | **Broker** License |
| CA DRE # | 02440065 | 01385024 |
| NMLS # | **2817729** | **2775380** |

- The company NMLS (2817729) and the broker NMLS (2775380) must never be
  swapped, and a broker (individual) license must never be labeled a
  corporation license. Regression tests enforce this
  (`src/config/__tests__/company-facts.test.ts`, `src/site/__tests__/licensing.test.ts`).

## Owner-approved professional history

- Mortgage career began **2004**.
- California real estate broker license obtained **2009**.

## Owner-controlled configuration (do not infer)

- `supportedStates` / `licensingByState` — explicit only. California is the
  confirmed home state. Adding a state requires owner confirmation and, where
  applicable, a verified license number. Never claim multi-state licensing from
  marketing copy, and never display an unverified state license number.
- `canonicalCorporateDomain` — currently `https://wwccm.com`; **owner
  confirmation required** before changing canonical domain, redirects, sitemap
  hostnames, or structured-data hostnames.
- `secureApplicationUrl` — undefined until an owner-approved, verified route
  exists. Do not invent one.
- `approvedEmails` — empty until the owner supplies verified addresses. Do not
  invent phones, emails, addresses, or domains.

## How to update

1. Edit `src/config/company-facts.ts` only.
2. Run `npm test` — the licensing regression tests must stay green.
3. `src/site/licensing.ts` re-exports from this module for backward
   compatibility; do not redefine numbers there.

## Consumers

Footer/header (`SmartPage.tsx`), advisor trust responses, disclosures, Strategy
Review + Document Review modals, CRM summaries, the server AI prompt, metadata,
and structured data all consume this source of truth (migration in progress per
phase).
