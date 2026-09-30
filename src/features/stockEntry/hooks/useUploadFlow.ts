import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';

import {
  readingFailure as readingFailureOf,
  type Extraction,
  type ReadingFailure,
} from '../domain/extraction';
import { InvoiceDocument, PickedFile } from '../domain/invoiceDocument';
import { describeDocument } from '../services/invoiceDocumentService';
import {
  PickError,
  PickFailure,
  pickInvoiceImage,
  pickPdf,
  readImageFile,
} from '../services/invoiceSource';
import {
  uploadInvoiceDocument,
  UploadError,
  UploadFailure,
} from '../services/invoiceUploadService';

export type UploadStep =
  | 'idle'
  | 'menu'
  | 'scanning'
  | 'preparing' // reading and hashing the picked file
  | 'confirmFile' // the PDF, before anything is sent
  | 'uploading' // sending it to the bucket and waiting for the reading
  | 'readingFailed';

/** Anything that can stop the upload, from either half of it. */
export type UploadFlowFailure = PickFailure | UploadFailure;

type UnreadEntry = { invoiceId: string; reason: ReadingFailure };

type UploadFlowOptions = {
  /** The document was read: its review can open. */
  onRead: (invoiceId: string, extraction: Extraction) => void;
  /** An upload finished, well or not: the pending list may have changed. */
  onSettled: () => void;
};

export type UploadFlow = {
  step: UploadStep;
  /** Carries the invoice id (ADR-09), from the moment the file is picked. */
  document: InvoiceDocument | null;
  readingFailure: UnreadEntry | null;
  failure: UploadFlowFailure | null;
  /** On a duplicated file, the entry that already holds it. */
  duplicateOf: string | null;
  openMenu: () => void;
  closeMenu: () => void;
  startScan: () => void;
  cancelScan: () => void;
  attachPdf: () => void;
  capture: (imageUri: string) => void;
  pickFromLibrary: () => void;
  sendDocument: () => void;
  /** Another PDF for an existing entry, so no second draft is left behind. */
  replaceDocument: (invoiceId?: string) => void;
  cancelDocument: () => void;
  /** An entry opened from elsewhere whose document was never read. */
  showReadingFailure: (invoiceId: string, reason: ReadingFailure) => void;
  dismissReadingFailure: () => void;
  dismissFailure: () => void;
};

export function useUploadFlow({
  onRead,
  onSettled,
}: UploadFlowOptions): UploadFlow {
  const [step, setStep] = useState<UploadStep>('idle');
  const [document, setDocument] = useState<InvoiceDocument | null>(null);
  const [readingFailure, setReadingFailure] = useState<UnreadEntry | null>(
    null,
  );
  const [failure, setFailure] = useState<UploadFlowFailure | null>(null);
  const [duplicateOf, setDuplicateOf] = useState<string | null>(null);
  const isMounted = useRef(true);
  const { session } = useAuth();

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fail = useCallback((error: unknown) => {
    if (!isMounted.current) return;
    setFailure(failureOf(error));
    setDuplicateOf(error instanceof UploadError ? error.existingEntryId : null);
    setStep('idle');
  }, []);

  /** The document is attached before it is read (§3.1); reading is the API's. */
  const upload = useCallback(
    async (described: InvoiceDocument) => {
      // Unreachable: App.tsx only renders the tab with a session open.
      if (!session) {
        throw new Error('No session: the stock-entry tab should not be open.');
      }
      setStep('uploading');
      try {
        const read = await uploadInvoiceDocument(described, session.idToken);
        if (!isMounted.current) return;
        const reason = readingFailureOf(read);
        setReadingFailure(reason && { invoiceId: described.id, reason });
        setStep(reason ? 'readingFailed' : 'idle');
        if (!reason) onRead(described.id, read);
      } finally {
        onSettled();
      }
    },
    [onRead, onSettled, session],
  );

  const choosePdf = useCallback(
    async (invoiceId: string | undefined, onCancel: UploadStep) => {
      setStep('preparing');
      try {
        const picked = await pickPdf();
        if (!isMounted.current) return;
        if (picked === null) {
          setStep(onCancel);
          return;
        }
        setDocument(await describeDocument(picked, invoiceId));
        setStep('confirmFile');
      } catch (error) {
        fail(error);
      }
    },
    [fail],
  );

  /** A photo was already previewed by the camera, so it goes straight up. */
  const sendPhoto = useCallback(
    async (pick: () => Promise<PickedFile | null>) => {
      setStep('preparing');
      try {
        const picked = await pick();
        if (!isMounted.current) return;
        if (picked === null) {
          setStep('idle');
          return;
        }
        const described = await describeDocument(picked);
        setDocument(described);
        await upload(described);
      } catch (error) {
        fail(error);
      }
    },
    [fail, upload],
  );

  return {
    step,
    document,
    readingFailure,
    failure,
    duplicateOf,
    openMenu: useCallback(() => setStep('menu'), []),
    closeMenu: useCallback(() => setStep('idle'), []),
    startScan: useCallback(() => setStep('scanning'), []),
    cancelScan: useCallback(() => setStep('idle'), []),
    attachPdf: useCallback(() => {
      choosePdf(undefined, 'idle');
    }, [choosePdf]),
    capture: useCallback(
      (imageUri: string) => {
        sendPhoto(() => readImageFile(imageUri));
      },
      [sendPhoto],
    ),
    pickFromLibrary: useCallback(() => {
      sendPhoto(pickInvoiceImage);
    }, [sendPhoto]),
    sendDocument: useCallback(() => {
      if (document) upload(document).catch(fail);
    }, [document, fail, upload]),
    replaceDocument: useCallback(
      (invoiceId?: string) => {
        choosePdf(invoiceId ?? document?.id, step);
      },
      [choosePdf, document, step],
    ),
    cancelDocument: useCallback(() => {
      setDocument(null);
      setStep('idle');
    }, []),
    showReadingFailure: useCallback(
      (invoiceId: string, reason: ReadingFailure) => {
        setReadingFailure({ invoiceId, reason });
        setStep('readingFailed');
      },
      [],
    ),
    dismissReadingFailure: useCallback(() => setStep('idle'), []),
    dismissFailure: useCallback(() => {
      setFailure(null);
      setDuplicateOf(null);
    }, []),
  };
}

function failureOf(error: unknown): UploadFlowFailure {
  if (error instanceof PickError || error instanceof UploadError) {
    return error.reason;
  }
  return 'unexpected';
}
