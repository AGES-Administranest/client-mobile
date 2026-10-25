import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import { isOnline } from 'shared/services';
import { ApiError } from 'shared/services/apiClient';
import { pickPdf, type PickedPdf } from 'shared/services/pdfPicker';

import {
  fileRefusalOf,
  isAcceptedServiceInvoiceFile,
  isWithinServiceInvoiceSizeLimit,
  type FileRefusal,
} from '../domain/acceptedFile';
import {
  toInitialReview,
  toManualReview,
  type InitialReview,
} from '../domain/extractionToFormValues';
import type { ServiceInvoiceExtraction } from '../domain/serviceInvoice.types';
import {
  discardServiceInvoiceDraft,
  extractServiceInvoice,
  newServiceInvoiceId,
} from '../services/serviceInvoiceService';

export type UploadStep =
  | 'idle'
  | 'picking'
  | 'offline'
  | 'extracting'
  | 'review';

export type ServiceInvoiceUploadState = {
  step: UploadStep;
  /** Why the picked file will not be read, until the person dismisses it. */
  fileRefusal: FileRefusal | null;
  review: InitialReview | null;
  /** The note under review, from the moment its PDF was picked. */
  invoiceId: string | null;
  /** The PDF of a note typed by hand; null while the note comes from a reading. */
  manualFile: PickedPdf | null;
  start: () => void;
  /** From the offline notice: leaves it, and picks the PDF once it is gone. */
  chooseManual: () => void;
  onOfflineClosed: () => void;
  dismissOffline: () => void;
  dismissFileRefusal: () => void;
  /** The person left the review without saving the note. */
  leaveReview: () => void;
  /** The note was confirmed, or queued on the device. */
  finishReview: () => void;
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

type ReadResult =
  | { status: 'read'; extraction: ServiceInvoiceExtraction }
  | { status: 'refused'; refusal: FileRefusal }
  | { status: 'unreachable' };

async function readNote(
  idToken: string | null,
  invoiceId: string,
  file: PickedPdf,
): Promise<ReadResult> {
  if (!idToken) return { status: 'unreachable' };
  try {
    const extraction = await extractServiceInvoice(idToken, invoiceId, file);
    return { status: 'read', extraction };
  } catch (error) {
    const refusal =
      error instanceof ApiError ? fileRefusalOf(error.code) : null;
    return refusal ? { status: 'refused', refusal } : { status: 'unreachable' };
  }
}

export function useServiceInvoiceUpload(): ServiceInvoiceUploadState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [step, setStep] = useState<UploadStep>('idle');
  const [fileRefusal, setFileRefusal] = useState<FileRefusal | null>(null);
  const [review, setReview] = useState<InitialReview | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [manualFile, setManualFile] = useState<PickedPdf | null>(null);
  const isMounted = useRef(true);
  const isBusy = useRef(false);
  const manualRequested = useRef(false);
  const mayHaveDraft = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const refuse = useCallback((refusal: FileRefusal) => {
    setFileRefusal(refusal);
    setStep('idle');
  }, []);

  const start = useCallback(async () => {
    if (isBusy.current) return;
    isBusy.current = true;
    setFileRefusal(null);
    setStep('picking');
    try {
      if (!(await isOnline())) {
        if (isMounted.current) setStep('offline');
        return;
      }

      const picked = await pickAcceptedPdf();
      if (!isMounted.current) return;
      if (picked.status === 'cancelled') {
        setStep('idle');
        return;
      }
      if (picked.status === 'rejected') {
        refuse('notPdf');
        return;
      }
      if (!isWithinServiceInvoiceSizeLimit(picked.file.bytes.length)) {
        refuse('tooLarge');
        return;
      }

      const id = newServiceInvoiceId();
      setStep('extracting');
      const result = await readNote(idToken, id, picked.file);
      if (!isMounted.current) return;
      if (result.status === 'refused') {
        refuse(result.refusal);
        return;
      }

      setInvoiceId(id);
      mayHaveDraft.current = true;
      if (result.status === 'read') {
        setReview(toInitialReview(result.extraction));
      } else {
        // The upload broke halfway (no network, the API down): the note is
        // typed in and waits on the device, under the same id, which a draft
        // left behind may already carry.
        setManualFile(picked.file);
        setReview(toManualReview());
      }
      setStep('review');
    } catch {
      if (isMounted.current) setStep('idle');
    } finally {
      isBusy.current = false;
    }
  }, [idToken, refuse]);

  const startManual = useCallback(async () => {
    if (isBusy.current) return;
    isBusy.current = true;
    setFileRefusal(null);
    setStep('picking');
    try {
      const picked = await pickAcceptedPdf();
      if (!isMounted.current) return;
      if (picked.status === 'cancelled') {
        setStep('idle');
        return;
      }
      if (picked.status === 'rejected') {
        refuse('notPdf');
        return;
      }
      setInvoiceId(newServiceInvoiceId());
      mayHaveDraft.current = false;
      setManualFile(picked.file);
      setReview(toManualReview());
      setStep('review');
    } catch {
      if (isMounted.current) setStep('idle');
    } finally {
      isBusy.current = false;
    }
  }, [refuse]);

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

  const finishReview = useCallback(() => {
    setReview(null);
    setInvoiceId(null);
    setManualFile(null);
    setStep('idle');
  }, []);

  // A draft left behind holds its PDF: the same file would be refused as
  // already sent. Nothing is waiting on it, so a failure is only ignored.
  const leaveReview = useCallback(() => {
    if (mayHaveDraft.current && invoiceId && idToken) {
      discardServiceInvoiceDraft(idToken, invoiceId).catch(() => undefined);
    }
    finishReview();
  }, [finishReview, idToken, invoiceId]);

  return {
    step,
    fileRefusal,
    review,
    invoiceId,
    manualFile,
    start,
    chooseManual,
    onOfflineClosed,
    dismissOffline: useCallback(() => setStep('idle'), []),
    dismissFileRefusal: useCallback(() => setFileRefusal(null), []),
    leaveReview,
    finishReview,
  };
}
