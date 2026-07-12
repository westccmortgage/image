// ---------------------------------------------------------------------------
// Program / market-data honesty (Section 7).
//
// The advisor must NOT pretend to have live lender pricing or program
// availability unless a real verified source is connected. This module defines
// a provider-neutral data-source interface and reports the CURRENT status of
// program data. With no verified source wired in, every path is a configured
// planning assumption that requires broker verification.
// ---------------------------------------------------------------------------

import type { ProgramDataStatus } from './types';

export interface ConfiguredProgram {
  programId: string;
  /** Human name, e.g. "Conforming QM". */
  name: string;
  /** Optional configured note; never a live quote unless the source is verified. */
  note?: string;
}

export interface ProgramDataSource {
  sourceName: string;
  sourceType:
    | 'manual_verified_matrix'
    | 'lender_rate_sheet'
    | 'pricing_engine'
    | 'los_export'
    | 'broker_review';
  /** ISO date the matrix/rate sheet is effective, when applicable. */
  effectiveDate?: string;
  /** ISO date the source was last verified, when applicable. */
  lastVerifiedAt?: string;
  programs: ConfiguredProgram[];
}

/**
 * The currently connected verified program-data source, or null. There is no
 * live pricing/program feed wired in, so this is null and all paths fall back
 * to configured planning assumptions. When a real source is connected, set this
 * (or make it a lookup) and paths may become `verified_current` with a date.
 */
export const activeProgramDataSource: ProgramDataSource | null = null;

/** True only when a verified current program-data source is connected. */
export function hasVerifiedProgramData(): boolean {
  return activeProgramDataSource != null;
}

/**
 * The honesty status for a program path given whether its scenario still has
 * missing inputs. No verified source → configured assumption (or, when key
 * inputs are missing, broker review required). We never return
 * `verified_current` without an actual verified source.
 */
export function programDataStatusFor(hasMissingInputs: boolean): ProgramDataStatus {
  if (hasVerifiedProgramData()) return 'verified_current';
  return hasMissingInputs ? 'broker_review_required' : 'configured_assumption';
}

/** The effective/last-verified date to display, or null when no verified source. */
export function programEffectiveDate(): string | null {
  const s = activeProgramDataSource as ProgramDataSource | null;
  return s?.effectiveDate ?? s?.lastVerifiedAt ?? null;
}
