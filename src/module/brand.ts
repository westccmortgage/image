// ---------------------------------------------------------------------------
// Brand / configuration contract.
//
// The advisor and widget accept an optional `config` prop so the module can be
// configured with a host site's own name, CTAs, disclosures, and state focus.
// ---------------------------------------------------------------------------

export interface BrandConfig {
  /** Product / brand name shown in the header. */
  brandName: string;
  /** Optional alternate label used in the UI. */
  altLabel?: string;
  /** Primary call-to-action label + optional href. */
  primaryCTA: { label: string; href?: string };
  /** Contact / talk-to-a-broker CTA. */
  contactCTA: { label: string; href?: string };
  /** Show the "Start Application" button. */
  showApplyButton: boolean;
  /** Apply link target. */
  applyHref?: string;
  /** Show an inline lead-capture form. */
  showLeadForm: boolean;
  /** Where lead form submissions post (optional). */
  leadFormAction?: string;
  /** Primary state focus, e.g. "California". Used in copy. */
  stateFocus?: string;
  /** Compliance disclosure text shown at the bottom. */
  disclosureText: string;
  /** Optional NMLS / license line. */
  nmlsLine?: string;
  /** Optional phone number for the contact CTA. */
  phone?: string;
}

export const COMPLIANCE_DISCLAIMER =
  'This tool is for educational and planning purposes only. It is not a Loan ' +
  'Estimate, loan approval, or commitment to lend. Actual fees, rate, APR, ' +
  'credits, prepaids, escrow reserves, mortgage insurance, and cash to close ' +
  'may vary by lender, program, borrower profile, property, and closing date.';

/**
 * Default configuration, tuned for West Coast Capital Mortgage. Any site can
 * override individual fields.
 */
export const defaultBrandConfig: BrandConfig = {
  brandName: 'AI Cash-to-Close Advisor',
  altLabel: 'Real Cash to Close Strategy Tool',
  primaryCTA: { label: 'Review My Cash to Close', href: '#advisor' },
  contactCTA: { label: 'Talk to a Mortgage Broker', href: '#contact' },
  showApplyButton: true,
  applyHref: '#apply',
  showLeadForm: false,
  stateFocus: 'California',
  disclosureText: COMPLIANCE_DISCLAIMER,
  // Fallback licensing line (the site passes the canonical value via config).
  // Company and individual NMLS are distinct and must not be interchanged.
  nmlsLine:
    'West Coast Capital Mortgage Inc. · CA DRE Corporation License #02440065 · NMLS #2817729 · ' +
    'Anatoliy Kanevsky · California Real Estate Broker · CA DRE Broker License #01385024 · NMLS #2775380',
  phone: '310-686-5053',
};

/** Merge a partial override onto the defaults. */
export function resolveBrandConfig(
  overrides?: Partial<BrandConfig>,
): BrandConfig {
  if (!overrides) return defaultBrandConfig;
  return { ...defaultBrandConfig, ...overrides };
}
