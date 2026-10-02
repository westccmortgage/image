export type CoreVoicePlan = {
  protocol: 'core-v2.voice-turn.1';
  requestId: string;
  sessionId: string;
  reply: string;
  stateRevision: number;
  disposition: 'answer' | 'clarify' | 'pause' | 'resume' | 'end' | 'human_handoff' | 'refuse';
  grounding: { grounded: boolean; [key: string]: unknown };
  applicationTransition: 'none' | 'offer' | 'continue' | 'stop';
  requiresHumanReview: boolean;
};

export function coreVoiceEnabled(environment?: Record<string, string | undefined>): boolean;
export function runCoreVoiceTurn(body: Record<string, unknown>, options?: {
  environment?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  nowSeconds?: number;
  nonce?: string;
}): Promise<CoreVoicePlan | null>;

export function sign(options: {
  secret: string;
  method: string;
  pathname: string;
  timestamp: number;
  nonce: string;
  rawBody: string;
}): Promise<string>;
