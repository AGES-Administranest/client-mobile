import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import { ApiError } from 'shared/services/apiClient';
import { isNetworkError } from 'shared/utils/network';

import type { ServiceInvoiceRecord } from '../domain/serviceInvoiceRecord.types';
import {
  discardServiceInvoice,
  notifyOfflineServiceInvoicesChanged,
  queueInvoiceDeletion,
} from '../services/offlineServiceInvoiceStore';
import { deleteConfirmedServiceInvoice } from '../services/serviceInvoiceRecordService';

export type DeletionStep = 'idle' | 'confirming' | 'deleting' | 'done';

type UseServiceInvoiceDeletionOptions = {
  record: ServiceInvoiceRecord | null;
  onDeleted: () => void;
};

export type ServiceInvoiceDeletionState = {
  step: DeletionStep;
  failed: boolean;
  queuedOffline: boolean;
  request: () => void;
  cancel: () => void;
  confirm: () => Promise<void>;
  acknowledge: () => void;
};

export function useServiceInvoiceDeletion({
  record,
  onDeleted,
}: UseServiceInvoiceDeletionOptions): ServiceInvoiceDeletionState {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;
  const [step, setStep] = useState<DeletionStep>('idle');
  const [failed, setFailed] = useState(false);
  const [queuedOffline, setQueuedOffline] = useState(false);
  const isMounted = useRef(true);
  const isDeletingRef = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const request = useCallback(() => {
    setFailed(false);
    setStep('confirming');
  }, []);

  const cancel = useCallback(() => setStep('idle'), []);

  const confirm = useCallback(async () => {
    if (!record || !userId || isDeletingRef.current) return;
    isDeletingRef.current = true;
    setStep('deleting');
    setFailed(false);
    try {
      if (record.syncStatus !== 'SYNCED') {
        await discardServiceInvoice(userId, record.id);
      } else {
        if (!idToken) throw new Error('No active session');
        try {
          await deleteConfirmedServiceInvoice(idToken, record.id);
        } catch (error) {
          if (isNetworkError(error)) {
            await queueInvoiceDeletion(userId, record.id);
            if (isMounted.current) setQueuedOffline(true);
          } else if (!(error instanceof ApiError && error.status === 404)) {
            throw error;
          }
        }
      }
    } catch {
      isDeletingRef.current = false;
      if (isMounted.current) {
        setFailed(true);
        setStep('confirming');
      }
      return;
    }
    isDeletingRef.current = false;
    notifyOfflineServiceInvoicesChanged();
    if (isMounted.current) setStep('done');
  }, [record, userId, idToken]);

  const acknowledge = useCallback(() => {
    setStep('idle');
    onDeleted();
  }, [onDeleted]);

  return { step, failed, queuedOffline, request, cancel, confirm, acknowledge };
}
