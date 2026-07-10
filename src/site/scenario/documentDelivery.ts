// ---------------------------------------------------------------------------
// Document delivery core (storage → broker notification).
//
// This is the pure, typed contract shared by the client and the Netlify
// function. The golden rule: a borrower only sees "Documents received" after
// the files are STORED securely AND the broker notification is SENT. If either
// step fails, delivery fails and no success is shown.
//
// The Netlify function mirrors this orchestration with real providers
// (Netlify Blobs / Supabase / S3). Nothing here touches the DOM or storage.
// ---------------------------------------------------------------------------

/** A file handed to the storage adapter. `bytes` is optional in tests. */
export interface UploadFile {
  name: string;
  /** Document category (e.g. "bank-statement"). */
  type: string;
  size: number;
  bytes?: Uint8Array;
}

/** A secure reference to a stored file — never a public, permanent URL. */
export interface StoredFileRef {
  name: string;
  type: string;
  size: number;
  storageKey: string;
  uploadedAt: string;
  /** Signed/private download link or a token-guarded retrieval reference. */
  link: string | null;
  /** When the signed link expires (ISO), if the provider expires links. */
  linkExpiresAt?: string | null;
}

export interface StorageAdapter {
  name: string;
  /** Store one file securely; return a reference. MUST throw on failure. */
  store(file: UploadFile, key: string): Promise<StoredFileRef>;
  /** True only for the labeled development simulation (nothing really stored). */
  dev?: boolean;
}

export interface BrokerNotification {
  title: 'New Document Review Request';
  disclaimer: string;
  borrower: {
    name: string;
    phone: string;
    email: string;
    preferredContactTime: string;
    preferredLanguage: string;
  };
  scenarioSummary: string;
  documentTypes: string[];
  fileNames: string[];
  /** Secure references incl. storage key + signed/private link. */
  documents: StoredFileRef[];
  missingFields: string[];
  possibleLoanPaths: { name: string; fit: string }[];
  cashToCloseEstimate: unknown;
  loanStrategyProfile: unknown;
  borrowerNote: string;
  sourceUrl: string;
  timestamp: string;
  sessionId: string;
}

export interface Notifier {
  name: string;
  /** Deliver the notification to the broker. MUST throw on failure. */
  send(notification: BrokerNotification): Promise<void>;
}

/** The fields the delivery core needs from the submission payload. */
export interface DeliveryInput {
  contact: {
    name: string;
    phone: string;
    email: string;
    preferredContactTime: string;
    preferredLanguage: string;
  };
  originalMessage: string;
  documents: { name: string; type: string; size: number }[];
  missingFields: string[];
  possibleLoanPaths: { name: string; fit: string }[];
  cashToCloseEstimate: unknown;
  profile: unknown;
  note: string;
  sourcePage: string;
  timestamp: string;
  sessionId: string;
}

export interface DeliveryResult {
  ok: boolean;
  stage?: 'storage' | 'notify';
  error?: string;
  references?: StoredFileRef[];
  /** True only when a labeled development simulation was used. */
  dev?: boolean;
}

/** Build the broker notification from the submission + stored references. */
export function buildBrokerNotification(
  input: DeliveryInput,
  references: StoredFileRef[],
): BrokerNotification {
  return {
    title: 'New Document Review Request',
    disclaimer:
      'These documents were submitted for broker review, not as a completed mortgage application.',
    borrower: {
      name: input.contact.name,
      phone: input.contact.phone,
      email: input.contact.email,
      preferredContactTime: input.contact.preferredContactTime,
      preferredLanguage: input.contact.preferredLanguage,
    },
    scenarioSummary: input.originalMessage,
    documentTypes: references.map((r) => r.type),
    fileNames: references.map((r) => r.name),
    documents: references,
    missingFields: input.missingFields,
    possibleLoanPaths: input.possibleLoanPaths,
    cashToCloseEstimate: input.cashToCloseEstimate,
    loanStrategyProfile: input.profile,
    borrowerNote: input.note,
    sourceUrl: input.sourcePage,
    timestamp: input.timestamp,
    sessionId: input.sessionId,
  };
}

/**
 * Store every file, THEN notify the broker. Success requires BOTH. On a storage
 * failure the broker is never notified; on a notify failure the result is still
 * a failure (the borrower must not be told the documents were received).
 */
export async function deliverDocumentReview(args: {
  files: UploadFile[];
  input: DeliveryInput;
  storage: StorageAdapter;
  notify: Notifier;
  keyPrefix?: string;
}): Promise<DeliveryResult> {
  const { files, input, storage, notify } = args;
  const prefix = args.keyPrefix ?? `${input.sessionId}/${input.timestamp}`;

  // 1. Store all files first.
  const references: StoredFileRef[] = [];
  for (let i = 0; i < files.length; i++) {
    const key = `${prefix}/${i}-${sanitize(files[i].name)}`;
    try {
      references.push(await storage.store(files[i], key));
    } catch (e) {
      return { ok: false, stage: 'storage', error: String(e) };
    }
  }

  // 2. Notify the broker with secure references — only after storage succeeded.
  const notification = buildBrokerNotification(input, references);
  try {
    await notify.send(notification);
  } catch (e) {
    return { ok: false, stage: 'notify', error: String(e) };
  }

  return { ok: true, references, dev: storage.dev };
}

function sanitize(name: string): string {
  return name.replace(/[^\w.-]+/g, '_').slice(0, 80);
}

// ---- storage plan resolution (used by the function; pure + testable) -------
export type StorageProviderName = 'netlify-blobs' | 'supabase' | 's3' | 'dev-sim' | 'none';

export interface StoragePlan {
  provider: StorageProviderName;
  /** True only when the labeled dev simulation is permitted. */
  simulated: boolean;
  /** True when storage + a notifier are both usable. */
  configured: boolean;
  reason?: string;
}

/**
 * Decide the storage/delivery plan from environment. PRODUCTION MUST NEVER
 * SIMULATE SUCCESS: `dev-sim` is refused when CONTEXT=production unless the
 * operator explicitly forces it with DOCUMENT_ALLOW_DEV_SIM=true.
 */
export function resolveStoragePlan(env: Record<string, string | undefined>): StoragePlan {
  const provider = (env.DOCUMENT_STORAGE_PROVIDER || '').trim() as StorageProviderName | '';
  // The webhook is the real delivery channel. DOCUMENT_REVIEW_EMAIL is only an
  // optional reference address included in the notification, not a transport.
  const hasNotifier = !!env.DOCUMENT_REVIEW_WEBHOOK;
  const isProd = env.CONTEXT === 'production';

  if (!provider) {
    return { provider: 'none', simulated: false, configured: false, reason: 'DOCUMENT_STORAGE_PROVIDER is not set' };
  }
  if (provider === 'dev-sim') {
    const allowed = !isProd || env.DOCUMENT_ALLOW_DEV_SIM === 'true';
    if (!allowed) {
      return { provider: 'dev-sim', simulated: false, configured: false, reason: 'dev-sim is refused in production' };
    }
    return { provider: 'dev-sim', simulated: true, configured: true };
  }
  if (!hasNotifier) {
    return { provider, simulated: false, configured: false, reason: 'no notifier: set DOCUMENT_REVIEW_WEBHOOK' };
  }
  return { provider, simulated: false, configured: true };
}

/** A labeled development storage simulation. NEVER used in production. */
export function createDevSimStorage(now: () => string = () => new Date().toISOString()): StorageAdapter {
  return {
    name: 'dev-sim',
    dev: true,
    async store(file, key) {
      return {
        name: file.name,
        type: file.type,
        size: file.size,
        storageKey: key,
        uploadedAt: now(),
        link: `devsim://not-delivered/${key}`,
        linkExpiresAt: null,
      };
    },
  };
}
