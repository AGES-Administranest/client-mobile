import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import { pickPdf } from 'shared/services/pdfPicker';

import { isAcceptedServiceInvoiceFile } from '../domain/acceptedFile';
import {
  toInitialReview,
  type InitialReview,
} from '../domain/extractionToFormValues';
import type { ServiceInvoiceExtraction } from '../domain/serviceInvoice.types';
import { extractServiceInvoice } from '../services/serviceInvoiceService';

export type UploadStep = 'idle' | 'picking' | 'extracting' | 'review';

export type ServiceInvoiceUploadState = {
  step: UploadStep;
  /** The picked file was not a PDF. */
  isFileRejected: boolean;
  review: InitialReview | null;
  start: () => void;
  dismissRejection: () => void;
  closeReview: () => void;
};

export function useServiceInvoiceUpload(): ServiceInvoiceUploadState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [step, setStep] = useState<UploadStep>('idle');
  const [isFileRejected, setIsFileRejected] = useState(false);
  const [review, setReview] = useState<InitialReview | null>(null);
  const isMounted = useRef(true);
  const isBusy = useRef(false);

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
      const file = await pickPdf();
      if (!isMounted.current) return;
      if (file === null) {
        setStep('idle');
        return;
      }
      if (!isAcceptedServiceInvoiceFile(file)) {
        setIsFileRejected(true);
        setStep('idle');
        return;
      }

      setStep('extracting');
      // A reading that breaks (offline, API down) ends where a failed one does:
      // the review opens empty and the person types the note in.
      let extraction: ServiceInvoiceExtraction | null = null;
      try {
        if (idToken) extraction = await extractServiceInvoice(idToken, file);
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

  return {
    step,
    isFileRejected,
    review,
    start,
    dismissRejection: useCallback(() => setIsFileRejected(false), []),
    closeReview: useCallback(() => {
      setReview(null);
      setStep('idle');
    }, []),
  };
}
