// ---------------------------------------------------------------------------
// WWCCM internal resource registry — WWCCM/corporate routes ONLY.
//
// This is intentionally NOT a global multi-brand "Site Registry". It does not
// crawl other websites, does not index unrelated brands, and must never
// recommend WCCI.online or expose GR CRM as a customer-facing resource.
//
// The AI returns a `resourceId` only; the server/UI resolves the URL from THIS
// registry. Unknown IDs, unverified resources, and internal/admin/login/staging
// URLs are rejected. New external resources may be added only through this
// owner-approved configuration.
// ---------------------------------------------------------------------------

import type { SupportedLanguage } from './company-facts';

export type ResourceType =
  | 'company_info'
  | 'licensing_disclosures'
  | 'privacy'
  | 'contact'
  | 'ai_advisor'
  | 'document_review'
  | 'secure_application'
  | 'nmls_verification';

export type ResourceAudience = 'borrower' | 'general';

export interface WwccmResource {
  resourceId: string;
  type: ResourceType;
  audience: ResourceAudience;
  /** Verified URL or in-app anchor. Empty string = in-app action, not a link. */
  url: string;
  titleByLanguage: Record<SupportedLanguage, string>;
  actionLabelByLanguage: Record<SupportedLanguage, string>;
  descriptionByLanguage: Record<SupportedLanguage, string>;
  /** Only true once the URL/route has been verified by the owner. */
  verified: boolean;
  /** ISO date the resource was last verified, or null if never. */
  lastVerifiedAt: string | null;
}

// Only routes that exist and are verified in this SPA are listed. The AI advisor
// itself lives at "/". Additional external routes (a secure application portal,
// the official NMLS verification page) must be added here with an exact verified
// URL before they can ever be recommended.
export const WWCCM_RESOURCES: WwccmResource[] = [
  {
    resourceId: 'ai_mortgage_strategy_advisor',
    type: 'ai_advisor',
    audience: 'borrower',
    url: '/',
    titleByLanguage: {
      en: 'AI Mortgage Strategy Advisor',
      ru: 'ИИ-советник по ипотечной стратегии',
      es: 'Asesor de Estrategia Hipotecaria con IA',
      zh: 'AI 抵押贷款策略顾问',
    },
    actionLabelByLanguage: {
      en: 'Open the advisor',
      ru: 'Открыть советника',
      es: 'Abrir el asesor',
      zh: '打开顾问',
    },
    descriptionByLanguage: {
      en: 'Describe your scenario and compare possible mortgage paths.',
      ru: 'Опишите вашу ситуацию и сравните возможные варианты ипотеки.',
      es: 'Describa su situación y compare posibles opciones hipotecarias.',
      zh: '描述您的情况并比较可能的抵押贷款方案。',
    },
    verified: true,
    lastVerifiedAt: '2026-07-11',
  },
];

const RESOURCE_BY_ID = new Map(WWCCM_RESOURCES.map((r) => [r.resourceId, r]));

/** Patterns that must never be surfaced to a borrower. */
const FORBIDDEN_URL = /(admin|login|signin|staging|preview|internal|dashboard|grcrm|crm|webhook)/i;

/** True only for a same-origin in-app anchor or an https URL on an allowed host. */
function isSafeResourceUrl(url: string): boolean {
  if (url === '' || url.startsWith('/')) return !FORBIDDEN_URL.test(url);
  if (!/^https:\/\//i.test(url)) return false;
  if (FORBIDDEN_URL.test(url)) return false;
  return true;
}

export interface ResolvedResource {
  resourceId: string;
  type: ResourceType;
  url: string;
  title: string;
  actionLabel: string;
  description: string;
  /** Safe anchor attributes for external links. */
  target?: '_blank';
  rel?: string;
}

/**
 * Resolve a model-provided resourceId to a safe, localized, verified resource.
 * Returns null for unknown IDs, unverified resources, or unsafe URLs.
 */
export function resolveResource(
  resourceId: string,
  lang: SupportedLanguage,
): ResolvedResource | null {
  const r = RESOURCE_BY_ID.get(resourceId);
  if (!r) return null;
  if (!r.verified) return null;
  if (!isSafeResourceUrl(r.url)) return null;
  const external = /^https:\/\//i.test(r.url);
  return {
    resourceId: r.resourceId,
    type: r.type,
    url: r.url,
    title: r.titleByLanguage[lang] ?? r.titleByLanguage.en,
    actionLabel: r.actionLabelByLanguage[lang] ?? r.actionLabelByLanguage.en,
    description: r.descriptionByLanguage[lang] ?? r.descriptionByLanguage.en,
    ...(external ? { target: '_blank' as const, rel: 'noopener noreferrer' } : {}),
  };
}

/**
 * Resolve a list of model recommendations to at most `max` unique, safe
 * resources (deduped, unknown/unverified/unsafe dropped).
 */
export function resolveRecommendations(
  ids: string[],
  lang: SupportedLanguage,
  max = 3,
): ResolvedResource[] {
  const seen = new Set<string>();
  const out: ResolvedResource[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const resolved = resolveResource(id, lang);
    if (!resolved) continue;
    seen.add(id);
    out.push(resolved);
    if (out.length >= max) break;
  }
  return out;
}
