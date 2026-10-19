import { describe, it, expect } from 'vitest';
import { parseScenario } from '../parseScenario';
import {
  mergeProfile,
  missingRequired,
  missingBlocking,
  hasFullNumbers,
  isReadyForOptions,
  isStrategyReady,
} from '../profile';
import { nextBestQuestion } from '../questionEngine';
import { fieldLabel, fieldQuestion } from '../fieldsI18n';
import { buildCompactProfile } from '../selectors';
import type { ScenarioProfile } from '../types';
import { matchLoanPrograms } from '../loanPrograms';
import { runAdvisorTurn } from '../voiceTurn';

// A refinance has NO down payment. The advisor must not ask for one, must not
// list it as missing, and must reframe "purchase price" as the home's value.

describe('refinance flow — never asks for a down payment', () => {
  const p: ScenarioProfile = mergeProfile(
    parseScenario('I want to refinance my mortgage'),
    { purchasePrice: 4_000_000 },
  );

  it('parses the refinance purpose', () => {
    expect(p.loanPurpose).toBe('refinance');
  });

  it('down payment is not a required or blocking missing field', () => {
    expect(missingRequired(p)).not.toContain('downPayment');
    expect(missingBlocking(p)).not.toContain('downPayment');
  });

  it('the next best question is not the down-payment question', () => {
    const nq = nextBestQuestion(p);
    expect(nq?.field).not.toBe('downPayment');
  });

  it('relabels "purchase price" as the estimated home value (all languages)', () => {
    expect(fieldLabel('en', 'purchasePrice', 'refinance')).toBe('Estimated home value');
    expect(fieldQuestion('en', 'purchasePrice', 'refinance')).toBe("What's your home's estimated value?");
    // Localized refi labels differ from the purchase wording.
    expect(fieldLabel('es', 'purchasePrice', 'refinance')).not.toBe(
      fieldLabel('es', 'purchasePrice', 'purchase'),
    );
    expect(fieldLabel('ru', 'purchasePrice', 'refinance')).toContain('стоимость');
  });

  it('the compact profile shows the home-value label and no down-payment ask', () => {
    const compact = buildCompactProfile(p, 'en');
    expect(compact.criticalMissing).not.toContain('Down payment / available cash');
    const homeValueFact = compact.facts.find((f) => f.key === 'purchasePrice');
    expect(homeValueFact?.label).toBe('Estimated home value');
  });

  it('a purchase still asks for the down payment (no regression)', () => {
    const purchase = parseScenario('I want to buy a $2M home');
    expect(missingRequired(purchase)).toContain('downPayment');
    expect(fieldLabel('en', 'purchasePrice')).toBe('Purchase price / value');
  });

  it('never treats purchase-style fields as a complete refinance calculation', () => {
    const unsafeShape: ScenarioProfile = {
      loanPurpose: 'refinance',
      purchasePrice: 900_000,
      downPayment: 750_000,
      occupancy: 'primary',
      employmentType: 'w2',
    };
    expect(hasFullNumbers(unsafeShape)).toBe(false);
    expect(isReadyForOptions(unsafeShape)).toBe(false);
    expect(isStrategyReady(unsafeShape)).toBe(false);
    expect(matchLoanPrograms(unsafeShape)).toEqual([]);
  });

  it('asks only for estimated home value, then stops for licensed review', () => {
    const first = runAdvisorTurn({ text: 'I want to refinance', isFirst: true });
    expect(first.pendingField).toBe('purchasePrice');
    expect(first.reply).toMatch(/does not calculate refinance savings/i);
    expect(first.reply).not.toMatch(/down payment/i);

    const second = runAdvisorTurn({
      text: 'home is worth $900,000',
      profile: first.profile,
      pendingField: first.pendingField,
    });
    expect(second.profile.purchasePrice).toBe(900_000);
    expect(second.pendingField).toBeNull();
    expect(second.readyForOptions).toBe(false);
    expect(second.numbers.hasBoth).toBe(false);
  });
});
