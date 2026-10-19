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

// Income phrasing around a money amount. A figure described as a yearly/monthly
// salary is the borrower's INCOME, never the purchase price or the down payment.
// Without this guard, "I make $200k a year, buying an $800k place" lets the
// $200k income land in the price slot and drops the real $800k.
const INCOME_CTX =
  /(per\s*year|a\s*year|\/\s*yr|\byr\b|annual|salary|income|\bearns?\b|\bearning\b|\bmakes?\b|\bmaking\b|per\s*month|a\s*month|\/\s*mo\b|monthly|\bgross\b|\bwages?\b|зарплат|доход|salario|ingres|年收入|月收入|工资|收入)/;

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
  /\$\s?[\d,]+(?:\.\d+)?\s?(?:k|m|mm|million|thousand|billion|b)?|\b[\d,]+(?:\.\d+)?\s?(?:k|m|mm|million|thousand|billion|b)\b|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/gi;

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

/**
 * Remove the two endpoints of a stated range before assigning price/down slots.
 * A range such as "between 900k and 1.1 million" is planning uncertainty, not
 * a $900k price paired with a $1.1M down payment. The advisor will ask for one
 * working price instead of silently inventing a scenario from the endpoints.
 */
function withoutRangeEndpoints(hits: MoneyHit[], text: string): MoneyHit[] {
  if (hits.length < 2) return hits;
  const lower = text.toLowerCase();
  const excluded = new Set<number>();
  for (let i = 0; i < hits.length - 1; i += 1) {
    const a = hits[i];
    const b = hits[i + 1];
    const before = lower.slice(Math.max(0, a.start - 18), a.start);
    const between = lower.slice(a.end, b.start);
    const explicitRange = /\b(?:between|from)\s*$/.test(before) && /^\s*(?:and|to|[-–—])\s*$/.test(between);
    const compactRange = /^\s*[-–—]\s*$/.test(between) && /\b(?:range|budget|price|home|house|buy|buying)\b/.test(before);
    if (explicitRange || compactRange) {
      excluded.add(i);
      excluded.add(i + 1);
    }
  }
  return hits.filter((_, i) => !excluded.has(i));
}

const PRICE_WORDS = /(price|home|house|buy|buying|purchase|purchasing|property|value|worth|condo|estate|place|listing|cost)/;
// A down word must sit IMMEDIATELY next to the number — either right after
// ("85k down", "300,000 down") or right before ("put 300k", "cash of 250k",
// "have 250k", "saved 250k"). This prevents a separate "20% down" phrase from
// mislabeling an adjacent PRICE as the down payment.
const DOWN_AFTER = /^\s*(?:dollars?\s+)?(?:down|dp)\b/;
const DOWN_BEFORE = /\b(?:put(?:ting)?|down\s*payment|dp|cash|bring(?:ing)?|have|having|available|liquid|saved?|deposit|contribut\w*)\s*(?:of\s*)?(?:is\s*)?$/;

function classifyMoney(hits: MoneyHit[], profile: ScenarioProfile, text: string) {
  const lower = text.toLowerCase();
  const priceHits: MoneyHit[] = [];
  const downHits: MoneyHit[] = [];
  const unknown: MoneyHit[] = [];
  for (const h of hits) {
    const after = lower.slice(h.end, h.end + 12);
    const before = lower.slice(Math.max(0, h.start - 18), h.start);
    const isDown = DOWN_AFTER.test(after) || DOWN_BEFORE.test(before);
    // An amount described as salary / "per year" / "a month" is income — neither
    // the price nor the down payment — unless it is explicitly a down-payment
    // amount. Bound the check to the current clause so a neighbouring clause's
    // "a year" can't tag an unrelated amount.
    if (!isDown && INCOME_CTX.test(clauseCtx(lower, h.start, h.end))) continue;
    const nearPrice = PRICE_WORDS.test(before) || PRICE_WORDS.test(after);
    if (isDown) downHits.push(h);
    else if (nearPrice) priceHits.push(h);
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
  classifyMoney(withoutRangeEndpoints(findMoney(text), text), profile, text);

  // Spoken price with "million" dropped: "home around 1.4" → $1.4M. A bare small
  // DECIMAL in a price context almost always means millions (nobody buys a $1.40
  // home). Requiring a decimal avoids misreading "a 2 bedroom home" as $2M.
  if (profile.purchasePrice == null) {
    const m = lower.match(
      /(?:price|home|house|buy|buying|purchase|property|value|worth|condo|around|about)\D{0,12}?(\d{1,2}\.\d{1,2})\b(?!\s?(?:%|percent|k\b|thousand|bed|bath|br\b|acre|year|yr))/,
    );
    if (m) {
      const v = parseFloat(m[1]);
      if (v >= 0.3 && v <= 30) profile.purchasePrice = Math.round(v * 1_000_000);
    }
  }

  // --- percent down --- accept "%", "percent", "pct", and common RU/ES/ZH words
  const PCT = '(?:%|percent|pct|процент\\w*|por\\s?ciento|por\\s?cent|百分)';
  // Down anchor incl. multilingual: enganche/inicial (ES), взнос/первоначальн (RU),
  // 首付/首期/頭期 (ZH).
  const DP = '(?:down|dp|put|enganche|inicial|pie|взнос|первоначальн\\w*|首付|首期|頭期)';
  const pct = lower.match(
    new RegExp(
      `(\\d{1,2}(?:\\.\\d+)?)\\s?${PCT}[^.]{0,16}?${DP}|${DP}[^.]{0,16}?(\\d{1,2}(?:\\.\\d+)?)\\s?${PCT}`,
    ),
  );
  if (pct) {
    const num = parseFloat(pct[1] ?? pct[2]);
    if (Number.isFinite(num) && num > 0 && num <= 100) profile.downPaymentPercent = num;
  }

  // Explicit zero-down ("0 down", "zero down", "no money down") → $0 down / 100% LTV.
  if (profile.downPayment == null && profile.downPaymentPercent == null &&
      /\b(?:0|zero|no)\s*(?:%|percent|money)?\s*down\b/.test(lower)) {
    profile.downPayment = 0;
    profile.downPaymentPercent = 0;
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

  // --- loan purpose --- refinance wins; purchase requires a BUY VERB, not just a
  // noun like "home"/"house" (so a later "home worth $4M" can't flip a refi to a
  // purchase and re-trigger the down-payment question).
  if (/\b(refinance|refi|refinancing|cash.?out|rate.?and.?term)\b/.test(lower)) profile.loanPurpose = 'refinance';
  else if (/\b(buy|buying|bought|purchase|purchasing|first.?time buyer)\b/.test(lower))
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

  // Bare-integer money in explicit price/down phrasing ("down payment 50000",
  // "price 750000", "buy 650000 home with 130000 down") — MONEY_RE only matches
  // $/comma/suffix forms, so capture a 4–8 digit amount unambiguously tied to a
  // price or down-payment word on EITHER side, while refusing income amounts and
  // keeping a down amount out of the price slot.
  if (profile.downPayment == null) {
    const m =
      lower.match(/\b(?:down\s*payment|down|dp|put|cash|saved?|deposit)\s*(?:of\s*|is\s*)?\$?(\d{4,8})\b(?!\s?%)/) ||
      lower.match(/\b\$?(\d{4,8})\s+(?:dollars?\s+)?(?:down(?:\s*payment)?|dp)\b/);
    if (m) {
      const v = parseInt(m[1], 10);
      if (v >= MIN_PLAUSIBLE_DOWN && !INCOME_CTX.test(matchCtx(lower, m))) profile.downPayment = v;
    }
  }
  if (profile.purchasePrice == null) {
    const m =
      lower.match(/\b(?:price|home|house|value|worth|purchase|cost)\D{0,6}\$?(\d{4,8})\b(?!\s?%)(?!\s*(?:down|dp)\b)/) ||
      lower.match(/\b\$?(\d{4,8})\s+(?:dollars?\s+)?(?:home|house|condo|property|place|purchase)\b/);
    if (m) {
      const v = parseInt(m[1], 10);
      if (v >= MIN_PLAUSIBLE_PRICE && v !== profile.downPayment && !INCOME_CTX.test(matchCtx(lower, m)))
        profile.purchasePrice = v;
    }
  }

  // Multilingual magnitude price. The Latin MONEY_RE misses Chinese 万 (10k) /
  // 亿 (100M) and Russian миллион / млн / тысяч, so capture those directly for
  // the price (and a Chinese 首付 amount for the down) when a slot is still open.
  if (profile.purchasePrice == null) {
    for (const mm of text.matchAll(/(\d+(?:\.\d+)?)\s*(万|亿)/g)) {
      const i = mm.index ?? 0;
      if (/首付|首期|頭期|头期/.test(text.slice(Math.max(0, i - 8), i))) continue; // that is the down
      if (INCOME_CTX.test(text.slice(Math.max(0, i - 12), i + mm[0].length + 6))) continue;
      const v = Math.round(parseFloat(mm[1]) * (mm[2] === '亿' ? 1e8 : 1e4));
      if (Number.isFinite(v) && v >= MIN_PLAUSIBLE_PRICE) {
        profile.purchasePrice = v;
        break;
      }
    }
  }
  if (profile.purchasePrice == null) {
    const ru = lower.match(/(\d+(?:[.,]\d+)?)\s*(миллион\w*|млн\.?|тысяч\w*|тыс\.?)/);
    if (ru && !INCOME_CTX.test(lower.slice(Math.max(0, (ru.index ?? 0) - 12), (ru.index ?? 0) + ru[0].length + 6))) {
      const v = Math.round(parseFloat(ru[1].replace(',', '.')) * (/млн|миллион/.test(ru[2]) ? 1e6 : 1e3));
      if (Number.isFinite(v) && v >= MIN_PLAUSIBLE_PRICE) profile.purchasePrice = v;
    }
  }
  // Chinese down payment stated in 万 ("首付60万") when no percent was given.
  if (profile.downPayment == null && profile.downPaymentPercent == null) {
    const zhDown = text.match(/(?:首付|首期|頭期|头期)\D{0,4}(\d+(?:\.\d+)?)\s*万/);
    if (zhDown) {
      const v = Math.round(parseFloat(zhDown[1]) * 1e4);
      if (Number.isFinite(v) && v >= MIN_PLAUSIBLE_DOWN) profile.downPayment = v;
    }
  }
  // Re-derive the dollar down payment if a percent is now paired with a price
  // that was only resolved by the multilingual pass above.
  if (profile.downPaymentPercent != null && profile.purchasePrice && profile.downPayment == null) {
    profile.downPayment = Math.round((profile.purchasePrice * profile.downPaymentPercent) / 100);
  }

  // --- ZIP / county (avoid money digits and amounts in a price/down context) ---
  const zip = text.match(/\b(\d{5})\b/);
  if (zip) {
    const idx = zip.index ?? 0;
    const zBefore = text.slice(Math.max(0, idx - 16), idx).toLowerCase();
    const moneyCtx = /\$|\b(?:down|payment|cash|put|price|worth|value|saved?|deposit|reserve)\s*$/.test(zBefore);
    if (!isPartOfMoney(text, idx) && !moneyCtx) profile.zipOrCounty = zip[1];
  }
  const county = lower.match(/([a-z][a-z .'-]{2,}?)\s+county\b/);
  if (county && !profile.zipOrCounty) profile.zipOrCounty = `${titleCase(county[1].trim())} County`;

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

  // Impossible purchase math is never allowed to reach the calculator. Keep
  // the price, clear the invalid down payment, and let the question engine ask
  // for a valid amount instead of presenting a fabricated zero-dollar loan.
  if (
    profile.purchasePrice != null &&
    profile.downPayment != null &&
    profile.downPayment > profile.purchasePrice
  ) {
    delete profile.downPayment;
    delete profile.downPaymentPercent;
  }

  return profile;
}

/** Title-case a lowercased place name ("los angeles" → "Los Angeles"). */
function titleCase(s: string): string {
  return s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/** The text window around a regex match, for income-context checks. */
function matchCtx(text: string, m: RegExpMatchArray): string {
  const i = m.index ?? 0;
  return clauseCtx(text, i, i + m[0].length);
}

/** The amount plus its neighbouring text, bounded to the current clause so a
 *  separate clause (past a comma / period) can't leak context onto it. */
function clauseCtx(text: string, start: number, end: number): string {
  const before = text.slice(Math.max(0, start - 18), start).split(/[,.;!?，。；、\n]/).pop() ?? '';
  const after = (text.slice(end, end + 18).split(/[,.;!?，。；、\n]/)[0]) ?? '';
  return before + text.slice(start, end) + after;
}

function isPartOfMoney(text: string, index: number): boolean {
  const before = text.slice(Math.max(0, index - 2), index);
  // Only a comma FOLLOWED BY DIGITS is a thousands separator ("90,000"); a
  // trailing comma ("90210, price") is punctuation, not money.
  const after = text.slice(index + 5, index + 8).toLowerCase().replace(/^,(?!\d)/, '');
  return before.includes('$') || /^(k|m|,)/.test(after);
}
