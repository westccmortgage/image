import type { Language, ScenarioProfile } from './types';

// ---------------------------------------------------------------------------
// Document Review Flow.
//
// When a borrower uploads documents they are submitted for LICENSED BROKER
// REVIEW — never treated as ordinary chat attachments, and never persisted as
// file bytes in the browser. This module holds the types, validation, payload
// builder, and a pluggable documentReviewSubmissionAdapter (separate from the
// lead adapter). Files stay in memory until submission; only lightweight
// metadata is retained afterwards.
// ---------------------------------------------------------------------------

export type DocumentCategory =
  | 'loan-estimate'
  | 'bank-statement'
  | 'paystub-w2-1099'
  | 'tax-return-pl'
  | 'purchase-contract'
  | 'mortgage-statement'
  | 'insurance-quote'
  | 'title-escrow-estimate'
  | 'other';

/** Category value → i18n key for its label. */
export const DOCUMENT_CATEGORIES: { value: DocumentCategory; labelKey: string }[] = [
  { value: 'loan-estimate', labelKey: 'catLoanEstimate' },
  { value: 'bank-statement', labelKey: 'catBankStatement' },
  { value: 'paystub-w2-1099', labelKey: 'catPaystub' },
  { value: 'tax-return-pl', labelKey: 'catTaxReturn' },
  { value: 'purchase-contract', labelKey: 'catPurchaseContract' },
  { value: 'mortgage-statement', labelKey: 'catMortgageStatement' },
  { value: 'insurance-quote', labelKey: 'catInsuranceQuote' },
  { value: 'title-escrow-estimate', labelKey: 'catTitleEscrow' },
  { value: 'other', labelKey: 'catOther' },
];

// ---- file limits / validation ---------------------------------------------
export const ALLOWED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'heic'];
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/heic',
  'image/heif',
];
export const MAX_FILES = 10;
export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB

export interface FileMeta {
  name: string;
  size: number;
  type?: string;
}

export type ValidationCode = 'type' | 'size' | 'empty';

export interface FileValidation {
  ok: boolean;
  code?: ValidationCode;
  /** i18n key for the error message. */
  messageKey?: string;
}

function extensionOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

/** Validate a single file's type and size. Never silently passes bad input. */
export function validateFile(f: FileMeta): FileValidation {
  if (!f || !f.name) return { ok: false, code: 'empty', messageKey: 'docValidationType' };
  if (f.size <= 0) return { ok: false, code: 'empty', messageKey: 'docValidationEmpty' };
  const ext = extensionOf(f.name);
  const extOk = ALLOWED_EXTENSIONS.includes(ext);
  const mimeOk = !f.type || ALLOWED_MIME_TYPES.includes(f.type);
  if (!extOk || !mimeOk) return { ok: false, code: 'type', messageKey: 'docValidationType' };
  if (f.size > MAX_FILE_BYTES) return { ok: false, code: 'size', messageKey: 'docValidationSize' };
  return { ok: true };
}

// ---- pending uploads (in-memory only) -------------------------------------
export interface PendingUpload {
  id: string;
  file: File;
  category: DocumentCategory | '';
}

/** Lightweight, submitted metadata retained in the chat event (no bytes). */
export interface SubmittedDocMeta {
  name: string;
  category: DocumentCategory | '';
  size: number;
}

export function toSubmittedMetas(files: PendingUpload[]): SubmittedDocMeta[] {
  return files.map((f) => ({ name: f.file.name, category: f.category, size: f.file.size }));
}

export interface SubmissionCheck {
  ok: boolean;
  /** i18n key for the blocking error, if any. */
  errorKey?: string;
}

/** Are the selected files ready to submit (present + each typed)? */
export function validateSubmission(files: PendingUpload[]): SubmissionCheck {
  if (files.length === 0) return { ok: false, errorKey: 'docValidationNone' };
  if (files.length > MAX_FILES) return { ok: false, errorKey: 'docValidationMax' };
  if (files.some((f) => !f.category)) return { ok: false, errorKey: 'docTypeMissing' };
  return { ok: true };
}

// ---- contact ---------------------------------------------------------------
export interface ContactInfo {
  name: string;
  phone: string;
  email: string;
  preferredContactTime: string;
  preferredLanguage: Language;
}

/** Contact is complete enough to submit (name + phone or email). */
export function contactComplete(c: Partial<ContactInfo>): boolean {
  return !!(c.name && (c.phone || c.email));
}

// ---- structured payload ----------------------------------------------------
export interface DocumentReviewPayload {
  kind: 'document-review';
  contact: ContactInfo;
  preferredLanguage: Language;
  originalMessage: string;
  profile: ScenarioProfile;
  parsedScenario: ScenarioProfile;
  possibleLoanPaths: { name: string; fit: string }[];
  cashToCloseEstimate: {
    hasBoth: boolean;
    totalCashToClose: number;
    additionalFundsNeeded: number;
    downPayment: number;
    ltv: number;
    loanType: string;
  } | null;
  advisorSummary?: string[];
  missingFields: string[];
  documents: { name: string; type: DocumentCategory | ''; size: number }[];
  note: string;
  sourcePage: string;
  utm: Record<string, string>;
  timestamp: string;
  sessionId: string;
}

export interface BuildDocumentReviewContext {
  contact: ContactInfo;
  originalMessage: string;
  profile: ScenarioProfile;
  parsedScenario: ScenarioProfile;
  possibleLoanPaths: { name: string; fit: string }[];
  cashToCloseEstimate: DocumentReviewPayload['cashToCloseEstimate'];
  advisorSummary?: string[];
  missingFields: string[];
  files: PendingUpload[];
  note: string;
  sourcePage: string;
  utm?: Record<string, string>;
  sessionId: string;
  now?: () => string;
}

export function buildDocumentReviewPayload(ctx: BuildDocumentReviewContext): DocumentReviewPayload {
  const now = ctx.now ?? (() => new Date().toISOString());
  return {
    kind: 'document-review',
    contact: ctx.contact,
    preferredLanguage: ctx.contact.preferredLanguage,
    originalMessage: ctx.originalMessage,
    profile: ctx.profile,
    parsedScenario: ctx.parsedScenario,
    possibleLoanPaths: ctx.possibleLoanPaths,
    cashToCloseEstimate: ctx.cashToCloseEstimate,
    advisorSummary: ctx.advisorSummary,
    missingFields: ctx.missingFields,
    documents: ctx.files.map((f) => ({ name: f.file.name, type: f.category, size: f.file.size })),
    note: ctx.note,
    sourcePage: ctx.sourcePage,
    utm: ctx.utm ?? {},
    timestamp: now(),
    sessionId: ctx.sessionId,
  };
}

// ---- adapter ---------------------------------------------------------------
export interface DocumentReviewResult {
  ok: boolean;
  id?: string;
  error?: string;
  adapter: string;
  /** True when accepted only by the labeled local development adapter. */
  dev?: boolean;
}

/** Implement this to route document reviews to a real backend + file storage. */
export interface DocumentReviewSubmissionAdapter {
  name: string;
  submit(payload: DocumentReviewPayload, files: PendingUpload[]): Promise<DocumentReviewResult>;
}

const ENDPOINT = '/api/document-review';

function isDevHost(): boolean {
  if (typeof window === 'undefined' || !window.location) return true;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local') || h === '';
}

/**
 * Default adapter: POST the files (multipart) + structured payload to the
 * Netlify function. If the backend is NOT configured for real file delivery
 * (501) or unreachable, we do NOT pretend the documents were sent:
 *   • in local/dev → a clearly labeled development-mode success (files logged);
 *   • in production → a real configuration error the user + developer can see.
 */
export function createDefaultDocumentReviewAdapter(): DocumentReviewSubmissionAdapter {
  return {
    name: 'netlify-fn',
    async submit(payload, files) {
      if (typeof fetch === 'undefined') return notConfigured(payload, files);
      try {
        const fd = new FormData();
        fd.append('payload', JSON.stringify(payload));
        files.forEach((pu, i) => fd.append(`file_${i}`, pu.file, pu.file.name));
        const res = await fetch(ENDPOINT, { method: 'POST', body: fd });
        // 501 = function present but no delivery target; 404 = function not
        // deployed at all. Both mean "not configured for real file delivery".
        if (res.status === 501 || res.status === 404) return notConfigured(payload, files);
        if (!res.ok) return { ok: false, adapter: 'netlify-fn', error: `HTTP ${res.status}` };
        // Success is authoritative: the function only returns 200 after the
        // files were stored AND the broker notification was sent. `dev` is set
        // when the server used a labeled development simulation.
        const data = (await res.json().catch(() => ({}))) as { id?: string; dev?: boolean };
        return { ok: true, id: data.id, adapter: 'netlify-fn', dev: !!data.dev };
      } catch (e) {
        return notConfigured(payload, files, String(e));
      }
    },
  };
}

function notConfigured(
  payload: DocumentReviewPayload,
  files: PendingUpload[],
  err?: string,
): DocumentReviewResult {
  if (isDevHost()) {
    try {
      // Development mode only — nothing is actually delivered. Labeled as such.
      console.info('[documentReview:DEV] would submit for broker review', {
        contact: payload.contact,
        documents: payload.documents,
        files: files.map((f) => f.file.name),
      });
    } catch {
      /* ignore */
    }
    return { ok: true, adapter: 'dev-mode', dev: true, id: `dev_${payload.documents.length}` };
  }
  return { ok: false, adapter: 'netlify-fn', error: err ?? 'not_configured' };
}

export const defaultDocumentReviewAdapter: DocumentReviewSubmissionAdapter =
  createDefaultDocumentReviewAdapter();

export async function submitDocumentReview(
  payload: DocumentReviewPayload,
  files: PendingUpload[],
  adapter: DocumentReviewSubmissionAdapter = defaultDocumentReviewAdapter,
): Promise<DocumentReviewResult> {
  return adapter.submit(payload, files);
}
