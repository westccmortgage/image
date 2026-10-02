export function phraseWithAI(args: {
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  model?: string;
  maxTokens?: number;
}): Promise<string>;

export function isAiConfigured(): boolean;
export function aiProvider(): string;
export function defaultModel(): string;
export function aiBackendLabel(): string;
