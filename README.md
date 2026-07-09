# Wallet WCCM · AI Cash-to-Close Advisor

Standalone single-purpose site for **wwccm.com**, powered by West Coast Capital
Mortgage. Built for Netlify to deploy directly from this repository.

> **Core message:** _Your down payment is not your total cash needed to close._

## Routes
- **`/`** — the full Wallet WCCM AI Cash-to-Close Advisor
- **`/embed`** — a compact, iframe-friendly widget version
- `/tools/cash-to-close`, `/calculators/cash-to-close` — legacy aliases → `/`

## Netlify deployment
Config is in [`netlify.toml`](netlify.toml) (plus [`public/_redirects`](public/_redirects) for the SPA fallback):

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node version | 20 |
| SPA redirect | `/*  →  /index.html  200` |

## Local commands
```bash
npm install
npm run dev      # local dev server
npm run build    # tsc --noEmit + vite build  → dist/
npm run lint     # ESLint
npm test         # Vitest (default-scenario + AI-summary tests)
```

## Architecture — logic separated from UI
```
src/
  module/                       ← reusable, brand-neutral Cash-to-Close module
    calc/cashToCloseCalculations.ts   ← DETERMINISTIC engine (all math)
    ai/aiCashToCloseSummary.ts        ← LOCAL dynamic AI-style summary (no live API)
    fixtures/defaultScenario.ts       ← the canonical demo scenario
    components/                       ← CashToCloseAdvisor, CashToCloseWidget, parts
    styles/advisor.css                ← scoped module styles (navy/slate/gold)
    __tests__/                        ← calculation + summary tests
  site/                         ← Wallet WCCM site glue
    walletWccm.ts                     ← brand config + copy
    ShareSection.tsx                  ← "Use this tool anywhere"
  pages/
    AdvisorPage.tsx             ← route "/"     (hero + module + realtor + share)
    EmbedPage.tsx               ← route "/embed"
  App.tsx, main.tsx, index.css  ← router, entry, Wallet WCCM chrome
public/
  legacy/                       ← preserved original upload (business-card image)
  _redirects                    ← Netlify SPA fallback
```

- **Calculation engine and AI summary are pure and UI-free** — the AI layer only
  explains numbers the engine computes. `ai/aiCashToCloseSummary.ts` is a local
  mock generator (dynamic, not hardcoded); swap that one function for a live LLM
  later without touching the UI.

## Default scenario (verified by tests)
Purchase $1,399,000 · Loan $1,250,000 · Down $149,000 · Non-QM · 7.25% · LTV
≈ 89.35% · Lender fees $20,535.00 · Third-party $5,773.20 · Government $200.00 ·
Prepaids & escrow $20,873.02 · **Total cash to close $196,381.22** ·
**Additional above down payment $47,381.22** · P&I ≈ $8,527.20 · Monthly housing
≈ $10,315.18.

## Compliance
Every rendering shows: _"This tool is for educational and planning purposes only.
It is not a Loan Estimate, loan approval, or commitment to lend. Actual fees,
rate, APR, credits, prepaids, escrow reserves, mortgage insurance, and cash to
close may vary by lender, program, borrower profile, property, and closing
date."_
