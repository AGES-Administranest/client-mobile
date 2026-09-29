import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import { backendUnitLabel } from 'features/materials';

import type { Extraction } from '../domain/extraction';
import {
  fromExtraction,
  reviewFromDetail,
  type Review,
} from '../domain/review';
import { getEntry } from '../services/stockEntryService';

export type OpenEntry = {
  invoiceId: string;
  initial: Review;
  /** Changes on every opening, so the review starts over from `initial`. */
  session: number;
};

export type EntryReviewState = {
  entry: OpenEntry | null;
  isVisible: boolean;
  isOpening: boolean;
  openFailed: boolean;
  /** Reopens an entry as it was last saved. */
  openSaved: (invoiceId: string) => void;
  /** Opens an entry just read, straight from the upload's answer. */
  openRead: (invoiceId: string, extraction: Extraction) => void;
  close: () => void;
  dismissOpenFailure: () => void;
};

export function useEntryReview(): EntryReviewState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [entry, setEntry] = useState<OpenEntry | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [openFailed, setOpenFailed] = useState(false);
  const openings = useRef(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const show = useCallback((invoiceId: string, initial: Review) => {
    openings.current += 1;
    setEntry({ invoiceId, initial, session: openings.current });
    setIsVisible(true);
  }, []);

  const openSaved = useCallback(
    (invoiceId: string) => {
      if (!idToken) return;
      setIsOpening(true);
      getEntry(idToken, invoiceId)
        .then(detail => {
          if (isMounted.current) {
            show(invoiceId, reviewFromDetail(detail, backendUnitLabel));
          }
        })
        .catch(() => {
          if (isMounted.current) setOpenFailed(true);
        })
        .finally(() => {
          if (isMounted.current) setIsOpening(false);
        });
    },
    [idToken, show],
  );

  const openRead = useCallback(
    (invoiceId: string, extraction: Extraction) =>
      show(invoiceId, fromExtraction(extraction, backendUnitLabel)),
    [show],
  );

  return {
    entry,
    isVisible,
    isOpening,
    openFailed,
    openSaved,
    openRead,
    close: useCallback(() => setIsVisible(false), []),
    dismissOpenFailure: useCallback(() => setOpenFailed(false), []),
  };
}
