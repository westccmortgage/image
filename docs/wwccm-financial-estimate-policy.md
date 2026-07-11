# WWCCM — Financial Estimate Policy

All financial figures come from the **deterministic engine** (`src/module`) via
the tool surface in `src/site/scenario/tools.ts`. The AI layer may phrase these
numbers but must never invent or recompute one.

## Exact vs. estimated

Exact figures may only come from: explicit borrower inputs, deterministic
calculations, owner-configured assumptions that are visibly disclosed, or
verified lender/settlement figures. Everything else is an **estimate** and must
be labeled as such.

## Fees scale — nothing is frozen

`profileToEngineInput` builds the engine input from the borrower's **actual**
loan once price + down payment are known. Fees, taxes, insurance, prepaid
interest, and reserves scale; they are never left at the demo example's fixed
dollars. Planning-assumption constants live in `tools.ts` (`PLANNING`):

| Item | Basis | Disclosed as |
|---|---|---|
| Origination fee | 1.00% of loan amount | planning estimate, not a quote |
| Underwriting / processing / admin | flat | realistic flat lender fees |
| Discount points | **omitted** | never assumed; only shown as a 1%-of-loan *example* if the borrower asks |
| Title / escrow / settlement | ~0.34% of loan (min $1,500) | estimated, varies by provider |
| Appraisal, tax service, notary, recording, credit | flat | estimated third-party costs |
| Property taxes | ~1.25% of price / yr | disclosed planning assumption |
| Hazard insurance | ~0.25% of price / yr | disclosed planning assumption |
| Prepaid interest | loan × rate × days ÷ 365 | derived; day-count disclosed |
| Tax impounds / insurance reserves | 7 mo / 2 mo | disclosed impound assumption |

These are **planning assumptions requiring broker verification**, not lender
quotes. Dynamic-scaling regression tests
(`src/site/scenario/__tests__/dynamicScaling.test.ts`) assert that a $4M
scenario produces materially higher fees/prepaids/cash-to-close than a $2M
scenario and that no category is frozen.

## The verified "Example only" scenario

The canonical example ($1,399,000 / $1,250,000 loan / 7.25% / 26 days →
LTV ~89.35%, lender fees $20,535.00, prepaids/escrow $20,873.02, cash to close
$196,381.22, additional funds $47,381.22, monthly P&I ~$8,527.20) lives in
`src/module/fixtures/defaultScenario.ts` and is preserved exactly by the engine
unit tests. It is labeled **"Example only"** and is not shown as the borrower's
result until they provide both price and down payment.

## Rules the advisor must follow

- Never bury discount points inside a generic "lender fee"; points are separate
  and optional. If the borrower asks about one point, show 1% of the loan as an
  **example**, not a quote, and do not imply it is required.
- If no quote exists, say lender charges and discount points are not known yet.
- Distinguish conventional PMI from Non-QM program requirements; use "may",
  "generally", "subject to program guidelines". Never guarantee MI is required
  or avoided.
- Never quote APR, approval, eligibility, or final terms from incomplete chat
  data.
- Every estimate carries its assumptions and an estimate date, and advanced
  assumptions are editable in the profile drawer.

## How to update the planning assumptions

Edit the `PLANNING` constants in `src/site/scenario/tools.ts`. Keep the
dynamic-scaling and engine regression tests green. Material rate assumptions
(property tax %, insurance %, impound months) are business decisions — confirm
with the owner before changing.
