import type { CountyConfidence } from './types';

// ---------------------------------------------------------------------------
// Loan-limit area resolver.
//
// County drives conforming/high-balance/FHA loan limits, so getting it wrong is
// a real problem. We therefore resolve county ONLY from reliable signals:
//   1. An explicit "<name> County" phrase.
//   2. An exact, curated city→county mapping (whole-city match — never a
//      substring, so "Santa Clarita" is NOT confused with "Santa Clara").
// A 5-digit ZIP pins the area well enough that we don't need to ask again, but
// we don't invent a county name from it.
//
// Anything else → uncertain, and the advisor asks for a ZIP or county.
// ---------------------------------------------------------------------------

export interface AreaResolution {
  city?: string;
  county?: string;
  zip?: string;
  confidence: CountyConfidence;
  /** True when we should ask the borrower to confirm ZIP/county. */
  needsConfirmation: boolean;
}

// Curated, reliable city → county map. Keys are normalized (lowercase, single
// spaces). Only entries we are confident about — expand deliberately.
const CITY_TO_COUNTY: Record<string, string> = {
  // Los Angeles County — note "santa clarita" lives here, NOT in Santa Clara.
  'santa clarita': 'Los Angeles',
  'los angeles': 'Los Angeles',
  'long beach': 'Los Angeles',
  pasadena: 'Los Angeles',
  burbank: 'Los Angeles',
  glendale: 'Los Angeles',
  'santa monica': 'Los Angeles',
  'beverly hills': 'Los Angeles',
  torrance: 'Los Angeles',
  'west hollywood': 'Los Angeles',
  calabasas: 'Los Angeles',
  // Santa Clara County (the actual city of Santa Clara + neighbors).
  'santa clara': 'Santa Clara',
  'san jose': 'Santa Clara',
  sunnyvale: 'Santa Clara',
  'palo alto': 'Santa Clara',
  'mountain view': 'Santa Clara',
  cupertino: 'Santa Clara',
  // Orange County
  irvine: 'Orange',
  anaheim: 'Orange',
  'santa ana': 'Orange',
  'newport beach': 'Orange',
  'huntington beach': 'Orange',
  // San Diego County
  'san diego': 'San Diego',
  carlsbad: 'San Diego',
  'chula vista': 'San Diego',
  // San Francisco / Bay
  'san francisco': 'San Francisco',
  oakland: 'Alameda',
  berkeley: 'Alameda',
  fremont: 'Alameda',
  // Other CA
  sacramento: 'Sacramento',
  fresno: 'Fresno',
  'santa barbara': 'Santa Barbara',
  riverside: 'Riverside',
  'san bernardino': 'San Bernardino',
};

function normalizeCity(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolve the loan-limit area from whatever location signals we have.
 * Deterministic and conservative — prefers "uncertain" over a wrong county.
 */
export function resolveLoanLimitArea(input: {
  city?: string;
  zipOrCounty?: string;
  state?: string;
}): AreaResolution {
  const res: AreaResolution = { confidence: 'uncertain', needsConfirmation: true };
  const raw = (input.zipOrCounty ?? '').trim();

  // 1. Explicit ZIP → authoritative for loan-limit purposes.
  const zip = raw.match(/\b(\d{5})\b/);
  if (zip) {
    res.zip = zip[1];
    res.confidence = 'confirmed';
    res.needsConfirmation = false;
  }

  // 2. Explicit "<name> County".
  const countyPhrase = raw.match(/([a-z][a-z .'-]*?)\s+county\b/i);
  if (countyPhrase) {
    res.county = titleCase(countyPhrase[1].trim());
    res.confidence = 'confirmed';
    res.needsConfirmation = false;
  }

  // 3. Curated exact city match (only if we don't already have a county).
  const cityRaw = input.city ?? '';
  if (cityRaw) res.city = titleCase(normalizeCity(cityRaw));
  if (!res.county && cityRaw) {
    const key = normalizeCity(cityRaw);
    const mapped = CITY_TO_COUNTY[key];
    if (mapped) {
      res.county = mapped;
      res.confidence = 'confirmed';
      res.needsConfirmation = false;
    } else {
      // Known city string but not in our reliable map → do not guess a county.
      res.confidence = 'uncertain';
      res.needsConfirmation = true;
    }
  }

  return res;
}

function titleCase(s: string): string {
  return s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}
