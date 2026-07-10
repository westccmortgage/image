import { describe, it, expect } from 'vitest';
import {
  deliverDocumentReview,
  buildBrokerNotification,
  resolveStoragePlan,
  createDevSimStorage,
  submitDocumentReview,
  buildDocumentReviewPayload,
} from '../index';
import type {
  DeliveryInput,
  Notifier,
  StorageAdapter,
  StoredFileRef,
  UploadFile,
  DocumentReviewSubmissionAdapter,
  PendingUpload,
} from '../index';

const FILES: UploadFile[] = [
  { name: 'Loan Estimate.pdf', type: 'loan-estimate', size: 1200 },
  { name: 'Bank.pdf', type: 'bank-statement', size: 3400 },
];
const INPUT: DeliveryInput = {
  contact: { name: 'Jane Buyer', phone: '310-555-1212', email: 'jane@example.com', preferredContactTime: 'afternoons', preferredLanguage: 'en' },
  originalMessage: '$2M home, self-employed, $400k down',
  documents: FILES.map((f) => ({ name: f.name, type: f.type, size: f.size })),
  missingFields: ['Occupancy'],
  possibleLoanPaths: [{ name: 'Jumbo QM', fit: 'Possible fit' }],
  cashToCloseEstimate: { totalCashToClose: 449189 },
  profile: { purchasePrice: 2_000_000 },
  note: 'Please review my lender quote.',
  sourcePage: '/',
  timestamp: '2026-07-10T00:00:00.000Z',
  sessionId: 's_1',
};

function recordingStorage(calls: string[], fail = false): StorageAdapter {
  return {
    name: 'rec',
    async store(f, key) {
      if (fail) throw new Error('storage boom');
      calls.push(`store:${f.name}`);
      const ref: StoredFileRef = {
        name: f.name, type: f.type, size: f.size, storageKey: key,
        uploadedAt: '2026-07-10T00:00:00.000Z',
        link: `https://signed.example/${encodeURIComponent(key)}?sig=abc`,
        linkExpiresAt: '2026-07-17T00:00:00.000Z',
      };
      return ref;
    },
  };
}
function recordingNotifier(calls: string[], fail = false): Notifier {
  return {
    name: 'rec',
    async send() {
      if (fail) throw new Error('webhook 500');
      calls.push('notify');
    },
  };
}

// 1 + 3. storage happens before notify; success requires both --------------
describe('delivery order + success gating', () => {
  it('stores every file BEFORE notifying, and succeeds when both succeed', async () => {
    const calls: string[] = [];
    const res = await deliverDocumentReview({
      files: FILES, input: INPUT, storage: recordingStorage(calls), notify: recordingNotifier(calls),
    });
    expect(res.ok).toBe(true);
    expect(calls).toEqual(['store:Loan Estimate.pdf', 'store:Bank.pdf', 'notify']);
    expect(res.references).toHaveLength(2);
  });
});

// 2. broker payload includes secure references/links ------------------------
describe('broker notification carries secure references', () => {
  it('includes storage keys and signed/private links, not raw bytes', () => {
    const refs: StoredFileRef[] = [{
      name: 'Loan Estimate.pdf', type: 'loan-estimate', size: 1200,
      storageKey: 's_1/2026/0-Loan_Estimate.pdf', uploadedAt: 'now',
      link: 'https://signed.example/x?sig=abc', linkExpiresAt: '2026-07-17T00:00:00.000Z',
    }];
    const n = buildBrokerNotification(INPUT, refs);
    expect(n.title).toBe('New Document Review Request');
    expect(n.disclaimer).toContain('not as a completed mortgage application');
    expect(n.documents[0].storageKey).toBe('s_1/2026/0-Loan_Estimate.pdf');
    expect(n.documents[0].link).toContain('sig=');
    expect(n.fileNames).toEqual(['Loan Estimate.pdf']);
    expect(n.borrower.name).toBe('Jane Buyer');
    const blob = JSON.stringify(n).toLowerCase();
    for (const banned of ['base64', 'arraybuffer', '"bytes"']) expect(blob).not.toContain(banned);
  });
});

// 4. storage failure prevents notification + success ------------------------
describe('storage failure blocks delivery', () => {
  it('does not notify and reports a storage-stage failure', async () => {
    const calls: string[] = [];
    const res = await deliverDocumentReview({
      files: FILES, input: INPUT, storage: recordingStorage(calls, true), notify: recordingNotifier(calls),
    });
    expect(res.ok).toBe(false);
    expect(res.stage).toBe('storage');
    expect(calls).not.toContain('notify');
  });
});

// 5. webhook failure prevents success ---------------------------------------
describe('notification failure blocks success', () => {
  it('reports a notify-stage failure even though files were stored', async () => {
    const calls: string[] = [];
    const res = await deliverDocumentReview({
      files: FILES, input: INPUT, storage: recordingStorage(calls), notify: recordingNotifier(calls, true),
    });
    expect(res.ok).toBe(false);
    expect(res.stage).toBe('notify');
    expect(calls.filter((c) => c.startsWith('store:'))).toHaveLength(2);
  });
});

// Orphaned-file cleanup after a notify failure -------------------------------
describe('notify failure cleans up orphaned stored files', () => {
  function storageWithRemove(removed: string[], failRemoveKey?: string): StorageAdapter {
    return {
      name: 'rec',
      async store(f, key) {
        return { name: f.name, type: f.type, size: f.size, storageKey: key, uploadedAt: 'now', link: null };
      },
      async remove(key) {
        if (key === failRemoveKey) throw new Error('remove failed');
        removed.push(key);
      },
    };
  }
  it('removes every stored file and reports cleanedUp when the webhook fails', async () => {
    const removed: string[] = [];
    const res = await deliverDocumentReview({
      files: FILES, input: INPUT, storage: storageWithRemove(removed), notify: recordingNotifier([], true),
    });
    expect(res.ok).toBe(false);
    expect(res.stage).toBe('notify');
    expect(res.cleanedUp).toBe(true);
    expect(removed).toHaveLength(2);
    expect(res.orphanedKeys).toEqual([]);
  });
  it('reports orphaned keys when the adapter cannot delete', async () => {
    const storage: StorageAdapter = {
      name: 'no-remove',
      async store(f, key) { return { name: f.name, type: f.type, size: f.size, storageKey: key, uploadedAt: 'now', link: null }; },
      // no remove()
    };
    const res = await deliverDocumentReview({ files: FILES, input: INPUT, storage, notify: recordingNotifier([], true) });
    expect(res.cleanedUp).toBe(false);
    expect(res.orphanedKeys?.length).toBe(2);
  });
  it('lists the specific key that could not be removed', async () => {
    const removed: string[] = [];
    const res = await deliverDocumentReview({
      files: FILES, input: INPUT, storage: storageWithRemove(removed, `${INPUT.sessionId}/${INPUT.timestamp}/1-Bank.pdf`),
      notify: recordingNotifier([], true),
    });
    expect(res.cleanedUp).toBe(false);
    expect(res.orphanedKeys).toHaveLength(1);
    expect(res.orphanedKeys?.[0]).toContain('Bank.pdf');
  });
});

// 6. production never simulates success -------------------------------------
describe('storage plan resolution', () => {
  it('is not configured with no provider', () => {
    expect(resolveStoragePlan({}).configured).toBe(false);
  });
  it('refuses dev-sim in production (no fake success)', () => {
    const plan = resolveStoragePlan({ DOCUMENT_STORAGE_PROVIDER: 'dev-sim', CONTEXT: 'production' });
    expect(plan.configured).toBe(false);
    expect(plan.simulated).toBe(false);
    expect(plan.reason).toMatch(/refused in production/i);
  });
  it('allows a labeled dev-sim outside production', () => {
    const plan = resolveStoragePlan({ DOCUMENT_STORAGE_PROVIDER: 'dev-sim' });
    expect(plan.configured).toBe(true);
    expect(plan.simulated).toBe(true);
  });
  it('requires a real provider AND a webhook to be configured', () => {
    expect(resolveStoragePlan({ DOCUMENT_STORAGE_PROVIDER: 'netlify-blobs' }).configured).toBe(false);
    expect(resolveStoragePlan({ DOCUMENT_STORAGE_PROVIDER: 'netlify-blobs', DOCUMENT_REVIEW_WEBHOOK: 'https://hook' }).configured).toBe(true);
  });
});

// dev-sim storage is labeled and stores no real bytes -----------------------
describe('dev-sim storage', () => {
  it('is marked dev and returns a non-delivered reference', async () => {
    const s = createDevSimStorage(() => 'now');
    const ref = await s.store(FILES[0], 'k/0');
    expect(s.dev).toBe(true);
    expect(ref.link).toContain('devsim://not-delivered');
    const res = await deliverDocumentReview({ files: [FILES[0]], input: INPUT, storage: s, notify: recordingNotifier([]) });
    expect(res.dev).toBe(true);
  });
});

// 8 (client mapping). success message only appears on ok --------------------
describe('client shows success only when delivery returns ok', () => {
  function pu(name: string): PendingUpload {
    return { id: name, file: { name, size: 10 } as unknown as File, category: 'loan-estimate' };
  }
  const payload = buildDocumentReviewPayload({
    contact: { name: 'Jane', phone: '310-555-1212', email: 'j@x.com', preferredContactTime: '', preferredLanguage: 'en' },
    originalMessage: '', profile: {}, parsedScenario: {},
    possibleLoanPaths: [], cashToCloseEstimate: null, missingFields: [],
    files: [pu('a.pdf')], note: '', sourcePage: '/', sessionId: 's', now: () => 'now',
  });
  it('an ok adapter yields ok (borrower sees success)', async () => {
    const ok: DocumentReviewSubmissionAdapter = { name: 'ok', async submit() { return { ok: true, adapter: 'ok' }; } };
    expect((await submitDocumentReview(payload, [pu('a.pdf')], ok)).ok).toBe(true);
  });
  it('a failing adapter yields ok:false (borrower never sees success)', async () => {
    const bad: DocumentReviewSubmissionAdapter = { name: 'bad', async submit() { return { ok: false, error: 'storage_failed', adapter: 'bad' }; } };
    expect((await submitDocumentReview(payload, [pu('a.pdf')], bad)).ok).toBe(false);
  });
});
