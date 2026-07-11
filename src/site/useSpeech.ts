import { useCallback, useEffect, useRef, useState } from 'react';
import { recognitionLangFor } from './i18n';
import type { Language } from './scenario';

// Working speech-to-text via the Web Speech API (window.SpeechRecognition /
// webkitSpeechRecognition). Availability differs by browser — Chrome/Edge and
// Safari support it; Firefox generally does not. When unsupported we surface a
// localized message and typing stays fully functional.

interface RecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEventLike {
  resultIndex: number;
  results: { length: number } & Record<number, RecognitionResultLike>;
}
interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => RecognitionLike;

function getCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Append recognized speech to already-typed text without overwriting it. */
export function mergeTranscript(base: string, addition: string): string {
  if (!addition) return base;
  const sep = base && !/\s$/.test(base) ? ' ' : '';
  return base + sep + addition;
}

export type MicStatus = 'idle' | 'listening' | 'denied' | 'unsupported';

export interface UseSpeech {
  supported: boolean;
  status: MicStatus;
  listening: boolean;
  toggle: () => void;
  stop: () => void;
  clearError: () => void;
}

export function useSpeech(params: {
  lang: Language;
  getText: () => string;
  setText: (t: string) => void;
}): UseSpeech {
  const { lang, getText, setText } = params;
  const [status, setStatus] = useState<MicStatus>('idle');
  const recRef = useRef<RecognitionLike | null>(null);
  const baseRef = useRef('');
  const finalRef = useRef('');
  const supported = getCtor() != null;

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (rec) {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
      recRef.current = null;
    }
    setStatus((s) => (s === 'listening' ? 'idle' : s));
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      setStatus('unsupported');
      return;
    }
    if (recRef.current) return; // never run two sessions at once
    const rec = new Ctor();
    rec.lang = recognitionLangFor(lang);
    rec.continuous = true;
    rec.interimResults = true;
    baseRef.current = getText();
    finalRef.current = '';
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const raw = (r?.[0]?.transcript ?? '').trim();
        if (!raw) continue;
        // Separate segments (spoken with pauses) with a space so recognized
        // phrases stay readable instead of mashing together ("wordAnother").
        if (r?.isFinal) finalRef.current = finalRef.current ? `${finalRef.current} ${raw}` : raw;
        else interim = interim ? `${interim} ${raw}` : raw;
      }
      const combined = interim ? `${finalRef.current} ${interim}`.trim() : finalRef.current;
      setText(mergeTranscript(baseRef.current, combined));
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setStatus('denied');
      else setStatus('idle');
      const r = recRef.current;
      if (r) {
        r.onresult = null;
        r.onerror = null;
        r.onend = null;
        recRef.current = null;
      }
    };
    rec.onend = () => {
      recRef.current = null;
      setStatus((s) => (s === 'listening' ? 'idle' : s));
    };
    recRef.current = rec;
    // Set 'listening' BEFORE start() so a synchronously-fired permission error
    // (onerror → 'denied') wins instead of being overwritten back to 'listening'.
    setStatus('listening');
    try {
      rec.start();
    } catch {
      recRef.current = null;
      setStatus('idle');
    }
  }, [lang, getText, setText]);

  const toggle = useCallback(() => {
    if (status === 'listening') stop();
    else start();
  }, [status, start, stop]);

  const clearError = useCallback(() => {
    setStatus((s) => (s === 'denied' || s === 'unsupported' ? 'idle' : s));
  }, []);

  // Clean up on unmount.
  useEffect(() => () => stop(), [stop]);

  // Stop recognition when the language changes (a new session uses the new locale).
  useEffect(() => {
    stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  return { supported, status, listening: status === 'listening', toggle, stop, clearError };
}
