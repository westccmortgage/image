import { describe, it, expect } from 'vitest';
import {
  COMPANY,
  INDIVIDUAL,
  COMPANY_LICENSE,
  INDIVIDUAL_LICENSE,
  COMPANY_LINE,
  INDIVIDUAL_LINE,
  LICENSE_LINE,
} from '../licensing';
import { walletWccmConfig } from '../walletWccm';
import { defaultBrandConfig } from '../../module';

// Canonical values — the company NMLS and the individual NMLS must never be
// interchanged.
const CO_NMLS = '2817729';
const CO_DRE = '02440065';
const IND_NMLS = '2775380';
const IND_DRE = '01385024';

describe('licensing — exact canonical values', () => {
  it('company entity', () => {
    expect(COMPANY.legalName).toBe('West Coast Capital Mortgage Inc.');
    expect(COMPANY.dreType).toBe('Corporation License');
    expect(COMPANY.dre).toBe(CO_DRE);
    expect(COMPANY.nmls).toBe(CO_NMLS);
    expect(COMPANY_LICENSE).toBe('CA DRE Corporation License #02440065 · NMLS #2817729');
  });
  it('individual entity', () => {
    expect(INDIVIDUAL.name).toBe('Anatoliy Kanevsky');
    expect(INDIVIDUAL.title).toBe('California Real Estate Broker');
    expect(INDIVIDUAL.dreType).toBe('Broker License');
    expect(INDIVIDUAL.dre).toBe(IND_DRE);
    expect(INDIVIDUAL.nmls).toBe(IND_NMLS);
    expect(INDIVIDUAL_LICENSE).toBe('CA DRE Broker License #01385024 · NMLS #2775380');
  });
});

describe('licensing — numbers are never interchanged', () => {
  it('company and individual numbers are distinct', () => {
    expect(COMPANY.nmls).not.toBe(INDIVIDUAL.nmls);
    expect(COMPANY.dre).not.toBe(INDIVIDUAL.dre);
  });
  it('the company license carries only the company numbers', () => {
    expect(COMPANY_LICENSE).toContain(CO_DRE);
    expect(COMPANY_LICENSE).toContain(CO_NMLS);
    expect(COMPANY_LICENSE).not.toContain(IND_DRE);
    expect(COMPANY_LICENSE).not.toContain(IND_NMLS);
  });
  it('the individual license carries only the individual numbers', () => {
    expect(INDIVIDUAL_LICENSE).toContain(IND_DRE);
    expect(INDIVIDUAL_LICENSE).toContain(IND_NMLS);
    expect(INDIVIDUAL_LICENSE).not.toContain(CO_DRE);
    expect(INDIVIDUAL_LICENSE).not.toContain(CO_NMLS);
  });
  it('company block pairs the company name with the company NMLS', () => {
    expect(COMPANY_LINE).toContain('West Coast Capital Mortgage Inc.');
    expect(COMPANY_LINE).toContain(CO_NMLS);
    expect(COMPANY_LINE).not.toContain(IND_NMLS);
    expect(INDIVIDUAL_LINE).toContain('Anatoliy Kanevsky');
    expect(INDIVIDUAL_LINE).toContain(IND_NMLS);
    expect(INDIVIDUAL_LINE).not.toContain(CO_NMLS);
  });
});

/** Split a combined line at the broker's name; the company segment precedes it. */
function segments(line: string) {
  const i = line.indexOf('Anatoliy Kanevsky');
  expect(i).toBeGreaterThan(0);
  return { company: line.slice(0, i), individual: line.slice(i) };
}

describe('licensing — combined lines keep the grouping correct', () => {
  it('LICENSE_LINE lists the company (with 2817729) before the broker (with 2775380)', () => {
    const { company, individual } = segments(LICENSE_LINE);
    expect(company).toContain(CO_NMLS);
    expect(company).not.toContain(IND_NMLS);
    expect(individual).toContain(IND_NMLS);
    expect(individual).not.toContain(CO_NMLS);
  });
  it('the active site config (walletWccm) assigns numbers correctly', () => {
    const line = walletWccmConfig.nmlsLine!;
    const { company, individual } = segments(line);
    expect(company).toContain(CO_NMLS);
    expect(company).not.toContain(IND_NMLS);
    expect(individual).toContain(IND_NMLS);
    expect(individual).not.toContain(CO_NMLS);
  });
  it('the module fallback brand config assigns numbers correctly', () => {
    const line = defaultBrandConfig.nmlsLine!;
    const { company, individual } = segments(line);
    expect(company).toContain(CO_NMLS);
    expect(company).not.toContain(IND_NMLS);
    expect(individual).toContain(IND_NMLS);
    expect(individual).not.toContain(CO_NMLS);
  });
});
