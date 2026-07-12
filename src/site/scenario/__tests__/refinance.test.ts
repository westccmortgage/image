import { describe, it, expect } from 'vitest';
import { parseScenario } from '../parseScenario';
import { mergeProfile, missingRequired, missingBlocking } from '../profile';
import { nextBestQuestion } from '../questionEngine';
import { fieldLabel, fieldQuestion } from '../fieldsI18n';
import { buildCompactProfile } from '../selectors';
import type { ScenarioProfile } from '../types';

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
});
