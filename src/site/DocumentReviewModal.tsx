import { useRef, useState } from 'react';
import {
  DOCUMENT_CATEGORIES,
  ALLOWED_EXTENSIONS,
  MAX_FILES,
  validateFile,
  validateSubmission,
  contactComplete,
} from './scenario';
import type {
  ContactInfo,
  DocumentCategory,
  DocumentReviewResult,
  PendingUpload,
  ScenarioProfile,
} from './scenario';
import { t, LANGUAGES } from './i18n';
import type { Language } from './scenario';

// The Document Review upload flow. Files live in component state (in memory)
// only — never written to storage. On submit the parent routes them through the
// documentReviewSubmissionAdapter and posts the chat event + confirmation.

interface Props {
  lang: Language;
  profile: ScenarioProfile;
  onClose: () => void;
  /** Parent builds the payload, calls the adapter, and returns the result. */
  onSubmit: (files: PendingUpload[], contact: ContactInfo, note: string) => Promise<DocumentReviewResult>;
}

let uid = 0;

export function DocumentReviewModal({ lang, profile, onClose, onSubmit }: Props) {
  const tr = (k: Parameters<typeof t>[1]) => t(lang, k);
  const inputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<PendingUpload[]>([]);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [needContact, setNeedContact] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [contact, setContact] = useState<ContactInfo>({
    name: profile.name ?? '',
    phone: profile.phone ?? '',
    email: profile.email ?? '',
    preferredContactTime: profile.preferredContactTime ?? '',
    preferredLanguage: profile.preferredLanguage ?? lang,
  });

  function addFiles(list: FileList | null) {
    if (!list) return;
    const nextErrors: string[] = [];
    const incoming: PendingUpload[] = [];
    for (const file of Array.from(list)) {
      const v = validateFile({ name: file.name, size: file.size, type: file.type });
      if (!v.ok) {
        nextErrors.push(`${file.name}: ${tr(v.messageKey as Parameters<typeof t>[1])}`);
        continue;
      }
      incoming.push({ id: `f${uid++}`, file, category: guessCategory(file.name) });
    }
    setFiles((prev) => {
      const merged = [...prev, ...incoming];
      if (merged.length > MAX_FILES) {
        nextErrors.push(tr('docValidationMax'));
        return merged.slice(0, MAX_FILES);
      }
      return merged;
    });
    setErrors(nextErrors);
    if (inputRef.current) inputRef.current.value = '';
  }

  function setCategory(id: string, category: DocumentCategory) {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, category } : f)));
  }
  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleUpload() {
    const check = validateSubmission(files);
    if (!check.ok) {
      setErrors([tr(check.errorKey as Parameters<typeof t>[1])]);
      return;
    }
    if (!contactComplete(contact)) {
      setNeedContact(true);
      setErrors([]);
      return;
    }
    setErrors([]);
    setPhase('sending');
    const res = await onSubmit(files, contact, note);
    if (res.ok) {
      // Success: drop the in-memory File objects immediately.
      setFiles([]);
      setPhase('done');
      setTimeout(onClose, 1600);
    } else {
      setPhase('error');
    }
  }

  const totalMb = (files.reduce((s, f) => s + f.file.size, 0) / (1024 * 1024)).toFixed(1);

  return (
    <div className="sm-modal-overlay" onClick={onClose}>
      <div className="sm-modal sm-docmodal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={tr('docModalTitle')}>
        <div className="sm-modal-head">
          <span>{tr('docModalTitle')}</span>
          <button type="button" className="sm-x" onClick={onClose} aria-label={tr('close')}>×</button>
        </div>

        <div className="sm-docmodal-body">
          <p className="sm-doc-intro">{tr('docModalIntro')}</p>
          <p className="sm-doc-safety">⚠ {tr('docSafetyNote')}</p>

          {/* file picker */}
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(',')}
            className="sm-hiddeninput"
            onChange={(e) => addFiles(e.target.files)}
          />
          <button type="button" className="sm-btn sm-btn-soft sm-doc-add" onClick={() => inputRef.current?.click()}>
            + {tr('docAddFiles')}
          </button>

          {errors.length > 0 && (
            <ul className="sm-doc-errors" role="alert">
              {errors.map((e, i) => (<li key={i}>{e}</li>))}
            </ul>
          )}

          {files.length > 0 && (
            <>
              <div className="sm-sec">{tr('docFilesHeading')} · {files.length}/{MAX_FILES} · {totalMb} MB</div>
              <ul className="sm-doc-files">
                {files.map((f) => (
                  <li key={f.id} className="sm-doc-file">
                    <div className="sm-doc-file-top">
                      <span className="sm-doc-name" title={f.file.name}>{f.file.name}</span>
                      <button type="button" className="sm-doc-remove" onClick={() => removeFile(f.id)}>{tr('docRemove')}</button>
                    </div>
                    <div className="sm-doc-file-row">
                      <select
                        className={`sm-doc-type ${f.category ? '' : 'is-empty'}`}
                        value={f.category}
                        onChange={(e) => setCategory(f.id, e.target.value as DocumentCategory)}
                        aria-label={tr('docTypeLabel')}
                      >
                        <option value="">{tr('docTypeLabel')}…</option>
                        {DOCUMENT_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{tr(c.labelKey as Parameters<typeof t>[1])}</option>
                        ))}
                      </select>
                      <button type="button" className="sm-doc-explain" disabled title={tr('docExplainSoon')}>
                        {tr('docExplainSoon')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <label className="sm-field sm-doc-note">
                <span>{tr('docNoteLabel')}</span>
                <input value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
            </>
          )}

          {/* contact — requested only after files are chosen and Upload is clicked */}
          {needContact && (
            <div className="sm-doc-contact">
              <p className="sm-doc-contact-prompt">{tr('docContactPrompt')}</p>
              <div className="sm-row2">
                <label className="sm-field"><span>{tr('name')}</span>
                  <input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} /></label>
                <label className="sm-field"><span>{tr('phone')}</span>
                  <input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} /></label>
              </div>
              <label className="sm-field"><span>{tr('email')}</span>
                <input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} /></label>
              <div className="sm-row2">
                <label className="sm-field"><span>{tr('contactTime')}</span>
                  <input value={contact.preferredContactTime} onChange={(e) => setContact({ ...contact, preferredContactTime: e.target.value })} placeholder={tr('contactTimePlaceholder')} /></label>
                <label className="sm-field"><span>{tr('preferredLanguage')}</span>
                  <select value={contact.preferredLanguage} onChange={(e) => setContact({ ...contact, preferredLanguage: e.target.value as Language })}>
                    {LANGUAGES.map((l) => (<option key={l.code} value={l.code}>{l.label}</option>))}
                  </select></label>
              </div>
            </div>
          )}

          {phase === 'error' && <p className="sm-doc-failure" role="alert">{tr('docFailure')}</p>}
          {phase === 'done' && <p className="sm-done">{tr('docSubmittedStatus')}</p>}

          <p className="sm-doc-compliance">{tr('docCompliance')}</p>
          <p className="sm-doc-reviewedby">{tr('docReviewedBy')}</p>
        </div>

        {/* sticky action bar */}
        <div className="sm-docmodal-foot">
          <button
            type="button"
            className="sm-btn sm-btn-primary sm-doc-submit"
            onClick={handleUpload}
            disabled={phase === 'sending' || phase === 'done'}
          >
            {phase === 'sending' ? tr('sending') : tr('docUploadCta')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Best-effort default category from the file name (user can change it). */
function guessCategory(name: string): DocumentCategory | '' {
  const n = name.toLowerCase();
  if (/loan.?estimate|lender|quote|\ble\b/.test(n)) return 'loan-estimate';
  if (/bank|statement/.test(n)) return 'bank-statement';
  if (/paystub|pay.?stub|w-?2|1099/.test(n)) return 'paystub-w2-1099';
  if (/tax|1040|p&l|profit/.test(n)) return 'tax-return-pl';
  if (/purchase|contract|offer/.test(n)) return 'purchase-contract';
  if (/mortgage/.test(n)) return 'mortgage-statement';
  if (/insurance|hoi/.test(n)) return 'insurance-quote';
  if (/title|escrow/.test(n)) return 'title-escrow-estimate';
  return '';
}

export default DocumentReviewModal;
