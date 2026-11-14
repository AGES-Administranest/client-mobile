import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import { useClientNames } from 'features/clients';
import { ApiError } from 'shared/services/apiClient';
import { isNetworkError } from 'shared/utils/network';

import { pendingToRecord } from '../domain/pendingSummary';
import type { ServiceInvoiceRecord } from '../domain/serviceInvoiceRecord.types';
import {
  loadServiceInvoiceCache,
  loadServiceInvoiceOutbox,
} from '../services/offlineServiceInvoiceStore';
import { fetchServiceInvoiceRecord } from '../services/serviceInvoiceRecordService';

export type RecordStatus = 'loading' | 'ready' | 'notFound' | 'error';

export type ServiceInvoiceRecordState = {
  status: RecordStatus;
  record: ServiceInvoiceRecord | null;
  isOffline: boolean;
  reload: () => void;
};

export function useServiceInvoiceRecord(
  invoiceId: string,
): ServiceInvoiceRecordState {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;
  const clientNames = useClientNames();
  const clientNamesRef = useRef(clientNames);
  clientNamesRef.current = clientNames;

  const [status, setStatus] = useState<RecordStatus>('loading');
  const [record, setRecord] = useState<ServiceInvoiceRecord | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    if (!idToken || !userId) return;
    const request = ++latestRequest.current;
    const isCurrent = () => request === latestRequest.current;

    const queued = await loadServiceInvoiceOutbox(userId).catch(() => []);
    const waiting = queued.find(invoice => invoice.id === invoiceId);
    if (waiting) {
      if (!isCurrent()) return;
      setRecord(
        pendingToRecord(
          waiting,
          clientNamesRef.current[waiting.clientId] ?? '',
        ),
      );
      setIsOffline(false);
      setStatus('ready');
      return;
    }

    try {
      const loaded = await fetchServiceInvoiceRecord(idToken, invoiceId);
      if (!isCurrent()) return;
      setRecord(loaded);
      setIsOffline(false);
      setStatus('ready');
    } catch (error) {
      if (!isCurrent()) return;
      if (error instanceof ApiError && error.status === 404) {
        setStatus('notFound');
        return;
      }
      if (!isNetworkError(error)) {
        setStatus('error');
        return;
      }
      const cached = (
        await loadServiceInvoiceCache(userId).catch(() => [])
      ).find(invoice => invoice.id === invoiceId);
      if (!isCurrent()) return;
      if (!cached) {
        setStatus('error');
        return;
      }
      setRecord({ ...cached, clientTaxId: null, file: null });
      setIsOffline(true);
      setStatus('ready');
    }
  }, [idToken, userId, invoiceId]);

  const reload = useCallback(() => {
    setStatus('loading');
    load();
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    status,
    record,
    isOffline,
    reload,
  };
}
