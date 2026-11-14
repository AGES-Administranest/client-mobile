import { useCallback, useEffect, useState } from 'react';

import { useAuth } from 'features/auth';
import { isOnline, onConnectionRestored } from 'shared/services';
import { isNetworkError } from 'shared/utils/network';

import {
  downloadAvailability,
  type DownloadAvailability,
} from '../domain/invoiceDownload';
import type { ServiceInvoiceRecord } from '../domain/serviceInvoiceRecord.types';
import { savePdfToDevice } from '../services/invoicePdfSaver';
import { requestServiceInvoiceDownload } from '../services/serviceInvoiceRecordService';

export type DownloadStatus = 'idle' | 'requesting' | 'saved' | 'failed';

type UseServiceInvoiceDownloadOptions = {
  record: ServiceInvoiceRecord | null;
  knownOffline?: boolean;
};

export type ServiceInvoiceDownloadState = {
  availability: DownloadAvailability;
  status: DownloadStatus;
  save: () => void;
};

export function useServiceInvoiceDownload({
  record,
  knownOffline = false,
}: UseServiceInvoiceDownloadOptions): ServiceInvoiceDownloadState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [online, setOnline] = useState(true);
  const [status, setStatus] = useState<DownloadStatus>('idle');
  const invoiceId = record?.id ?? null;

  useEffect(() => {
    let isCurrent = true;
    isOnline().then(value => {
      if (isCurrent) setOnline(value);
    });
    const stopListening = onConnectionRestored(() => setOnline(true));
    return () => {
      isCurrent = false;
      stopListening();
    };
  }, []);

  const save = useCallback(async () => {
    if (!idToken || !invoiceId || status === 'requesting') return;
    setStatus('requesting');
    try {
      const { url, filename } = await requestServiceInvoiceDownload(
        idToken,
        invoiceId,
      );
      const result = await savePdfToDevice(url, filename);
      setStatus(result === 'saved' ? 'saved' : 'idle');
    } catch (error) {
      if (isNetworkError(error)) setOnline(false);
      setStatus('failed');
    }
  }, [idToken, invoiceId, status]);

  return {
    availability: record
      ? downloadAvailability({
          hasFile: record.hasFile,
          syncStatus: record.syncStatus,
          isOnline: online && !knownOffline,
        })
      : 'noFile',
    status,
    save,
  };
}
