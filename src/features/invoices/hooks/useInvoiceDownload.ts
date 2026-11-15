import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';

import { downloadInvoice } from '../services/invoiceDownloadService';

export type InvoiceDownloadStatus = 'idle' | 'downloading' | 'done' | 'failed';

export type InvoiceDownloadState = {
  status: InvoiceDownloadStatus;
  download: () => void;
  reset: () => void;
};

export function useInvoiceDownload(
  invoiceId: string | null,
): InvoiceDownloadState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [status, setStatus] = useState<InvoiceDownloadStatus>('idle');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => setStatus('idle'), [invoiceId]);

  const download = useCallback(() => {
    if (!idToken || !invoiceId || status === 'downloading') {
      return;
    }

    setStatus('downloading');
    downloadInvoice(idToken, invoiceId)
      .then(() => isMounted.current && setStatus('done'))
      .catch(() => isMounted.current && setStatus('failed'));
  }, [idToken, invoiceId, status]);

  const reset = useCallback(() => setStatus('idle'), []);

  return { status, download, reset };
}
