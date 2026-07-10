import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs'; // typed via src/test-shims.d.ts
import {
  validateFile,
  validateSubmission,
  contactComplete,
  toSubmittedMetas,
  buildDocumentReviewPayload,
  submitDocumentReview,
  defaultDocumentReviewAdapter,
  DOCUMENT_CATEGORIES,
  MAX_FILES,
  MAX_FILE_BYTES,
} from '../index';
import type {
  ContactInfo,
  DocumentReviewPayload,
  DocumentReviewResult,
  DocumentReviewSubmissionAdapter,
  PendingUpload,
} from '../index';
import { t } from '../../i18n';

// A fake pending upload — buildPayload/adapters only read file.name + file.size,
// so we never need a real File object (and never touch file bytes).
function pu(name: string, size: number, category = 'loan-estimate'): PendingUpload {
  return { id: name, file: { name, size } as unknown as File, category: category as PendingUpload['category'] };
}
const CONTACT: ContactInfo = {
  name: 'Jane Buyer', phone: '310-555-1212', email: 'jane@example.com',
  preferredContactTime: 'weekday afternoons', preferredLanguage: 'en',
};

// A. Paperclip opens the document review flow -------------------------------
describe('A. paperclip opens "Upload Documents for Broker Review"', () => {
  it('the flow entry title is broker-review framed, not an application', () => {
    expect(t('en', 'docModalTitle')).toBe('Upload Documents for Broker Review');
    const title = t('en', 'docModalTitle').toLowerCase();
    expect(title).not.toContain('application');
    expect(t('en', 'docUploadCta')).toBe('Upload for Broker Review');
  });
});

// B. File validation ---------------------------------------------------------
describe('B. file validation', () => {
  it('rejects an unsupported file type', () => {
    const v = validateFile({ name: 'notes.docx', size: 1000, type: 'application/msword' });
    expect(v.ok).toBe(false);
    expect(v.code).toBe('type');
  });
  it('rejects an oversize file', () => {
    const v = validateFile({ name: 'huge.pdf', size: MAX_FILE_BYTES + 1 });
    expect(v.ok).toBe(false);
    expect(v.code).toBe('size');
  });
  it('accepts a valid PDF and a valid image', () => {
    expect(validateFile({ name: 'Loan Estimate.pdf', size: 5000, type: 'application/pdf' }).ok).toBe(true);
    expect(validateFile({ name: 'paystub.JPG', size: 5000, type: 'image/jpeg' }).ok).toBe(true);
    expect(validateFile({ name: 'scan.heic', size: 5000 }).ok).toBe(true);
  });
});

// C. Document type selection -------------------------------------------------
describe('C. document type per file', () => {
  it('flags a missing document type', () => {
    const check = validateSubmission([pu('a.pdf', 1000, '')]);
    expect(check.ok).toBe(false);
    expect(check.errorKey).toBe('docTypeMissing');
  });
  it('accepts when each file has a type', () => {
    expect(validateSubmission([pu('a.pdf', 1000, 'bank-statement')]).ok).toBe(true);
  });
  it('rejects empty submission and over-limit submission', () => {
    expect(validateSubmission([]).errorKey).toBe('docValidationNone');
    const many = Array.from({ length: MAX_FILES + 1 }, (_, i) => pu(`f${i}.pdf`, 10));
    expect(validateSubmission(many).errorKey).toBe('docValidationMax');
  });
});

// D. Contact requirement -----------------------------------------------------
describe('D. contact required before submission', () => {
  it('incomplete contact is not allowed to submit', () => {
    expect(contactComplete({})).toBe(false);
    expect(contactComplete({ name: 'Jane' })).toBe(false);
  });
  it('name + phone (or email) is complete', () => {
    expect(contactComplete({ name: 'Jane', phone: '310-555-1212' })).toBe(true);
    expect(contactComplete({ name: 'Jane', email: 'j@x.com' })).toBe(true);
  });
});

// E. Successful submission calls the adapter with a structured payload -------
describe('E. successful submission → adapter receives structured payload', () => {
  it('passes contact, scenario, paths, cash-to-close, files, timestamp, source', async () => {
    let captured: { p: DocumentReviewPayload; files: PendingUpload[] } | null = null;
    const mock: DocumentReviewSubmissionAdapter = {
      name: 'mock',
      async submit(p, files) { captured = { p, files }; return { ok: true, id: 'x', adapter: 'mock' }; },
    };
    const files = [pu('Loan Estimate.pdf', 12345, 'loan-estimate'), pu('Bank.pdf', 6789, 'bank-statement')];
    const payload = buildDocumentReviewPayload({
      contact: CONTACT,
      originalMessage: '$2M home, self-employed, $400k down',
      profile: { purchasePrice: 2_000_000, downPayment: 400_000, name: 'Jane Buyer' },
      parsedScenario: { purchasePrice: 2_000_000 },
      possibleLoanPaths: [{ name: 'Jumbo QM', fit: 'Possible fit' }],
      cashToCloseEstimate: { hasBoth: true, totalCashToClose: 449189, additionalFundsNeeded: 49189, downPayment: 400000, ltv: 80, loanType: 'Jumbo' },
      missingFields: ['Occupancy'],
      files,
      note: 'Please review my lender quote.',
      sourcePage: '/',
      utm: { utm_source: 'ig' },
      sessionId: 's_1',
      now: () => '2026-07-10T00:00:00.000Z',
    });
    const res = await submitDocumentReview(payload, files, mock);
    expect(res.ok).toBe(true);
    expect(captured).not.toBeNull();
    const p = captured!.p;
    expect(p.kind).toBe('document-review');
    expect(p.contact.name).toBe('Jane Buyer');
    expect(p.preferredLanguage).toBe('en');
    expect(p.possibleLoanPaths[0].name).toBe('Jumbo QM');
    expect(p.cashToCloseEstimate?.totalCashToClose).toBe(449189);
    expect(p.documents).toEqual([
      { name: 'Loan Estimate.pdf', type: 'loan-estimate', size: 12345 },
      { name: 'Bank.pdf', type: 'bank-statement', size: 6789 },
    ]);
    expect(p.note).toBe('Please review my lender quote.');
    expect(p.sourcePage).toBe('/');
    expect(p.timestamp).toBe('2026-07-10T00:00:00.000Z');
    expect(p.sessionId).toBe('s_1');
  });
});

// F. Chat confirmation copy + submitted metadata ----------------------------
describe('F. chat confirmation shows a broker-review event', () => {
  it('success message tells the borrower documents went for broker review', () => {
    const msg = t('en', 'docSuccess');
    expect(msg).toContain('Documents received');
    expect(msg.toLowerCase()).toContain('broker review');
    expect(msg).toContain('West Coast Capital Mortgage');
  });
  it('submitted metadata is a broker-review event, not raw attachments (name/type/size only)', () => {
    const metas = toSubmittedMetas([pu('Loan Estimate.pdf', 12345, 'loan-estimate')]);
    expect(metas).toEqual([{ name: 'Loan Estimate.pdf', category: 'loan-estimate', size: 12345 }]);
    expect(t('en', 'docSubmittedStatus')).toBe('Submitted for broker review');
  });
});

// G. Failure behavior --------------------------------------------------------
describe('G. failed submission does not report success', () => {
  it('a failing adapter returns ok:false and a failure message exists', async () => {
    const failing: DocumentReviewSubmissionAdapter = {
      name: 'fail', async submit() { return { ok: false, error: 'not_configured', adapter: 'fail' }; },
    };
    const payload = buildDocumentReviewPayload({
      contact: CONTACT, originalMessage: '', profile: {}, parsedScenario: {},
      possibleLoanPaths: [], cashToCloseEstimate: null, missingFields: [],
      files: [pu('a.pdf', 10)], note: '', sourcePage: '/', sessionId: 's', now: () => 'now',
    });
    const res: DocumentReviewResult = await submitDocumentReview(payload, [pu('a.pdf', 10)], failing);
    expect(res.ok).toBe(false);
    expect(t('en', 'docFailure').length).toBeGreaterThan(0);
  });
  it('the default adapter uses a clearly-labeled dev mode when the backend is unreachable', async () => {
    const payload = buildDocumentReviewPayload({
      contact: CONTACT, originalMessage: '', profile: {}, parsedScenario: {},
      possibleLoanPaths: [], cashToCloseEstimate: null, missingFields: [],
      files: [pu('a.pdf', 10)], note: '', sourcePage: '/', sessionId: 's', now: () => 'now',
    });
    const res = await submitDocumentReview(payload, [pu('a.pdf', 10)], defaultDocumentReviewAdapter);
    // In the test (no browser/backend) the honest fallback is labeled dev-mode.
    expect(res.dev).toBe(true);
    expect(res.adapter).toBe('dev-mode');
  });
});

// H + I. Storage safety ------------------------------------------------------
describe('H+I. files are never persisted to storage', () => {
  it('no file bytes/content in the retained metadata or payload documents', () => {
    const metas = toSubmittedMetas([pu('a.pdf', 999)]);
    const blob = JSON.stringify(metas).toLowerCase();
    for (const banned of ['base64', 'content', 'data:', 'arraybuffer', 'blob']) {
      expect(blob).not.toContain(banned);
    }
  });
  it('submitting never calls storage.setItem', async () => {
    const calls: string[] = [];
    const mk = () => ({
      getItem: () => null,
      setItem: (k: string) => calls.push(k),
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    }) as unknown as Storage;
    (globalThis as unknown as { window: unknown }).window = { localStorage: mk(), sessionStorage: mk() };
    const mock: DocumentReviewSubmissionAdapter = { name: 'mock', async submit() { return { ok: true, adapter: 'mock' }; } };
    const files = [pu('a.pdf', 10)];
    const payload = buildDocumentReviewPayload({
      contact: CONTACT, originalMessage: '', profile: {}, parsedScenario: {},
      possibleLoanPaths: [], cashToCloseEstimate: null, missingFields: [],
      files, note: '', sourcePage: '/', sessionId: 's', now: () => 'now',
    });
    await submitDocumentReview(payload, files, mock);
    expect(calls).toHaveLength(0);
    delete (globalThis as unknown as { window?: unknown }).window;
  });
});

// J. Mobile layout (structural) ---------------------------------------------
describe('J. upload modal is a mobile bottom sheet with a reachable submit', () => {
  const css = readFileSync('src/index.css', 'utf8');
  it('has a sticky action foot and a mobile bottom-sheet rule', () => {
    expect(css).toContain('.sm-docmodal-foot');
    expect(css).toContain('.sm-docmodal { width: 100%; max-height: 94vh; border-radius: 18px 18px 0 0; }');
  });
  it('the page shell prevents horizontal overflow', () => {
    expect(css).toContain('overflow-x: hidden');
  });
});

// K. i18n --------------------------------------------------------------------
describe('K. multilingual document-review copy', () => {
  it('Russian success message matches the prescribed wording', () => {
    const ru = t('ru', 'docSuccess');
    expect(ru).toContain('Документы получены');
    expect(ru).toContain('West Coast Capital Mortgage');
  });
  it('Chinese upload labels exist', () => {
    expect(t('zh', 'docModalTitle')).toBe('上传文件供经纪人审阅');
    for (const c of DOCUMENT_CATEGORIES) expect(t('zh', c.labelKey as Parameters<typeof t>[1])).toBeTruthy();
  });
  it('language selection changes the modal copy', () => {
    expect(t('ru', 'docModalTitle')).not.toBe(t('en', 'docModalTitle'));
    expect(t('es', 'docUploadCta')).not.toBe(t('en', 'docUploadCta'));
  });
});
