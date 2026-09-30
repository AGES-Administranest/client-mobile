import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';

import {
  toHeaderInput,
  toLinesInput,
  type Review,
  type ReviewHeader,
  type ReviewLine,
} from '../domain/review';
import { saveHeader, saveLines } from '../services/stockEntryService';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

export type DraftAutosave = {
  status: SaveStatus;
  retry: () => void;
  /** Saves what is pending now; resolves whether everything is saved. */
  flush: () => Promise<boolean>;
};

const AUTOSAVE_DELAY_MS = 800;

type Saved = { header: ReviewHeader; lines: readonly ReviewLine[] };

/**
 * Saves the review a moment after each change. Header and lines are saved
 * apart, only when they changed, and one save waits for the previous one so
 * an older body never lands after a newer one.
 */
export function useDraftAutosave(
  invoiceId: string,
  review: Review,
): DraftAutosave {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [status, setStatus] = useState<SaveStatus>('idle');
  const latest = useRef(review);
  const saved = useRef<Saved>({ header: review.header, lines: review.lines });
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));
  const isMounted = useRef(true);
  latest.current = review;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const report = useCallback((next: SaveStatus) => {
    if (isMounted.current) setStatus(next);
  }, []);

  const saveChanges = useCallback(async (): Promise<boolean> => {
    const { header, lines } = latest.current;
    const isHeaderSaved = header === saved.current.header;
    const areLinesSaved = lines === saved.current.lines;
    if (isHeaderSaved && areLinesSaved) return true;
    if (!idToken) return false;

    report('saving');
    try {
      if (!isHeaderSaved) {
        await saveHeader(idToken, invoiceId, toHeaderInput(header));
        saved.current = { ...saved.current, header };
      }
      if (!areLinesSaved) {
        await saveLines(idToken, invoiceId, toLinesInput(lines));
        saved.current = { ...saved.current, lines };
      }
      report('saved');
      return true;
    } catch {
      report('failed');
      return false;
    }
  }, [idToken, invoiceId, report]);

  const flush = useCallback(() => {
    queue.current = queue.current.then(saveChanges);
    return queue.current;
  }, [saveChanges]);

  useEffect(() => {
    const isSaved =
      review.header === saved.current.header &&
      review.lines === saved.current.lines;
    if (isSaved) return;
    const timer = setTimeout(flush, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [review.header, review.lines, flush]);

  return {
    status,
    retry: useCallback(() => {
      flush();
    }, [flush]),
    flush,
  };
}
