// ---------------------------------------------------------------------------
// Default demo / test scenario.
//
// This is the canonical example from the module spec. The fee and prepaid
// line items are chosen so the deterministic engine reproduces the documented
// totals exactly (see cashToCloseCalculations.test.ts):
//
//   Down Payment ................................. $149,000.00
//   LTV .......................................... ~89.35%
//   Lender Fees .................................. $20,535.00
//   Third Party Fees ............................. $5,773.20
//   Government Fees .............................. $200.00
//   Prepaids & Initial Escrow .................... $20,873.02
//   Estimated Total Cash Needed to Close ......... $196,381.22
//   Additional Funds Above Down Payment .......... $47,381.22
//   Monthly P&I .................................. ~$8,527.20
//   Total Approx Monthly Housing Payment ......... ~$10,315.18
// ---------------------------------------------------------------------------

import type { CashToCloseInput } from '../types';

export const defaultScenario: CashToCloseInput = {
  purchasePrice: 1_399_000,
  downPayment: 149_000,

  interestRate: 7.25,
  apr: 7.473,
  termYears: 30,

  loanType: 'Non-QM',
  occupancy: 'Primary Residence',
  state: 'CA',
  zip: '91604',
  productName: '30 Year Non-QM Fixed',

  propertyTaxMonthly: 1_487.98,
  hazardInsuranceMonthly: 300,

  prepaidInterestDays: 26,

  // Lender fees — sum = $20,535.00
  lenderFees: [
    { label: 'Origination fee', amount: 12_500, note: '≈ 1.00% of loan amount' },
    { label: 'Discount points', amount: 4_650, note: 'Buys down pricing on Non-QM' },
    { label: 'Underwriting fee', amount: 1_495 },
    { label: 'Processing fee', amount: 995 },
    { label: 'Admin / application fee', amount: 895 },
  ],

  // Third-party fees — sum = $5,773.20
  thirdPartyFees: [
    { label: "Title — lender's policy", amount: 2_400 },
    { label: 'Escrow / settlement fee', amount: 1_500 },
    { label: 'Appraisal', amount: 850 },
    { label: 'Title — endorsements', amount: 350 },
    { label: 'Tax service / flood certification', amount: 250 },
    { label: 'Notary / signing fee', amount: 200 },
    { label: 'Recording service / courier', amount: 150 },
    { label: 'Credit report', amount: 73.2 },
  ],

  // Government fees — sum = $200.00
  governmentFees: [
    { label: 'Recording fees', amount: 125 },
    { label: 'Government / transfer fee', amount: 75 },
  ],

  // Prepaids & initial escrow EXCLUDING prepaid interest.
  // Prepaid interest (26 days) is derived: 1,250,000 × 7.25% / 365 × 26 = 6,455.48
  // Sum of these = $14,417.54  →  + prepaid interest = $20,873.02
  otherPrepaids: [
    {
      label: "Homeowner's insurance premium (12 mo)",
      amount: 3_600,
      note: 'First-year hazard premium paid at closing',
    },
    {
      label: 'Property tax reserves (impounds)',
      amount: 10_217.54,
      note: 'Initial escrow deposit for property taxes',
    },
    {
      label: "Homeowner's insurance reserves (2 mo)",
      amount: 600,
      note: 'Initial escrow deposit for insurance',
    },
  ],

  sellerCredit: 0,
  lenderCredit: 0,
};
