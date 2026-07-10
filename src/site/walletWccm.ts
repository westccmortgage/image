// ---------------------------------------------------------------------------
// Wallet WCCM standalone site configuration (wwccm.com).
//
// This is the single integration point between the reusable Cash-to-Close
// module and this specific deployment. The module itself is brand-neutral;
// Wallet WCCM uses the module's default navy / slate / soft-blue + gold theme.
// ---------------------------------------------------------------------------

import type { BrandConfig } from '../module';
import { LICENSE_LINE } from './licensing';

export const PHONE = '310-686-5053';
export const PHONE_HREF = 'tel:3106865053';
export const SITE_URL = 'https://wwccm.com';

export const walletWccmConfig: Partial<BrandConfig> = {
  brandName: 'Wallet WCCM',
  altLabel: 'AI Mortgage Strategy Advisor',
  // No single-state focus — Wallet WCCM is a West Coast Capital Mortgage tool.
  stateFocus: undefined,
  primaryCTA: { label: 'Review My Scenario', href: '#advisor' },
  contactCTA: { label: 'Talk to a Mortgage Broker', href: PHONE_HREF },
  showApplyButton: true,
  applyHref: PHONE_HREF,
  showLeadForm: false,
  nmlsLine: `${LICENSE_LINE} · (310) 686-5053`,
  phone: PHONE,
  // disclosureText falls back to the required compliance disclaimer in the module.
};

// Hero copy per the Wallet WCCM brief.
export const HERO = {
  brand: 'Wallet WCCM',
  title: 'AI Mortgage Strategy Advisor',
  subtitle:
    'Describe your mortgage scenario. The advisor will compare possible loan paths, estimate real cash to close, and prepare the scenario for broker review.',
  emotional: 'Describe your scenario — the advisor compares your possible loan paths.',
  coreWarning: 'Cash-to-close is one module inside the advisor, not the whole product.',
};

// Embedded widget copy.
export const EMBED = {
  headline: 'Your down payment is not your total cash needed to close.',
  subtext:
    'Estimate lender fees, prepaids, escrow reserves, and the additional cash ' +
    'needed above your down payment — before you write an offer.',
};
