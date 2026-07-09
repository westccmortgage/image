// ---------------------------------------------------------------------------
// Wallet WCCM standalone site configuration (wwccm.com).
//
// This is the single integration point between the reusable Cash-to-Close
// module and this specific deployment. The module itself is brand-neutral;
// Wallet WCCM uses the module's default navy / slate / soft-blue + gold theme.
// ---------------------------------------------------------------------------

import type { BrandConfig } from '../module';

export const PHONE = '310-686-5053';
export const PHONE_HREF = 'tel:3106865053';
export const SITE_URL = 'https://wwccm.com';

export const walletWccmConfig: Partial<BrandConfig> = {
  brandName: 'Wallet WCCM',
  altLabel: 'AI Cash-to-Close Advisor',
  // No single-state focus — Wallet WCCM is a West Coast Capital Mortgage tool.
  stateFocus: undefined,
  primaryCTA: { label: 'Review My Scenario', href: '#advisor' },
  contactCTA: { label: 'Talk to a Mortgage Broker', href: PHONE_HREF },
  showApplyButton: true,
  applyHref: PHONE_HREF,
  showLeadForm: false,
  nmlsLine:
    'Powered by West Coast Capital Mortgage · Broker 01385024 · NMLS ID 2775380 · (310) 686-5053',
  phone: PHONE,
  // disclosureText falls back to the required compliance disclaimer in the module.
};

// Hero copy per the Wallet WCCM brief.
export const HERO = {
  brand: 'Wallet WCCM',
  title: 'AI Cash-to-Close Advisor',
  subtitle:
    'Before your buyer writes an offer, estimate the real funds needed to close — not just the down payment.',
  emotional: 'Know what your wallet really needs before closing.',
  coreWarning: 'Do not assume your down payment is your cash to close.',
};

// Embedded widget copy.
export const EMBED = {
  headline: 'Your down payment is not your total cash needed to close.',
  subtext:
    'Estimate lender fees, prepaids, escrow reserves, and the additional cash ' +
    'needed above your down payment — before you write an offer.',
};
