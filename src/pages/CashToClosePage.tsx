import { CashToCloseAdvisor } from '../module';
import type { BrandConfig } from '../module';

// Example per-site branding. Each host site would pass its own config.
const wccmConfig: Partial<BrandConfig> = {
  brandName: 'West Coast Capital Mortgage',
  altLabel: 'Real Cash to Close Strategy Tool',
  stateFocus: 'California',
  showApplyButton: true,
  showLeadForm: true,
  contactCTA: { label: 'Talk to a Mortgage Broker', href: 'tel:3106865053' },
  primaryCTA: { label: 'Review My Cash to Close', href: '#breakdown' },
  nmlsLine:
    'West Coast Capital Mortgage · Anatoliy Kanevsky · Broker 01385024 · NMLS ID 2775380 · (310) 686-5053',
};

/** Full-page route: /tools/cash-to-close */
export function CashToClosePage() {
  return <CashToCloseAdvisor config={wccmConfig} />;
}

export default CashToClosePage;
