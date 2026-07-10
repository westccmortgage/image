import { describe, it, expect } from 'vitest';
import {
  parseScenario,
  mergeProfile,
  deriveScenario,
  missingRequired,
  nextQuestions,
  buildLead,
  encodeNetlifyForm,
  NETLIFY_FORM_NAME,
  classifyIntent,
  buildReply,
  matchChoiceValue,
  CONTACT_FIELDS,
} from '../index';
import { FIELD_BY_KEY } from '../fields';

const EXAMPLE =
  "I want to buy a $2M home in California. I'm self-employed and have $400k down.";

describe('1. natural language fills the Scenario Profile', () => {
  const p = parseScenario(EXAMPLE);
  const d = deriveScenario(p);

  it('purchase price → $2,000,000', () => {
    expect(p.purchasePrice).toBe(2_000_000);
  });
  it('down payment → $400,000', () => {
    expect(p.downPayment).toBe(400_000);
  });
  it('loan amount → $1,600,000', () => {
    expect(d.loanAmount).toBe(1_600_000);
  });
  it('LTV → 80%', () => {
    expect(d.ltv).toBeCloseTo(80, 5);
  });
  it('employment type → self-employed', () => {
    expect(p.employmentType).toBe('self-employed');
  });
  it('state → California', () => {
    expect(p.state).toBe('California');
  });
  it('handles percent-down phrasing', () => {
    const q = parseScenario('buying a $1,000,000 house with 20% down');
    expect(q.purchasePrice).toBe(1_000_000);
    expect(q.downPayment).toBe(200_000);
  });
});

describe('2. missing required fields are identified', () => {
  const p = parseScenario(EXAMPLE);
  const missing = missingRequired(p);

  it('marks ZIP/county, occupancy, and income doc as still needed', () => {
    expect(missing).toContain('zipOrCounty');
    expect(missing).toContain('occupancy');
    expect(missing).toContain('incomeDocPath');
  });
  it('does not mark already-known fields as missing', () => {
    expect(missing).not.toContain('purchasePrice');
    expect(missing).not.toContain('downPayment');
    expect(missing).not.toContain('employmentType');
    expect(missing).not.toContain('state');
  });
});

describe('3. question engine asks only the next 1–3 questions', () => {
  const p = parseScenario(EXAMPLE);

  it('returns at most 3 questions', () => {
    expect(nextQuestions(p).length).toBeGreaterThan(0);
    expect(nextQuestions(p).length).toBeLessThanOrEqual(3);
  });
  it('asks the highest-priority missing required field first', () => {
    // occupancy (priority 3) comes before income doc (5) and ZIP (6)
    expect(nextQuestions(p)[0].field).toBe('occupancy');
  });
  it('respects an explicit max of 1', () => {
    expect(nextQuestions(p, { max: 1 })).toHaveLength(1);
  });
});

describe('4. contact fields are not requested before value is provided', () => {
  it('never returns name/phone/email among normal questions', () => {
    const p = parseScenario(EXAMPLE);
    const asked = new Set(nextQuestions(p, { max: 3 }).map((q) => q.field));
    for (const c of CONTACT_FIELDS) expect(asked.has(c)).toBe(false);
  });
  it('even a fully-answered scenario does not surface contact without includeContact', () => {
    const full = mergeProfile(parseScenario(EXAMPLE), {
      occupancy: 'primary',
      incomeDocPath: 'bank-statements',
      zipOrCounty: '91604',
      borrowerGoal: 'compare-all',
      fico: 740,
      reserves: 200_000,
    });
    const normal = nextQuestions(full);
    expect(normal.every((q) => !CONTACT_FIELDS.includes(q.field))).toBe(true);
    const contact = nextQuestions(full, { includeContact: true });
    expect(contact.map((q) => q.field)).toEqual(['name', 'phone', 'email']);
  });
});

describe('5. lead submission object is complete', () => {
  const parsed = parseScenario(EXAMPLE);
  const profile = mergeProfile(parsed, {
    occupancy: 'primary',
    incomeDocPath: 'bank-statements',
    name: 'Jane Buyer',
    phone: '310-555-1212',
    email: 'jane@example.com',
  });
  const lead = buildLead({
    originalMessage: EXAMPLE,
    parsedScenario: parsed,
    profile,
    sourcePage: '/strategy',
    utm: { utm_source: 'ig' },
    now: () => '2026-07-10T00:00:00.000Z',
  });

  it('includes the parsed scenario and full form fields', () => {
    expect(lead.parsedScenario.purchasePrice).toBe(2_000_000);
    expect(lead.formFields.name).toBe('Jane Buyer');
    expect(lead.formFields.occupancy).toBe('primary');
  });
  it('includes the AI strategy summary', () => {
    expect(Array.isArray(lead.strategySummary)).toBe(true);
    expect(lead.strategySummary.length).toBeGreaterThan(0);
  });
  it('includes matched loan paths and a cash-to-close estimate', () => {
    expect(lead.loanPaths.length).toBeGreaterThan(0);
    expect(lead.cashToCloseEstimate?.estimatedCashToClose).toBeGreaterThan(400_000);
  });
  it('records missing fields, timestamp, source, and utm', () => {
    expect(lead.missingFields.required).toContain('zipOrCounty');
    expect(lead.timestamp).toBe('2026-07-10T00:00:00.000Z');
    expect(lead.sourcePage).toBe('/strategy');
    expect(lead.utm.utm_source).toBe('ig');
  });
  it('does not carry any sensitive fields', () => {
    const keys = Object.keys(lead.formFields);
    for (const banned of ['ssn', 'dob', 'accountNumber', 'routing']) {
      expect(keys).not.toContain(banned);
    }
  });

  it('conversation understands questions and speaks the numbers', () => {
    expect(classifyIntent('how much do I need to close?')).toBe('cash');
    expect(classifyIntent("what's my monthly payment")).toBe('monthly');
    // short natural answers are understood via synonyms
    expect(
      matchChoiceValue('employmentType', FIELD_BY_KEY.employmentType.options!, 'self'),
    ).toBe('self-employed');
    expect(
      matchChoiceValue('incomeDocPath', FIELD_BY_KEY.incomeDocPath.options!, 'bank'),
    ).toBe('bank-statements');
    // answers the cash question with a real figure when price + down are known
    const withBoth = buildReply({
      userText: 'how much do I need?',
      capturedText: [],
      numbers: {
        hasBoth: true, downPayment: 400000, totalCashToClose: 449189,
        additionalFundsNeeded: 49189, ltv: 80, monthlyPI: 9000, monthlyHousing: 11000,
      },
      nextQuestion: null,
      isFirstMessage: false,
    }).join(' ');
    expect(withBoth).toContain('$449,189');
    // without a down payment it asks for it instead of inventing a number
    const noDown = buildReply({
      userText: 'how much do I need?',
      capturedText: [],
      numbers: {
        hasBoth: false, downPayment: 149000, totalCashToClose: 196381,
        additionalFundsNeeded: 47381, ltv: 89.3, monthlyPI: 8527, monthlyHousing: 10315,
      },
      nextQuestion: null,
      isFirstMessage: false,
    }).join(' ');
    expect(noDown).toMatch(/down payment/i);
    expect(noDown).not.toContain('$196,381');
  });

  it('encodes cleanly for the Netlify Forms (email) adapter', () => {
    const body = encodeNetlifyForm(NETLIFY_FORM_NAME, lead);
    const params = new URLSearchParams(body);
    expect(params.get('form-name')).toBe('scenario-lead');
    expect(params.get('email')).toBe('jane@example.com');
    expect(params.get('purchase_price')).toBe('2000000');
    expect(params.get('occupancy')).toBe('primary');
    // full structured object is preserved for downstream/CRM use
    expect(JSON.parse(params.get('scenario_json') || '{}').parsedScenario.state).toBe(
      'California',
    );
    // never leaks sensitive keys
    expect(body.toLowerCase()).not.toContain('ssn');
  });
});
