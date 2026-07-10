import type { FieldDef, FieldKey } from './types';

// Field registry — the 12 short-form fields (+ state), their questions, choice
// options, importance, and ask-order. Contact fields are last and gated.
export const FIELD_DEFS: FieldDef[] = [
  {
    key: 'purchasePrice',
    label: 'Purchase price / value',
    importance: 'required',
    blocking: true,
    kind: 'money',
    priority: 1,
    question: "What's the purchase price or estimated value?",
  },
  {
    key: 'downPayment',
    label: 'Down payment / available cash',
    importance: 'required',
    blocking: true,
    kind: 'money',
    priority: 2,
    question: 'How much do you have for a down payment or available cash?',
  },
  {
    key: 'occupancy',
    label: 'Occupancy',
    importance: 'required',
    blocking: true,
    kind: 'choice',
    priority: 3,
    question:
      'Will this be a primary residence, second home, or investment property?',
    options: [
      { value: 'primary', label: 'Primary residence' },
      { value: 'second', label: 'Second home' },
      { value: 'investment', label: 'Investment' },
    ],
  },
  {
    key: 'employmentType',
    label: 'Employment type',
    importance: 'required',
    blocking: true,
    kind: 'choice',
    priority: 4,
    question:
      'How is your income earned — W-2, self-employed, 1099, business owner, retired, or investor?',
    options: [
      { value: 'w2', label: 'W-2' },
      { value: 'self-employed', label: 'Self-employed' },
      { value: '1099', label: '1099' },
      { value: 'business-owner', label: 'Business owner' },
      { value: 'retired', label: 'Retired' },
      { value: 'investor', label: 'Investor' },
      { value: 'foreign-national', label: 'Foreign national' },
    ],
  },
  {
    key: 'incomeDocPath',
    label: 'Income documentation',
    importance: 'required',
    blocking: true,
    kind: 'choice',
    priority: 5,
    question:
      'How would you prefer to document income — tax returns, bank statements, P&L, asset depletion, DSCR, or not sure?',
    options: [
      { value: 'full-doc', label: 'Full-doc tax returns' },
      { value: 'bank-statements', label: 'Bank statements' },
      { value: 'p-and-l', label: 'P&L' },
      { value: 'asset-depletion', label: 'Asset depletion' },
      { value: 'dscr', label: 'DSCR' },
      { value: 'unsure', label: 'Not sure' },
    ],
  },
  {
    key: 'zipOrCounty',
    label: 'ZIP / county',
    importance: 'required',
    kind: 'text',
    priority: 6,
    question: 'What ZIP code or county is the property in?',
  },
  {
    key: 'borrowerGoal',
    label: 'Primary goal',
    importance: 'required',
    kind: 'choice',
    priority: 7,
    question:
      'What matters most — lowest payment, lowest cash to close, easiest approval, best long-term cost, fastest close, or compare all?',
    options: [
      { value: 'lowest-payment', label: 'Lowest payment' },
      { value: 'lowest-cash-to-close', label: 'Lowest cash to close' },
      { value: 'easiest-approval', label: 'Easiest approval' },
      { value: 'best-long-term', label: 'Best long-term cost' },
      { value: 'fastest-close', label: 'Fastest close' },
      { value: 'compare-all', label: 'Compare all' },
    ],
  },
  {
    key: 'state',
    label: 'State',
    importance: 'required',
    kind: 'text',
    priority: 8,
    question: 'Which state is the property in?',
  },
  {
    key: 'fico',
    label: 'Estimated FICO',
    importance: 'helpful',
    kind: 'number',
    priority: 9,
    question: "Roughly what's your estimated FICO score?",
  },
  {
    key: 'reserves',
    label: 'Reserves after closing',
    importance: 'helpful',
    kind: 'money',
    priority: 10,
    question: 'About how much will you have in reserves after closing?',
  },
  {
    key: 'name',
    label: 'Name',
    importance: 'contact',
    kind: 'text',
    priority: 20,
    question: 'Your name?',
  },
  {
    key: 'phone',
    label: 'Phone',
    importance: 'contact',
    kind: 'text',
    priority: 21,
    question: 'Best phone number?',
  },
  {
    key: 'email',
    label: 'Email',
    importance: 'contact',
    kind: 'text',
    priority: 22,
    question: 'Best email to send it to?',
  },
];

export const FIELD_BY_KEY: Record<string, FieldDef> = Object.fromEntries(
  FIELD_DEFS.map((f) => [f.key, f]),
);

/** Choice value → human label, for display in the profile card. */
export function labelForValue(key: FieldKey, value: string): string {
  const def = FIELD_BY_KEY[key];
  const opt = def?.options?.find((o) => o.value === value);
  return opt?.label ?? value;
}
