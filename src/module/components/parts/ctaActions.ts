import type { BrandConfig } from '../../brand';

export interface CtaAction {
  id: string;
  label: string;
  variant: 'primary' | 'gold' | 'ghost';
  href?: string;
  onClick?: () => void;
}

/**
 * The full CTA set from the module spec. Sites can override targets via the
 * brand config; unknown actions fall back to smooth-scroll anchors.
 */
export function buildCtas(config: BrandConfig): CtaAction[] {
  const actions: CtaAction[] = [
    { id: 'review', label: 'Review My Cash to Close', variant: 'primary', href: '#breakdown' },
    { id: 'compare', label: 'Compare Down Payment Options', variant: 'ghost', href: '#scenarios' },
    { id: 'seller', label: 'Estimate Seller Credit Needed', variant: 'ghost', href: '#credits' },
    { id: 'broker', label: config.contactCTA.label, variant: 'gold', href: config.contactCTA.href },
  ];
  if (config.showApplyButton) {
    actions.push({
      id: 'apply',
      label: 'Start Application',
      variant: 'primary',
      href: config.applyHref,
    });
  }
  return actions;
}
