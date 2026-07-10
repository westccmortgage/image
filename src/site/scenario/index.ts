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
  hasFullNumbers,
  hasValue,
  CONTACT_FIELDS,
  ADVISOR_STORAGE_KEYS,
  readInitialProfile,
  clearAdvisorState,
} from './profile';
export { buildCompactProfile } from './selectors';
export type { CompactProfile, CompactFact } from './selectors';
export { nextQuestions, nextBestQuestion } from './questionEngine';
export type { NextQuestionOptions } from './questionEngine';
export {
  classifyIntent,
  buildReply,
  matchChoiceValue,
  humanCaptured,
} from './converse';
export type { Intent, ReplyNumbers, ReplyInput } from './converse';
export { askAdvisor, advisorMode, buildProgramSummaries } from './advisor';
export type { AdvisorRequest, AdvisorResponse } from './advisor';
export { resolveLoanLimitArea } from './location';
export type { AreaResolution } from './location';
export { matchLoanPrograms, PLANNING_RATE } from './loanPrograms';
export {
  parseBorrowerScenario,
  generateNextQuestions,
  calculateLTV,
  calculateMonthlyPayment,
  calculateCashToClose,
  compareDownPaymentOptions,
  profileToEngineInput,
  prepareBrokerReviewSummary,
} from './tools';
export type { BrokerReviewSummary } from './tools';
export {
  matchLoanPaths,
  estimateCashToClose,
  strategyBullets,
} from './loanPaths';
export {
  DOCUMENT_CATEGORIES,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILES,
  MAX_FILE_BYTES,
  validateFile,
  validateSubmission,
  contactComplete,
  toSubmittedMetas,
  buildDocumentReviewPayload,
  submitDocumentReview,
  createDefaultDocumentReviewAdapter,
  defaultDocumentReviewAdapter,
} from './documentReview';
export type {
  DocumentCategory,
  FileMeta,
  FileValidation,
  PendingUpload,
  SubmittedDocMeta,
  ContactInfo,
  DocumentReviewPayload,
  DocumentReviewResult,
  DocumentReviewSubmissionAdapter,
  BuildDocumentReviewContext,
} from './documentReview';
export {
  deliverDocumentReview,
  buildBrokerNotification,
  resolveStoragePlan,
  createDevSimStorage,
} from './documentDelivery';
export type {
  UploadFile,
  StoredFileRef,
  StorageAdapter,
  Notifier,
  BrokerNotification,
  DeliveryInput,
  DeliveryResult,
  StoragePlan,
  StorageProviderName,
} from './documentDelivery';
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
