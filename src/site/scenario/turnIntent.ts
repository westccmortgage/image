import { parseScenario } from './parseScenario';
import { mergeProfile } from './profile';
import type { ScenarioProfile } from './types';

export type ScenarioTurnIntent = 'update' | 'correction' | 'question' | 'hypothetical';

export interface ScenarioTurnResolution {
  intent: ScenarioTurnIntent;
  /** Persistent scenario after this turn. */
  profile: ScenarioProfile;
  /** Temporary comparison scenario; never persisted for a hypothetical. */
  comparisonProfile: ScenarioProfile | null;
  patch: Partial<ScenarioProfile>;
}

export function classifyScenarioTurn(text: string): ScenarioTurnIntent {
  const t = text.trim().toLowerCase();
  if (/\b(what if|suppose|hypothetical(?:ly)?|compare (?:that|this|it) (?:to|with)|scenario where)\b|(?:^|\s)если\s|что\s+если/i.test(t)) {
    return 'hypothetical';
  }
  if (/\b(change|correct|update|replace|make (?:it|the)|set (?:it|the)|actually|instead)\b|исправ|измени|на самом деле/i.test(t)) {
    return 'correction';
  }
  if (/\?|^\s*(why|what|how|when|which|can|could|would|is|are|do|does|почему|сколько|как|можно|какой)\b/i.test(t)) {
    return 'question';
  }
  return 'update';
}

/**
 * Apply a conversational turn without letting questions or hypothetical
 * alternatives overwrite the borrower's base facts.
 */
export function resolveScenarioTurn(
  base: ScenarioProfile,
  text: string,
  focusedAnswer: Partial<ScenarioProfile> = {},
): ScenarioTurnResolution {
  const intent = classifyScenarioTurn(text);
  const parsed = parseScenario(text);
  const patch = intent === 'update' || intent === 'correction'
    ? { ...focusedAnswer, ...parsed }
    : parsed;
  if (intent === 'hypothetical') {
    return { intent, profile: base, comparisonProfile: mergeProfile(base, parsed), patch: parsed };
  }
  if (intent === 'question') {
    return { intent, profile: base, comparisonProfile: null, patch: parsed };
  }
  return { intent, profile: mergeProfile(base, patch), comparisonProfile: null, patch };
}
