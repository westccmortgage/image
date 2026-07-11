// ---------------------------------------------------------------------------
// Licensing & compliance — single source of truth.
//
// Two DISTINCT entities. The company NMLS (#2817729) and the individual broker's
// NMLS (#2775380) must NEVER be interchanged.
//
// These are legal identifiers and render identically in every language.
// ---------------------------------------------------------------------------

export const COMPANY = {
  legalName: 'West Coast Capital Mortgage Inc.',
  dreType: 'Corporation License',
  dre: '02440065',
  nmls: '2817729',
} as const;

export const INDIVIDUAL = {
  name: 'Anatoliy Kanevsky',
  title: 'California Real Estate Broker',
  dreType: 'Broker License',
  dre: '01385024',
  nmls: '2775380',
} as const;

/** "CA DRE Corporation License #02440065 · NMLS #2817729" */
export const COMPANY_LICENSE = `CA DRE ${COMPANY.dreType} #${COMPANY.dre} · NMLS #${COMPANY.nmls}`;
/** "CA DRE Broker License #01385024 · NMLS #2775380" */
export const INDIVIDUAL_LICENSE = `CA DRE ${INDIVIDUAL.dreType} #${INDIVIDUAL.dre} · NMLS #${INDIVIDUAL.nmls}`;

/** Company block: name + its license line. */
export const COMPANY_LINE = `${COMPANY.legalName} · ${COMPANY_LICENSE}`;
/** Individual block: name + title + license line. */
export const INDIVIDUAL_LINE = `${INDIVIDUAL.name} · ${INDIVIDUAL.title} · ${INDIVIDUAL_LICENSE}`;

/** One compact string with both entities, company first (never interchanged). */
export const LICENSE_LINE = `${COMPANY_LINE} · ${INDIVIDUAL_LINE}`;
