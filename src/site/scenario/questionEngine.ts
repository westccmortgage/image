import { FIELD_BY_KEY } from './fields';
import {
  missingContact,
  missingHelpful,
  missingRequired,
} from './profile';
import type { Question, ScenarioProfile } from './types';

export interface NextQuestionOptions {
  /** Only true once initial value is provided AND loan options were shown. */
  includeContact?: boolean;
  /** Max questions to return (spec: 1–3). */
  max?: number;
}

function toQuestion(key: ReturnType<typeof missingRequired>[number]): Question {
  const def = FIELD_BY_KEY[key];
  return { field: def.key, prompt: def.question, kind: def.kind, options: def.options };
}

/**
 * The question engine. Returns only the next 1–3 most important missing
 * questions, in priority order. Contact fields are NEVER returned unless
 * `includeContact` is set — so contact is not requested before value is given.
 */
export function nextQuestions(
  p: ScenarioProfile,
  opts: NextQuestionOptions = {},
): Question[] {
  const max = Math.max(1, Math.min(3, opts.max ?? 3));

  if (opts.includeContact) {
    return missingContact(p).slice(0, max).map(toQuestion);
  }

  // Required first, then helpful — never contact.
  const ordered = [...missingRequired(p), ...missingHelpful(p)];
  return ordered.slice(0, max).map(toQuestion);
}

/** The single next-best question (for the profile card "Next question"). */
export function nextBestQuestion(p: ScenarioProfile): Question | null {
  return nextQuestions(p, { max: 1 })[0] ?? null;
}
