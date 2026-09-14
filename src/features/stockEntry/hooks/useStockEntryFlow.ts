import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';

import { InvoiceDocument, PickedFile } from '../domain/invoiceDocument';
import { ScannedItem } from '../domain/stockItem';
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

export type StockEntryStep =
  | 'idle' // nothing open
  | 'menu' // bottom-sheet with the 3 entry options
  | 'scanning' // full-screen camera
  | 'uploading' // hashing the file and sending it to the bucket
  | 'review'; // bottom-sheet with the extracted items

/** Anything that can stop the flow, from either half of it. */
export type StockEntryFailure = PickFailure | UploadFailure;

type StockEntryFlow = {
  step: StockEntryStep;
  items: ScannedItem[];
  /** The document already in the bucket — carries the invoice id (ADR-09). */
  document: InvoiceDocument | null;
  failure: StockEntryFailure | null;
  openMenu: () => void;
  closeMenu: () => void;
  startScan: () => void;
  cancelScan: () => void;
  attachPdf: () => void;
  capture: (imageUri: string) => void;
  pickFromLibrary: () => void;
  renameItem: (id: string, name: string) => void;
  setItemQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  confirm: () => void;
  cancelReview: () => void;
  dismissFailure: () => void;
};

function toFailure(error: unknown): StockEntryFailure {
  if (error instanceof PickError || error instanceof UploadError) {
    return error.reason;
  }
  return 'unexpected';
}

// Owns the UI state for the stock-entry flow and wires picking → upload →
// review. Screens stay declarative; orchestration lives here.
export function useStockEntryFlow(): StockEntryFlow {
  const [step, setStep] = useState<StockEntryStep>('idle');
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [document, setDocument] = useState<InvoiceDocument | null>(null);
  const [failure, setFailure] = useState<StockEntryFailure | null>(null);
  const isMounted = useRef(true);
  const { session } = useAuth();

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const openMenu = useCallback(() => setStep('menu'), []);
  const closeMenu = useCallback(() => setStep('idle'), []);
  const startScan = useCallback(() => setStep('scanning'), []);
  const cancelScan = useCallback(() => setStep('idle'), []);
  const confirm = useCallback(() => setStep('idle'), []);
  const cancelReview = useCallback(() => setStep('idle'), []);
  const dismissFailure = useCallback(() => setFailure(null), []);

  /**
   * The whole entry: pick a file and put it in the bucket.
   *
   * The document is what the entry is evidence of, so it is attached before
   * anything else happens (§3.1). Reading it is the server's job (D2), and
   * the app is not wired to that yet — so the review opens empty and the user
   * types the items in.
   */
  const runEntry = useCallback(
    async (pick: () => Promise<PickedFile | null>) => {
      setStep('uploading');
      try {
        const picked = await pick();
        if (!isMounted.current) {
          return;
        }
        // `null` means the user cancelled the picker — go quietly back.
        if (picked === null) {
          setStep('idle');
          return;
        }

        // Unreachable: App.tsx only renders the tab with a session open.
        if (!session) {
          throw new Error(
            'No session: the stock-entry tab should not be open.',
          );
        }

        // Hash, size, mime and the invoice id, all read from the file itself.
        const uploaded = await describeDocument(picked);
        await uploadInvoiceDocument(uploaded, session.idToken);
        if (!isMounted.current) {
          return;
        }
        setDocument(uploaded);
        setItems([]);
        setStep('review');
      } catch (error) {
        if (!isMounted.current) {
          return;
        }
        setFailure(toFailure(error));
        setStep('idle');
      }
    },
    [session],
  );

  const attachPdf = useCallback(() => {
    runEntry(pickPdf);
  }, [runEntry]);

  const capture = useCallback(
    (imageUri: string) => {
      runEntry(() => readImageFile(imageUri));
    },
    [runEntry],
  );

  const pickFromLibrary = useCallback(() => {
    runEntry(pickInvoiceImage);
  }, [runEntry]);

  const renameItem = useCallback((id: string, name: string) => {
    setItems(current =>
      current.map(item => (item.id === id ? { ...item, name } : item)),
    );
  }, []);

  const setItemQuantity = useCallback((id: string, quantity: number) => {
    setItems(current =>
      current.map(item => (item.id === id ? { ...item, quantity } : item)),
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(current => current.filter(item => item.id !== id));
  }, []);

  return {
    step,
    items,
    document,
    failure,
    openMenu,
    closeMenu,
    startScan,
    cancelScan,
    attachPdf,
    capture,
    pickFromLibrary,
    renameItem,
    setItemQuantity,
    removeItem,
    confirm,
    cancelReview,
    dismissFailure,
  };
}
