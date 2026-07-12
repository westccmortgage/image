import { describe, it, expect } from 'vitest';
import {
  companyFacts,
  COMPANY_LICENSE,
  INDIVIDUAL_LICENSE,
  LICENSE_LINE,
  LICENSING_BLOCK,
} from '../company-facts';
import { COMPANY, INDIVIDUAL } from '../../site/licensing';

// Canonical values — company and individual numbers must never be interchanged.
const CO_NMLS = '2817729';
const CO_DRE = '02440065';
const IND_NMLS = '2775380';
const IND_DRE = '01385024';

describe('company-facts — exact owner-approved values', () => {
  it('project + product identity', () => {
    expect(companyFacts.projectId).toBe('wwccm');
    expect(companyFacts.productName).toBe('AI Mortgage Strategy Advisor');
  });
  it('company (corporation) entity', () => {
    expect(companyFacts.companyLegalName).toBe('West Coast Capital Mortgage Inc.');
    expect(companyFacts.companyDreType).toBe('Corporation License');
    expect(companyFacts.companyDreCorporationLicense).toBe(CO_DRE);
    expect(companyFacts.companyNmls).toBe(CO_NMLS);
  });
  it('individual broker entity', () => {
    expect(companyFacts.licensedBrokerName).toBe('Anatoliy Kanevsky');
    expect(companyFacts.licensedBrokerTitle).toBe('California Real Estate Broker');
    expect(companyFacts.licensedBrokerDreType).toBe('Broker License');
    expect(companyFacts.licensedBrokerDreLicense).toBe(IND_DRE);
    expect(companyFacts.licensedBrokerNmls).toBe(IND_NMLS);
  });
  it('owner-approved professional history', () => {
    expect(companyFacts.mortgageCareerStartYear).toBe(2004);
    expect(companyFacts.brokerLicenseYear).toBe(2009);
  });
  it('licensing scope is explicit owner configuration (CA confirmed)', () => {
    expect(companyFacts.supportedStates).toContain('CA');
    expect(companyFacts.licensingByState.CA.verified).toBe(true);
  });
});

describe('company-facts — numbers are never interchanged', () => {
  it('formatted lines pair the right numbers with the right entity', () => {
    expect(COMPANY_LICENSE).toContain(CO_DRE);
    expect(COMPANY_LICENSE).toContain(CO_NMLS);
    expect(COMPANY_LICENSE).not.toContain(IND_DRE);
    expect(COMPANY_LICENSE).not.toContain(IND_NMLS);
    expect(COMPANY_LICENSE).toContain('Corporation License');

    expect(INDIVIDUAL_LICENSE).toContain(IND_DRE);
    expect(INDIVIDUAL_LICENSE).toContain(IND_NMLS);
    expect(INDIVIDUAL_LICENSE).not.toContain(CO_DRE);
    expect(INDIVIDUAL_LICENSE).not.toContain(CO_NMLS);
    expect(INDIVIDUAL_LICENSE).toContain('Broker License');
  });
  it('the combined line lists the company (2817729) before the broker (2775380)', () => {
    const i = LICENSE_LINE.indexOf('Anatoliy Kanevsky');
    expect(i).toBeGreaterThan(0);
    const company = LICENSE_LINE.slice(0, i);
    const individual = LICENSE_LINE.slice(i);
    expect(company).toContain(CO_NMLS);
    expect(company).not.toContain(IND_NMLS);
    expect(individual).toContain(IND_NMLS);
    expect(individual).not.toContain(CO_NMLS);
  });
  it('the trust block never labels the broker license a corporation license', () => {
    const brokerIdx = LICENSING_BLOCK.indexOf('Anatoliy Kanevsky');
    const brokerSection = LICENSING_BLOCK.slice(brokerIdx);
    expect(brokerSection).not.toContain('Corporation License');
    expect(brokerSection).toContain('Broker License');
  });
});

describe('company-facts — legacy licensing re-export stays consistent', () => {
  it('COMPANY / INDIVIDUAL objects mirror the source of truth', () => {
    expect(COMPANY.nmls).toBe(CO_NMLS);
    expect(COMPANY.dre).toBe(CO_DRE);
    expect(INDIVIDUAL.nmls).toBe(IND_NMLS);
    expect(INDIVIDUAL.dre).toBe(IND_DRE);
    expect(COMPANY.nmls).not.toBe(INDIVIDUAL.nmls);
  });
});
