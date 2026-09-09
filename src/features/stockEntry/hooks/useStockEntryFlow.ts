import { useCallback, useEffect, useRef, useState } from 'react';

import { ScannedItem } from '../domain/stockItem';
import {
  extractItemsFromPdf,
  extractItemsFromPhotoRows,
  ScanError,
  ScanFailure,
} from '../services/invoiceScanService';
import { pickInvoiceImage, pickPdf } from '../services/invoiceSource';
import { mlKitOcrProvider, OcrProvider } from '../services/ocrProvider';

export type StockEntryStep =
  | 'idle' // nothing open
  | 'menu' // bottom-sheet with the 3 entry options
  | 'scanning' // full-screen camera
  | 'processing' // extraction is running
  | 'review'; // bottom-sheet with the extracted items

type StockEntryFlow = {
  step: StockEntryStep;
  items: ScannedItem[];
  failure: ScanFailure | null;
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

function toFailure(error: unknown): ScanFailure {
  return error instanceof ScanError ? error.reason : 'noItems';
}

// Owns the UI state for the stock-entry flow and wires the capture/attach steps
// to extraction. Screens stay declarative; orchestration lives here.
export function useStockEntryFlow(
  ocr: OcrProvider = mlKitOcrProvider,
): StockEntryFlow {
  const [step, setStep] = useState<StockEntryStep>('idle');
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [failure, setFailure] = useState<ScanFailure | null>(null);
  const isMounted = useRef(true);

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

  // Runs an extraction with the loading step around it, so the spinner covers
  // the real work rather than an artificial delay.
  const runExtraction = useCallback(
    async (extract: () => Promise<ScannedItem[] | null>) => {
      setStep('processing');
      try {
        const extracted = await extract();
        if (!isMounted.current) {
          return;
        }
        // `null` means the user cancelled the picker — go quietly back.
        if (extracted === null) {
          setStep('idle');
          return;
        }
        setItems(extracted);
        setStep('review');
      } catch (error) {
        if (!isMounted.current) {
          return;
        }
        setFailure(toFailure(error));
        setStep('idle');
      }
    },
    [],
  );

  const attachPdf = useCallback(() => {
    runExtraction(async () => {
      const document = await pickPdf();
      return document === null ? null : extractItemsFromPdf(document.bytes);
    });
  }, [runExtraction]);

  const capture = useCallback(
    (imageUri: string) => {
      runExtraction(async () =>
        extractItemsFromPhotoRows(await ocr.recognizeRows(imageUri)),
      );
    },
    [ocr, runExtraction],
  );

  const pickFromLibrary = useCallback(() => {
    runExtraction(async () => {
      const imageUri = await pickInvoiceImage();
      return imageUri === null
        ? null
        : extractItemsFromPhotoRows(await ocr.recognizeRows(imageUri));
    });
  }, [ocr, runExtraction]);

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
