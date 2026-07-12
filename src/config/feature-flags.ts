// ---------------------------------------------------------------------------
// WWCCM feature flags — minimal, safe rollback.
//
// Flags gate optional capabilities so a failing feature can be disabled in
// production without removing the whole site. NO secret values live here — a
// flag is a boolean only. Server-only concerns (whether GR CRM credentials are
// present) are enforced server-side; a flag never implies a secret is set.
//
// Honest degraded states are required:
//   • DOCUMENT_REVIEW disabled  → show a localized "unavailable" state.
//   • VOICE_INPUT disabled      → do NOT render a fake working microphone.
//   • GRCRM_DELIVERY disabled   → never show submission "success".
// ---------------------------------------------------------------------------

export interface FeatureFlags {
  AI_MORTGAGE_ADVISOR_V2_ENABLED: boolean;
  VOICE_INPUT_ENABLED: boolean;
  DOCUMENT_REVIEW_ENABLED: boolean;
  GRCRM_DELIVERY_ENABLED: boolean;
}

const DEFAULTS: FeatureFlags = {
  AI_MORTGAGE_ADVISOR_V2_ENABLED: true,
  VOICE_INPUT_ENABLED: true,
  DOCUMENT_REVIEW_ENABLED: true,
  GRCRM_DELIVERY_ENABLED: true,
};

/** Read a Vite public env flag ("false"/"0"/"off" → false); default when unset. */
function readFlag(key: keyof FeatureFlags, fallback: boolean): boolean {
  try {
    const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    const raw = env?.[`VITE_${key}`];
    if (raw == null || raw === '') return fallback;
    return !/^(false|0|off|no)$/i.test(raw.trim());
  } catch {
    return fallback;
  }
}

export const featureFlags: FeatureFlags = {
  AI_MORTGAGE_ADVISOR_V2_ENABLED: readFlag(
    'AI_MORTGAGE_ADVISOR_V2_ENABLED',
    DEFAULTS.AI_MORTGAGE_ADVISOR_V2_ENABLED,
  ),
  VOICE_INPUT_ENABLED: readFlag('VOICE_INPUT_ENABLED', DEFAULTS.VOICE_INPUT_ENABLED),
  DOCUMENT_REVIEW_ENABLED: readFlag('DOCUMENT_REVIEW_ENABLED', DEFAULTS.DOCUMENT_REVIEW_ENABLED),
  GRCRM_DELIVERY_ENABLED: readFlag('GRCRM_DELIVERY_ENABLED', DEFAULTS.GRCRM_DELIVERY_ENABLED),
};
