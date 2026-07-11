import { resolveLoanLimitArea } from './location';
import type {
  BorrowerGoal,
  EmploymentType,
  IncomeDocPath,
  ScenarioProfile,
} from './types';

// ---------------------------------------------------------------------------
// Deterministic natural-language parser. Extracts known scenario facts from a
// free-text message. Pure and fully testable — no AI/network needed. Never
// extracts sensitive data (SSN/DOB/account numbers are not fields here).
// ---------------------------------------------------------------------------

const US_STATES: Record<string, string> = {
  california: 'California',
  ca: 'California',
  texas: 'Texas',
  tx: 'Texas',
  florida: 'Florida',
  fl: 'Florida',
  'new york': 'New York',
  ny: 'New York',
  washington: 'Washington',
  wa: 'Washington',
  oregon: 'Oregon',
  or: 'Oregon',
  nevada: 'Nevada',
  nv: 'Nevada',
  arizona: 'Arizona',
  az: 'Arizona',
  colorado: 'Colorado',
  co: 'Colorado',
};

/** Canonical state name → two-letter USPS code. */
const STATE_CODE: Record<string, string> = {
  California: 'CA',
  Texas: 'TX',
  Florida: 'FL',
  'New York': 'NY',
  Washington: 'WA',
  Oregon: 'OR',
  Nevada: 'NV',
  Arizona: 'AZ',
  Colorado: 'CO',
};

const MAGNITUDE: Record<string, number> = {
  k: 1_000,
  thousand: 1_000,
  m: 1_000_000,
  mm: 1_000_000,
  million: 1_000_000,
  b: 1_000_000_000,
  billion: 1_000_000_000,
};

// Plausibility floors. A home price of "$400" or a down payment of "$20" is
// never real — those are almost always a percentage said aloud ("put 20 down"),
// a stray number, or a spoken-number the parser could not fully assemble. We
// leave the field EMPTY so the advisor asks for it, rather than committing a
// nonsensical scenario the whole tool (and the AI) then reasons from.
export const MIN_PLAUSIBLE_PRICE = 20_000;
export const MIN_PLAUSIBLE_DOWN = 1_000;

/** A bare 1–2 digit amount in a down-payment context is a percent, not dollars. */
export function isLikelyPercent(value: number, hadDollarSign: boolean): boolean {
  return !hadDollarSign && value > 0 && value <= 100;
}

interface MoneyHit {
  value: number;
  start: number;
  end: number;
  context: string;
  hadDollarSign: boolean;
}

const MONEY_RE =
  /\$\s?[\d,]+(?:\.\d+)?\s?(?:k|m|mm|million|thousand|billion|b)?|\b[\d,]+(?:\.\d+)?\s?(?:k|m|mm|million|thousand|billion|b)\b/gi;

function toNumber(raw: string): number | null {
  const m = raw.toLowerCase().match(/([\d,]+(?:\.\d+)?)\s?(k|mm|m|million|thousand|billion|b)?/);
  if (!m) return null;
  const base = parseFloat(m[1].replace(/,/g, ''));
  if (!Number.isFinite(base)) return null;
  const mult = m[2] ? MAGNITUDE[m[2]] ?? 1 : 1;
  return base * mult;
}

function findMoney(text: string): MoneyHit[] {
  const hits: MoneyHit[] = [];
  for (const match of text.matchAll(MONEY_RE)) {
    const value = toNumber(match[0]);
    if (value == null || value <= 0) continue;
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const context = text.slice(Math.max(0, start - 18), end + 18).toLowerCase();
    hits.push({ value, start, end, context, hadDollarSign: match[0].includes('$') });
  }
  return hits;
}

const PRICE_WORDS = /(price|home|house|buy|buying|purchase|property|value|worth|condo)/;
const DOWN_WORDS = /(down|cash|put|bring|have|available|liquid)/;

function classifyMoney(hits: MoneyHit[], profile: ScenarioProfile) {
  const priceHits: MoneyHit[] = [];
  const downHits: MoneyHit[] = [];
  const unknown: MoneyHit[] = [];
  for (const h of hits) {
    const isDown = DOWN_WORDS.test(h.context);
    const isPrice = PRICE_WORDS.test(h.context);
    if (isDown && !isPrice) downHits.push(h);
    else if (isPrice && !isDown) priceHits.push(h);
    else if (isPrice && isDown) priceHits.push(h); // "buy ... with cash" → treat as price
    else unknown.push(h);
  }

  // A down-payment amount that reads like a percentage ("put 20 down", "20 down")
  // becomes downPaymentPercent, never a literal $20. Dollar amounts must clear a
  // plausibility floor before we commit them.
  for (const h of downHits) {
    if (isLikelyPercent(h.value, h.hadDollarSign)) {
      if (profile.downPaymentPercent == null) profile.downPaymentPercent = h.value;
    } else if (h.value >= MIN_PLAUSIBLE_DOWN && profile.downPayment == null) {
      profile.downPayment = h.value;
    }
  }
  for (const h of priceHits) {
    if (h.value >= MIN_PLAUSIBLE_PRICE && profile.purchasePrice == null) {
      profile.purchasePrice = h.value;
    }
  }

  // Resolve leftover amounts by magnitude when a slot is still open — but only
  // when they are plausible. Never let a stray small number become a home price.
  const open = unknown.sort((a, b) => b.value - a.value);
  for (const h of open) {
    if (profile.purchasePrice == null && h.value >= MIN_PLAUSIBLE_PRICE) {
      profile.purchasePrice = h.value;
    } else if (
      profile.downPayment == null &&
      h.value >= MIN_PLAUSIBLE_DOWN &&
      h.value < (profile.purchasePrice ?? Infinity)
    ) {
      profile.downPayment = h.value;
    }
  }
}

export function parseScenario(text: string): ScenarioProfile {
  const profile: ScenarioProfile = {};
  if (!text || !text.trim()) return profile;
  const lower = ` ${text.toLowerCase()} `;

  // --- money (price / down) ---
  classifyMoney(findMoney(text), profile);

  // --- percent down --- accept "%", "percent", "pct", and common RU/ES/ZH words
  const PCT = '(?:%|percent|pct|процент\\w*|por\\s?ciento|por\\s?cent|百分)';
  const pct = lower.match(
    new RegExp(
      `(\\d{1,2}(?:\\.\\d+)?)\\s?${PCT}[^.]{0,14}?(down|dp|put)|(down|dp|put)[^.]{0,14}?(\\d{1,2}(?:\\.\\d+)?)\\s?${PCT}`,
    ),
  );
  if (pct) {
    const num = parseFloat(pct[1] ?? pct[4]);
    if (Number.isFinite(num) && num > 0 && num <= 100) profile.downPaymentPercent = num;
  }

  // Bare "put 20 down" / "20 down" with no %, no $ — a 1–2 digit amount tied to
  // down-payment phrasing is a percentage (a $20 down payment is never real).
  if (profile.downPaymentPercent == null) {
    const bare =
      lower.match(/\bput(?:ting)?\s+(\d{1,2})(?:\s+down)?\b/) ||
      lower.match(/\b(\d{1,2})\s+(?:percent\s+)?down\b/) ||
      lower.match(/\bdown\s+(?:payment\s+)?(?:of\s+)?(\d{1,2})\b/);
    if (bare) {
      const idx = bare.index ?? 0;
      const hadDollar = lower[Math.max(0, idx - 1)] === '$' || /\$\s?\d/.test(bare[0]);
      const n = parseInt(bare[1], 10);
      if (!hadDollar && n > 0 && n <= 100) profile.downPaymentPercent = n;
    }
  }

  // A known percent + a known price yields the dollar down payment (whether the
  // percent came from the phrasing above or from a "put 20 down" style amount).
  if (profile.downPaymentPercent != null && profile.purchasePrice && profile.downPayment == null) {
    profile.downPayment = Math.round((profile.purchasePrice * profile.downPaymentPercent) / 100);
  }

  // --- loan purpose ---
  if (/\b(refinance|refi|cash.?out|rate.?and.?term)\b/.test(lower)) profile.loanPurpose = 'refinance';
  else if (/\b(buy|buying|purchase|purchasing|home|house|condo|property)\b/.test(lower))
    profile.loanPurpose = 'purchase';

  // --- state ---
  for (const [needle, canonical] of Object.entries(US_STATES)) {
    const re = new RegExp(`(^|[^a-z])${needle}([^a-z]|$)`, 'i');
    if (re.test(lower)) {
      profile.state = canonical;
      profile.stateCode = STATE_CODE[canonical];
      break;
    }
  }

  // --- city ("City, ST" or "City, State") — used for reliable county lookup ---
  const cityMatch = text.match(
    /([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){0,2}),\s*(?:[A-Z]{2}\b|California|Texas|Florida|Washington|Oregon|Nevada|Arizona|Colorado|New York)/,
  );
  if (cityMatch) profile.city = cityMatch[1].trim();

  // --- occupancy ---
  if (/\b(primary|owner.occupied|live in|main home)\b/.test(lower)) profile.occupancy = 'primary';
  else if (/\b(second home|vacation|getaway)\b/.test(lower)) profile.occupancy = 'second';
  else if (/\b(investment|rental|rent it|rent out|dscr|cash.flow)\b/.test(lower))
    profile.occupancy = 'investment';

  // --- employment ---
  const emp: [RegExp, EmploymentType][] = [
    [/\bself.?employed\b/, 'self-employed'],
    [/\bw.?2\b/, 'w2'],
    [/\b1099\b/, '1099'],
    [/\bbusiness owner\b/, 'business-owner'],
    [/\bretired\b/, 'retired'],
    [/\bforeign national\b/, 'foreign-national'],
    [/\binvestor\b/, 'investor'],
  ];
  for (const [re, val] of emp) {
    if (re.test(lower)) {
      profile.employmentType = val;
      break;
    }
  }

  // --- income doc path ---
  const doc: [RegExp, IncomeDocPath][] = [
    [/\bbank statement/, 'bank-statements'],
    [/\b(full.?doc|tax returns?|w.?2 income)\b/, 'full-doc'],
    [/\b(p&l|p and l|profit and loss)\b/, 'p-and-l'],
    [/\basset depletion\b/, 'asset-depletion'],
    [/\bdscr\b/, 'dscr'],
  ];
  for (const [re, val] of doc) {
    if (re.test(lower)) {
      profile.incomeDocPath = val;
      break;
    }
  }

  // --- FICO ---
  const fico = lower.match(/(\d{3})\s?(?:fico|credit)|(?:fico|credit score|score)[^\d]{0,8}(\d{3})/);
  if (fico) {
    const n = parseInt(fico[1] ?? fico[2], 10);
    if (n >= 300 && n <= 850) profile.fico = n;
  }

  // --- reserves ---
  if (/reserv/.test(lower)) {
    const near = lower.match(/reserv\w*[^$\d]{0,14}(\$?\s?[\d,]+(?:\.\d+)?\s?(?:k|m|million|thousand)?)|(\$?\s?[\d,]+(?:\.\d+)?\s?(?:k|m|million|thousand)?)[^$\d]{0,10}reserv/);
    const raw = near?.[1] ?? near?.[2];
    if (raw) {
      const v = toNumber(raw);
      if (v && v > 0) profile.reserves = v;
    }
  }

  // --- goal ---
  const goals: [RegExp, BorrowerGoal][] = [
    [/lowest payment|lower payment|smallest payment/, 'lowest-payment'],
    [/lowest cash|least cash|minimize cash/, 'lowest-cash-to-close'],
    [/easiest approval|easy approval|just get approved/, 'easiest-approval'],
    [/long.?term|lifetime cost|overall cost/, 'best-long-term'],
    [/fastest|close quick|quick close|asap/, 'fastest-close'],
    [/compare|all options|options/, 'compare-all'],
  ];
  for (const [re, val] of goals) {
    if (re.test(lower)) {
      profile.borrowerGoal = val;
      break;
    }
  }

  // --- ZIP / county (avoid money digits) ---
  const zip = text.match(/\b(\d{5})\b/);
  if (zip && !isPartOfMoney(text, zip.index ?? 0)) profile.zipOrCounty = zip[1];
  const county = lower.match(/([a-z][a-z .'-]{2,}?)\s+county\b/);
  if (county && !profile.zipOrCounty) profile.zipOrCounty = `${county[1].trim()} County`;

  // Resolve the loan-limit area conservatively — only set `county` when it is
  // reliably known (explicit "X County" or a curated city). A city we can't map
  // (e.g. "Santa Clarita") is never guessed onto the wrong county.
  if (profile.city || profile.zipOrCounty) {
    const area = resolveLoanLimitArea({
      city: profile.city,
      zipOrCounty: profile.zipOrCounty,
      state: profile.state,
    });
    if (area.county) profile.county = area.county;
    profile.countyConfidence = area.confidence;
  }

  // --- contact (only if explicitly present) ---
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (email) profile.email = email[0];
  const phone = text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  if (phone && !isPartOfMoney(text, phone.index ?? 0)) profile.phone = phone[0].trim();

  return profile;
}

function isPartOfMoney(text: string, index: number): boolean {
  const before = text.slice(Math.max(0, index - 2), index);
  const after = text.slice(index + 5, index + 8).toLowerCase();
  return before.includes('$') || /^(k|m|,)/.test(after);
}
