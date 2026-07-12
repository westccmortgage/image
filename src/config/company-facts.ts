// ---------------------------------------------------------------------------
// WWCCM — owner-approved company facts. SINGLE SOURCE OF TRUTH.
//
// Every footer, header, disclosure, AI trust response, CRM summary, document
// review message, metadata block, and structured-data node must consume this
// module. Do not duplicate these values anywhere else.
//
// TWO DISTINCT ENTITIES:
//   • The company (West Coast Capital Mortgage Inc.) — Corporation License,
//     NMLS #2817729.
//   • The individual broker (Anatoliy Kanevsky) — Broker License, NMLS #2775380.
// The company and individual NMLS/DRE numbers must NEVER be interchanged, and an
// individual (broker) license must never be labeled a corporation license.
//
// Values marked "owner confirmation required" must NOT be changed until the
// owner explicitly confirms them. Do not invent phones, emails, addresses,
// domains, or state license numbers. supportedStates / licensingByState are
// explicit owner-controlled configuration — never inferred from marketing text.
// ---------------------------------------------------------------------------

export type SupportedLanguage = 'en' | 'ru' | 'es' | 'zh';

export interface StateLicensing {
  /** USPS two-letter code, e.g. "CA". */
  code: string;
  /** Human name, e.g. "California". */
  name: string;
  /**
   * Verified state license identifier, if the owner has provided one. Leave
   * undefined rather than displaying an unverified number.
   */
  licenseNumber?: string;
  /** Only true once the owner has confirmed active licensing in this state. */
  verified: boolean;
}

export const companyFacts = {
  projectId: 'wwccm',
  productName: 'AI Mortgage Strategy Advisor',

  // --- Company (corporation) ---
  companyLegalName: 'West Coast Capital Mortgage Inc.',
  companyDreType: 'Corporation License',
  companyDreCorporationLicense: '02440065',
  companyNmls: '2817729',

  // --- Licensed individual broker ---
  licensedBrokerName: 'Anatoliy Kanevsky',
  licensedBrokerTitle: 'California Real Estate Broker',
  licensedBrokerDreType: 'Broker License',
  licensedBrokerDreLicense: '01385024',
  licensedBrokerNmls: '2775380',

  // --- Owner-approved professional history ---
  mortgageCareerStartYear: 2004,
  brokerLicenseYear: 2009,

  // --- Approved contact (existing verified values) ---
  officePhone: '310-686-5053',
  officePhoneHref: 'tel:3106865053',
  directPhone: '310-686-5053',
  /** Approved outbound email addresses. Empty until the owner supplies them. */
  approvedEmails: [] as string[],

  // --- Owner-controlled licensing scope (explicit configuration only) ---
  // California is the confirmed home state for the DRE/NMLS licenses above.
  // Additional states must be added only with owner confirmation + verified
  // numbers; never claim multi-state licensing from marketing copy.
  supportedStates: ['CA'] as string[],
  licensingByState: {
    CA: {
      code: 'CA',
      name: 'California',
      // The CA authority is the DRE corporation/broker licensing above; no
      // separate per-state number is displayed here.
      verified: true,
    },
  } as Record<string, StateLicensing>,

  // --- Domain / routes (owner confirmation required before any change) ---
  // Do NOT change the canonical domain, redirects, sitemap hostnames, or
  // structured-data hostnames until the owner explicitly confirms.
  canonicalCorporateDomain: 'https://wwccm.com', // owner confirmation required
  /** A verified secure-application route, only when one is explicitly approved. */
  secureApplicationUrl: undefined as string | undefined,

  // --- Compliance wording (existing approved language lives in module) ---
  equalHousingLanguage: 'Equal Housing Opportunity.',
} as const;

// ---------------------------------------------------------------------------
// Derived, formatted strings. Build these from the fields above so a single
// edit propagates everywhere. Legal identifiers render identically in every
// language (they are not translated).
// ---------------------------------------------------------------------------

/** "CA DRE Corporation License #02440065 · NMLS #2817729" */
export const COMPANY_LICENSE =
  `CA DRE ${companyFacts.companyDreType} #${companyFacts.companyDreCorporationLicense} · NMLS #${companyFacts.companyNmls}`;

/** "CA DRE Broker License #01385024 · NMLS #2775380" */
export const INDIVIDUAL_LICENSE =
  `CA DRE ${companyFacts.licensedBrokerDreType} #${companyFacts.licensedBrokerDreLicense} · NMLS #${companyFacts.licensedBrokerNmls}`;

/** Company block: legal name + its license line. */
export const COMPANY_LINE = `${companyFacts.companyLegalName} · ${COMPANY_LICENSE}`;

/** Individual block: name + title + license line. */
export const INDIVIDUAL_LINE =
  `${companyFacts.licensedBrokerName} · ${companyFacts.licensedBrokerTitle} · ${INDIVIDUAL_LICENSE}`;

/** One compact string with both entities, company first (never interchanged). */
export const LICENSE_LINE = `${COMPANY_LINE} · ${INDIVIDUAL_LINE}`;

/**
 * Multi-line trust/licensing block used by the AI advisor's identity answer and
 * anywhere the full company + broker facts are shown together.
 */
export const LICENSING_BLOCK = [
  companyFacts.companyLegalName,
  COMPANY_LICENSE,
  '',
  `${companyFacts.licensedBrokerName} · ${companyFacts.licensedBrokerTitle}`,
  INDIVIDUAL_LICENSE,
].join('\n');
