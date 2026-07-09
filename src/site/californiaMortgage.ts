// ---------------------------------------------------------------------------
// Host-site integration config for the California Mortgage website
// (californiamtg.com). This is the ONLY glue between the reusable module and
// this specific site — the module itself is untouched.
//
// To wire the module into the real californiamtg.com codebase, copy an object
// like this and pass it to <CashToCloseAdvisor config={...}/> and
// <CashToCloseWidget config={...}/>.
// ---------------------------------------------------------------------------

import type { BrandConfig } from '../module';

export const californiaMortgageConfig: Partial<BrandConfig> = {
  brandName: 'California Mortgage',
  altLabel: 'Real Cash to Close Strategy Tool',
  stateFocus: 'California',
  // Widget primary CTA (button text on the homepage band).
  primaryCTA: { label: 'Estimate My Cash to Close', href: '/tools/cash-to-close' },
  // Contact CTA used on the full page + widget.
  contactCTA: { label: 'Talk to a Mortgage Broker', href: 'tel:3106865053' },
  showApplyButton: true,
  applyHref: '/apply',
  showLeadForm: false,
  nmlsLine: 'California Mortgage · Broker 01385024 · NMLS ID 2775380 · (310) 686-5053',
  phone: '310-686-5053',
  // disclosureText falls back to the required compliance disclaimer in the module.
};

// Homepage widget copy, per the integration brief.
export const HOMEPAGE_WIDGET_HEADLINE =
  'Do you know your real cash needed to close?';

export const HOMEPAGE_WIDGET_SUBTEXT =
  'Your down payment is only one part of the money needed at closing. Estimate ' +
  'lender fees, prepaids, escrow reserves, and the additional funds needed ' +
  'above your down payment.';

/** The canonical full-page route for the advisor on this site. */
export const ADVISOR_ROUTE = '/tools/cash-to-close';
