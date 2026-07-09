// ---------------------------------------------------------------------------
// AI Strategy Summary generator.
//
// This is a LOCAL, MOCK "AI" generator. It consumes the deterministic result
// object and dynamically composes a structured, plain-English explanation.
// It is NOT hardcoded to one example — every sentence is derived from the
// actual computed values, so it works for any input.
//
// When a live LLM endpoint is wired up later, swap `generateAiSummary` for a
// call that passes `result` to the model and asks it to explain these same
// figures. The shape (AiSummary) can stay identical.
// ---------------------------------------------------------------------------

import type { CashToCloseInput, CashToCloseResult } from '../types';
import { formatMoney, formatMoneyExact, formatPercent } from '../calc/format';

export interface AiSummarySection {
  id: string;
  title: string;
  body: string;
}

export interface AiSummary {
  headline: string;
  keyTakeaway: string;
  sections: AiSummarySection[];
  riskCallouts: string[];
  opportunities: string[];
  /** Marks this as machine-generated, not advice. */
  generatedBy: string;
}

function pct(v: number): string {
  return formatPercent(v);
}

/**
 * Produce a structured strategy summary from a calculated result.
 * `input` is optional context (loan type, product name) used to sharpen the
 * narrative; all dollar figures come from `result`.
 */
export function generateAiSummary(
  result: CashToCloseResult,
  input?: Pick<CashToCloseInput, 'loanType' | 'productName' | 'state'>,
): AiSummary {
  const {
    downPayment,
    additionalFundsNeeded,
    totalCashToClose,
    lenderFeesTotal,
    thirdPartyFeesTotal,
    governmentFeesTotal,
    prepaidInterest,
    prepaidsAndEscrowTotal,
    monthlyTaxes,
    monthlyInsurance,
    monthlyHousingPayment,
    ltv,
    downPaymentPercent,
    sellerCredit,
    lenderCredit,
    risk,
  } = result;

  const loanType = input?.loanType ?? 'your';
  const product = input?.productName ?? 'your loan program';

  const headline = 'Your down payment is not your total cash needed to close.';

  const keyTakeaway =
    `On this scenario your down payment is ${formatMoney(downPayment)}, but the ` +
    `estimated cash you actually need at the closing table is ` +
    `${formatMoney(totalCashToClose)} — roughly ${formatMoney(additionalFundsNeeded)} ` +
    `more than the down payment alone. Planning for that gap now is what keeps a ` +
    `closing on schedule.`;

  const sections: AiSummarySection[] = [];

  sections.push({
    id: 'down-vs-cash',
    title: 'Down payment vs. cash to close',
    body:
      `Buyers often budget only for the down payment (${formatMoney(downPayment)}, ` +
      `about ${pct(downPaymentPercent)} of the price). In reality, closing also ` +
      `requires lender fees, third-party fees, government recording fees, and ` +
      `prepaid/escrow items. Together those add ${formatMoney(additionalFundsNeeded)} ` +
      `on top of your down payment, for an estimated ${formatMoney(totalCashToClose)} ` +
      `total.`,
  });

  sections.push({
    id: 'additional-funds',
    title: 'Additional funds needed above the down payment',
    body:
      `Expect approximately ${formatMoneyExact(additionalFundsNeeded)} beyond your ` +
      `down payment. This is the number to keep in reserve so an appraisal, rate ` +
      `lock, or closing-date change does not catch you short.`,
  });

  sections.push({
    id: 'lender-fees',
    title: 'Lender fees',
    body:
      `Lender fees total about ${formatMoneyExact(lenderFeesTotal)}. These may ` +
      `include origination, discount points, underwriting, processing, and admin ` +
      `charges. On ${loanType === 'Non-QM' ? 'Non-QM' : product} pricing, points and ` +
      `origination are often where the largest, most negotiable dollars sit.`,
  });

  sections.push({
    id: 'third-party-fees',
    title: 'Title, escrow & third-party fees',
    body:
      `Third-party fees run about ${formatMoneyExact(thirdPartyFeesTotal)} and cover ` +
      `title insurance, escrow/settlement, appraisal, credit, notary and related ` +
      `services. Government recording and transfer fees add roughly ` +
      `${formatMoneyExact(governmentFeesTotal)}. These are largely set by the ` +
      `providers and jurisdiction rather than the lender.`,
  });

  sections.push({
    id: 'prepaids',
    title: 'Prepaids, property taxes & insurance',
    body:
      `Prepaids and initial escrow reserves total about ` +
      `${formatMoneyExact(prepaidsAndEscrowTotal)}. That bundles prepaid interest ` +
      `(${formatMoneyExact(prepaidInterest)}), your homeowner's insurance premium, ` +
      `and initial escrow reserves for property taxes (${formatMoney(monthlyTaxes)}/mo) ` +
      `and insurance (${formatMoney(monthlyInsurance)}/mo). Your estimated total ` +
      `monthly housing payment is ${formatMoneyExact(monthlyHousingPayment)}.`,
  });

  sections.push({
    id: 'prepaid-interest',
    title: 'Prepaid interest & closing-date timing',
    body:
      `Prepaid (per-diem) interest on this scenario is ` +
      `${formatMoneyExact(prepaidInterest)}. It is charged from your closing date to ` +
      `the first of the following month, so closing later in the month lowers this ` +
      `line and closing near month-end minimizes it. Use the closing-date control to ` +
      `see the effect on your cash to close.`,
  });

  const opportunities: string[] = [];
  opportunities.push(
    sellerCredit > 0
      ? `You've modeled a seller credit of ${formatMoneyExact(sellerCredit)}, which ` +
          `directly reduces your cash to close. In slower markets, negotiating a ` +
          `seller credit toward closing costs is often achievable.`
      : `Seller credits: no seller credit is modeled yet. A negotiated seller ` +
          `credit toward closing costs would directly reduce your ` +
          `${formatMoney(totalCashToClose)} cash to close.`,
  );
  opportunities.push(
    lenderCredit > 0
      ? `A lender credit of ${formatMoneyExact(lenderCredit)} is applied, offsetting ` +
          `fees in exchange for a slightly higher rate.`
      : `Lender credits: accepting a modestly higher rate can generate a lender ` +
          `credit that offsets closing costs — worth comparing against paying ` +
          `points, depending on how long you plan to hold the loan.`,
  );

  sections.push({
    id: 'credits',
    title: 'Seller & lender credit opportunities',
    body: opportunities.join(' '),
  });

  const riskCallouts: string[] = [];
  if (risk.belowTwentyDown) {
    riskCallouts.push(
      `LTV is ${pct(ltv)} (below 20% down). Expect possible PMI/MI, pricing ` +
        `adjustments, and a higher monthly payment.`,
    );
  }
  if (risk.nonQmHighLtv) {
    riskCallouts.push(
      `This is a Non-QM loan above 85% LTV — a high-risk pricing zone. Rate, ` +
        `mortgage insurance, approval strength, and cash to close can all move ` +
        `materially with small changes in the file.`,
    );
  }
  if (risk.pmiRisk) {
    riskCallouts.push(
      `PMI / MI risk: at ${pct(ltv)} LTV, mortgage insurance or a pricing ` +
        `adjustment in lieu of MI is likely. Reaching 80% LTV removes it.`,
    );
  }

  sections.push({
    id: 'risk',
    title: 'Down payment, PMI/MI & Non-QM risk',
    body:
      riskCallouts.length > 0
        ? `Risk level: ${risk.label}. ${riskCallouts.join(' ')}`
        : `Risk level: ${risk.label}. At ${pct(ltv)} LTV you're positioned to avoid ` +
          `mortgage insurance and qualify for stronger pricing.`,
  });

  return {
    headline,
    keyTakeaway,
    sections,
    riskCallouts,
    opportunities,
    generatedBy: 'AI Cash-to-Close Advisor · local strategy engine',
  };
}
