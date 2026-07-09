# AI Cash-to-Close Advisor

A reusable, AI-powered mortgage strategy module — **not** a basic calculator and
**not** a standalone website. It is a self-contained React component set that
drops into any existing mortgage site (California Mortgage, West Coast Capital
Mortgage, WCCI, Before Jumbo Loan, and future Florida / Key West / boutique
sites).

> **Core message:** _Your down payment is not your total cash needed to close._

**Primary product name:** AI Cash-to-Close Advisor
**Alternative UI label:** Real Cash to Close Strategy Tool

---

## Two modes

| Mode | Component | Where it lives |
| --- | --- | --- |
| **Full Page** | `<CashToCloseAdvisor />` | Route `/tools/cash-to-close` (also `/calculators/cash-to-close`) |
| **Embedded Widget** | `<CashToCloseWidget />` | A compact band inside any existing page (e.g. the homepage) |

This repo also ships a small **demo app** (Vite + React Router) so you can see
both modes running. The reusable module itself lives entirely under
[`src/module/`](src/module) and has no dependency on the demo app.

---

## Architecture

```
src/module/                     ← the reusable module (import from here)
  index.ts                      ← public API (components + utils + types)
  types.ts                      ← domain types
  brand.ts                      ← BrandConfig + compliance disclaimer
  calc/
    cashToCloseCalculations.ts  ← DETERMINISTIC engine (all math)
    format.ts                   ← currency / percent formatters
  ai/
    aiCashToCloseSummary.ts     ← LOCAL mock "AI" strategy generator
  fixtures/
    defaultScenario.ts          ← canonical demo/test scenario
  components/
    CashToCloseAdvisor.tsx       ← full-page mode
    CashToCloseWidget.tsx        ← embedded widget mode
    parts/                       ← ResultCard, CostBreakdown, AiSummaryPanel,
                                   ScenarioComparison, ClosingDateSensitivity,
                                   RiskWarning, InputsPanel, CtaBar, Disclaimer…
  styles/advisor.css            ← scoped, self-contained styling (.ctc-* )
  __tests__/                    ← calculation + AI summary tests

src/pages/                      ← demo app pages (HomePage, CashToClosePage)
src/App.tsx, src/main.tsx       ← demo router + entry
```

### Deterministic engine vs. AI
- **All numbers** come from `calc/cashToCloseCalculations.ts` — pure, testable
  functions. The AI layer never computes figures.
- **`ai/aiCashToCloseSummary.ts`** is a **local mock generator**. It consumes the
  computed result and dynamically composes a structured, plain-English strategy
  summary (it is _not_ hardcoded to one example). When a live LLM endpoint is
  ready, swap this one function to call the model with the same result object;
  the `AiSummary` shape can stay identical.

---

## Using the module in another site

```tsx
import {
  CashToCloseAdvisor,
  CashToCloseWidget,
  type BrandConfig,
} from '<path>/src/module';

const brand: Partial<BrandConfig> = {
  brandName: 'West Coast Capital Mortgage',
  stateFocus: 'California',
  showApplyButton: true,
  showLeadForm: true,
  applyHref: 'https://apply.example.com',
  contactCTA: { label: 'Talk to a Mortgage Broker', href: 'tel:3106865053' },
  primaryCTA: { label: 'Review My Cash to Close', href: '#breakdown' },
  nmlsLine: 'West Coast Capital Mortgage · Broker 01385024 · NMLS ID 2775380',
  // disclosureText defaults to the required compliance disclaimer
};

// Full page (mount at your /tools/cash-to-close route)
<CashToCloseAdvisor config={brand} />

// Embedded widget (drop into any existing page)
<CashToCloseWidget config={brand} advisorHref="/tools/cash-to-close" />
```

All `BrandConfig` fields are optional and merge onto sensible defaults:
`brandName`, `altLabel`, `primaryCTA`, `contactCTA`, `showApplyButton`,
`applyHref`, `showLeadForm`, `leadFormAction`, `stateFocus`, `disclosureText`,
`nmlsLine`, `phone`.

The styling is namespaced under `.ctc-root` so it will not collide with a host
site's CSS.

---

## Local commands

```bash
npm install       # install dependencies
npm run dev       # start the demo app (Vite dev server)
npm run build     # type-check (tsc --noEmit) + production build
npm run lint      # ESLint
npm test          # run the Vitest suite (calculation + AI summary)
```

Demo routes once running:
- `/` — homepage with the **embedded widget**
- `/tools/cash-to-close` — the **full advisor**
- `/calculators/cash-to-close` — same advisor (alias)

---

## Compliance

Every rendering shows this disclaimer:

> This tool is for educational and planning purposes only. It is not a Loan
> Estimate, loan approval, or commitment to lend. Actual fees, rate, APR,
> credits, prepaids, escrow reserves, mortgage insurance, and cash to close may
> vary by lender, program, borrower profile, property, and closing date.

Scenario comparisons never invent lender rates — they use safe qualitative
labels (e.g. _Higher rate risk_, _Better pricing possible_, _Usually avoids
PMI/MI_).
