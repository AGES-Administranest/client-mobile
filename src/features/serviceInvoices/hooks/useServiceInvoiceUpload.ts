import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import { isOnline } from 'shared/services';
import { pickPdf, type PickedPdf } from 'shared/services/pdfPicker';

import { isAcceptedServiceInvoiceFile } from '../domain/acceptedFile';
import {
  toInitialReview,
  toManualReview,
  type InitialReview,
} from '../domain/extractionToFormValues';
import type { ServiceInvoiceExtraction } from '../domain/serviceInvoice.types';
import { extractServiceInvoice } from '../services/serviceInvoiceService';

export type UploadStep =
  | 'idle'
  | 'picking'
  | 'offline'
  | 'extracting'
  | 'review';

export type ServiceInvoiceUploadState = {
  step: UploadStep;
  /** The picked file was not a PDF. */
  isFileRejected: boolean;
  review: InitialReview | null;
  /** The PDF of a note typed by hand; null while the note comes from a reading. */
  manualFile: PickedPdf | null;
  start: () => void;
  /** From the offline notice: leaves it, and picks the PDF once it is gone. */
  chooseManual: () => void;
  onOfflineClosed: () => void;
  dismissOffline: () => void;
  dismissRejection: () => void;
  closeReview: () => void;
};

type PickResult =
  | { status: 'picked'; file: PickedPdf }
  | { status: 'cancelled' }
  | { status: 'rejected' };

async function pickAcceptedPdf(): Promise<PickResult> {
  const file = await pickPdf();
  if (file === null) return { status: 'cancelled' };
  return isAcceptedServiceInvoiceFile(file)
    ? { status: 'picked', file }
    : { status: 'rejected' };
}

export function useServiceInvoiceUpload(): ServiceInvoiceUploadState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [step, setStep] = useState<UploadStep>('idle');
  const [isFileRejected, setIsFileRejected] = useState(false);
  const [review, setReview] = useState<InitialReview | null>(null);
  const [manualFile, setManualFile] = useState<PickedPdf | null>(null);
  const isMounted = useRef(true);
  const isBusy = useRef(false);
  const manualRequested = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const start = useCallback(async () => {
    if (isBusy.current) return;
    isBusy.current = true;
    setIsFileRejected(false);
    setStep('picking');
    try {
      if (!(await isOnline())) {
        if (isMounted.current) setStep('offline');
        return;
      }

      const picked = await pickAcceptedPdf();
      if (!isMounted.current) return;
      if (picked.status !== 'picked') {
        setIsFileRejected(picked.status === 'rejected');
        setStep('idle');
        return;
      }

      setStep('extracting');
      // A reading that breaks (offline, API down) ends where a failed one does:
      // the review opens empty and the person types the note in.
      let extraction: ServiceInvoiceExtraction | null = null;
      try {
        if (idToken) {
          extraction = await extractServiceInvoice(idToken, picked.file);
        }
      } catch {
        extraction = null;
      }
      if (!isMounted.current) return;
      setReview(toInitialReview(extraction));
      setStep('review');
    } catch {
      if (isMounted.current) setStep('idle');
    } finally {
      isBusy.current = false;
    }
  }, [idToken]);

  const startManual = useCallback(async () => {
    if (isBusy.current) return;
    isBusy.current = true;
    setIsFileRejected(false);
    setStep('picking');
    try {
      const picked = await pickAcceptedPdf();
      if (!isMounted.current) return;
      if (picked.status !== 'picked') {
        setIsFileRejected(picked.status === 'rejected');
        setStep('idle');
        return;
      }
      setManualFile(picked.file);
      setReview(toManualReview());
      setStep('review');
    } catch {
      if (isMounted.current) setStep('idle');
    } finally {
      isBusy.current = false;
    }
  }, []);

  // The system picker cannot open while the notice is still leaving, which on
  // iOS fails without an error: the pick waits for the notice to report it left.
  const chooseManual = useCallback(() => {
    manualRequested.current = true;
    setStep('idle');
  }, []);

  const onOfflineClosed = useCallback(() => {
    if (!manualRequested.current) return;
    manualRequested.current = false;
    startManual();
  }, [startManual]);

  return {
    step,
    isFileRejected,
    review,
    manualFile,
    start,
    chooseManual,
    onOfflineClosed,
    dismissOffline: useCallback(() => setStep('idle'), []),
    dismissRejection: useCallback(() => setIsFileRejected(false), []),
    closeReview: useCallback(() => {
      setReview(null);
      setManualFile(null);
      setStep('idle');
    }, []),
  };
}
