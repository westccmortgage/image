// ---------------------------------------------------------------------------
// Licensing & compliance — re-export of the central source of truth.
//
// The canonical values now live in src/config/company-facts.ts. This module is
// kept as a stable import surface (COMPANY / INDIVIDUAL objects + the formatted
// license lines) so existing components need not change. Do NOT redefine the
// numbers here — edit company-facts.ts.
//
// The company NMLS (#2817729) and the individual broker's NMLS (#2775380) must
// NEVER be interchanged.
// ---------------------------------------------------------------------------

import { companyFacts } from '../config/company-facts';

export {
  COMPANY_LICENSE,
  INDIVIDUAL_LICENSE,
  COMPANY_LINE,
  INDIVIDUAL_LINE,
  LICENSE_LINE,
  LICENSING_BLOCK,
} from '../config/company-facts';

export const COMPANY = {
  legalName: companyFacts.companyLegalName,
  dreType: companyFacts.companyDreType,
  dre: companyFacts.companyDreCorporationLicense,
  nmls: companyFacts.companyNmls,
} as const;

export const INDIVIDUAL = {
  name: companyFacts.licensedBrokerName,
  title: companyFacts.licensedBrokerTitle,
  dreType: companyFacts.licensedBrokerDreType,
  dre: companyFacts.licensedBrokerDreLicense,
  nmls: companyFacts.licensedBrokerNmls,
} as const;
