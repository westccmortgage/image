# WWCCM Advisor — Scenario Audit (2026-07-12)

A systematic sweep of the deterministic pipeline (parse → profile → question
engine → program match → cash-to-close) across ~40 realistic scenarios:
number/percent phrasings, purpose (purchase/refi/cash-out), occupancy,
employment, income-doc, location, goals, multilingual input, and edge cases.
Each scenario was run through the real code and its output inspected for logic
bugs. Findings, fixes, and remaining limitations below.

## Method
A probe harness fed each message set through `parseScenario` → `mergeProfile` →
`deriveScenario` → `missingRequired`/`nextBestQuestion` → `matchLoanPrograms` →
`profileToEngineInput` → `calculateCashToClose`, printing the resulting profile,
next question, LTV, cash-to-close, and program fits. Bugs were confirmed, fixed,
and locked with regression tests (`parseAudit.test.ts`, plus `refinance.test.ts`
from the prior fix). **208/208 tests pass.**

## Findings & resolution

| # | Severity | Bug | Status |
|---|---|---|---|
| 1 | **Critical** | **Refinance intent lost.** After "I want to refinance," a later "home worth $4M" flipped the purpose back to *purchase* — re-triggering the down-payment question on a refi. | **Fixed** — purchase now requires a buy *verb* (not the noun "home"); `mergeProfile` never downgrades an established refinance. |
| 2 | **Critical** | **Price misread as down payment.** "1.1 million, 20% down" set *down = 1.1M* and left price empty, because a separate "20% down" contaminated the price's context window. Same for "Austin… for 500k, 20% down". | **Fixed** — money classification now uses **immediate adjacency** (word right before/after the number), not a symmetric proximity window. |
| 3 | High | **Down payment dropped.** "850k home with 85k down" captured the price but lost the $85k down (both price+down words in context → mis-ruled as price). | **Fixed** — adjacency (`85k down` → down). |
| 4 | High | **"$25M estate" not recognized.** "estate" wasn't a price word and "40% down" pulled it to the down slot. | **Fixed** — added estate/place/listing/cost to price words + adjacency. |
| 5 | High | **Dollar amount read as a ZIP.** "down payment 50000" set *zipOrCounty = 50000*. | **Fixed** — ZIP skips money/down contexts; bare-integer amounts in explicit price/down phrasing are captured as money. |
| 6 | Medium | **Multilingual percent-down missed.** ES "20% de enganche" and ZH "首付 20%" didn't set the down percent. | **Fixed** — percent anchor now includes ES/RU/ZH down words. |
| 7 | Medium | **Zero-down not captured.** "0 down" left the down payment empty (couldn't reach 100% LTV scenarios). | **Fixed** — "0/zero/no down" → $0 / 100% LTV. |
| 8 | Low | **All-cash still charged lender fees.** A $0 loan showed ~$3,385 in lender fees. | **Fixed** — no lender fees when the loan is $0. |
| 9 | Low | **County shown lowercased** ("los angeles County"). | **Fixed** — title-cased. |
| 10 | Low | **Trailing comma read as thousands** (`isPartOfMoney` treated "90210," as money). | **Fixed** — only a comma *followed by digits* is a separator. |

## Verified correct (no bug)
- **Santa Clarita ≠ Santa Clara** — Clarita resolves to Los Angeles County, Clara to Santa Clara County (curated resolver).
- **Plausibility floors** — "$400 home / $20 down" is rejected, not committed.
- **Percent vs dollars** — "20%", "20 percent", "put 20 down" all → 20%.
- **Fee scaling** — a $4M scenario produces materially higher fees/cash-to-close than $2M; nothing frozen at the demo values.
- **Program honesty** — every path is labeled "planning assumption" / "needs broker review"; never "verified current".
- **Occupancy/employment/income-doc** extraction (DSCR, self-employed bank-statement, retired asset-depletion, 1099) all classify correctly.

## Remaining limitations (accepted / deferred — documented, not silently ignored)
- **Refinance math** — the refi *flow* is correct (no down-payment ask, "estimated home value"), but the tool does **not** compute refi cash-to-close: it needs a structured *current loan balance* and refi type (rate/term vs cash-out), which aren't captured yet. Hero cards stay "—" for a refi. (Follow-up feature.)
- **Range phrasing** — "between 900k and 1.1 million" splits into price + down (900k). Ambiguous; the advisor should ask. Low frequency.
- **Bare space-separated integers** — "800000 750000" (no `$`, comma, suffix, or context word) is not parsed. Users typically include a `$`, comma, or "k". Low frequency.
- **Down > price** — "200k home, 300k down" captures both (loan $0); a "down exceeds price" warning would be a nice guardrail. Low frequency.

## Non-parse areas spot-checked
- Question engine asks the next 1–3 fields and never a not-applicable one (verified for refi).
- Deterministic cash-to-close matches the verified "Example only" figures exactly.
- Program `dataStatus` never returns `verified_current` without a verified source.

All fixes shipped via PR to `main`; the deferred items above are tracked here.
