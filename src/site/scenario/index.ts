export * from './types';
export * from './fields';
export { parseScenario } from './parseScenario';
export {
  mergeProfile,
  deriveScenario,
  missingRequired,
  missingHelpful,
  missingBlocking,
  missingContact,
  completionPercent,
  isReadyForOptions,
  hasProvidedValue,
  hasValue,
  CONTACT_FIELDS,
} from './profile';
export { nextQuestions, nextBestQuestion } from './questionEngine';
export type { NextQuestionOptions } from './questionEngine';
export {
  classifyIntent,
  buildReply,
  matchChoiceValue,
  humanCaptured,
} from './converse';
export type { Intent, ReplyNumbers, ReplyInput } from './converse';
export {
  matchLoanPaths,
  estimateCashToClose,
  strategyBullets,
} from './loanPaths';
export {
  buildLead,
  submitLead,
  postNetlifyForm,
  readUtm,
  defaultLeadAdapter,
  createDefaultAdapter,
  createLocalLogAdapter,
  createNetlifyFormsAdapter,
  encodeNetlifyForm,
  NETLIFY_FORM_NAME,
  createWebhookAdapter,
  createEmailAdapter,
  createTelegramAdapter,
  createCrmAdapter,
  createAriveAdapter,
  createGoogleSheetAdapter,
} from './leadAdapter';
export type {
  LeadSubmission,
  LeadSubmissionAdapter,
  LeadResult,
  BuildLeadContext,
} from './leadAdapter';
