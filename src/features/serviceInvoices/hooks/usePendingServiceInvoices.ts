import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';

import {
  countPending,
  firstRejection,
  firstUnseenRejection,
  type PendingCounts,
  type PendingServiceInvoice,
} from '../domain/offlineServiceInvoices';
import {
  acknowledgeServiceInvoiceRejection,
  discardServiceInvoice,
  loadServiceInvoiceOutbox,
  resendAllowingDuplicate,
  subscribeOfflineServiceInvoices,
} from '../services/offlineServiceInvoiceStore';

export type PendingServiceInvoicesState = {
  counts: PendingCounts;
  /** The refused note on display: the first one unseen, or the one reopened. */
  rejection: PendingServiceInvoice | null;
  /** The queue or a change to it could not be read or saved. */
  loadFailed: boolean;
  /** A note was discarded but its PDF is still on the device. */
  discardLeftFile: boolean;
  reopenRejection: () => void;
  keepRejection: () => void;
  discardRejection: () => void;
  /** Sends a note refused as similar to another one, accepting that it is. */
  sendRejectionAnyway: () => void;
  dismissDiscardNotice: () => void;
};

const NOTHING_PENDING: PendingCounts = { waiting: 0, rejected: 0 };

/** What the person sees of the notes typed without a connection, and what they can do with a refused one. */
export function usePendingServiceInvoices(): PendingServiceInvoicesState {
  const { account } = useAuth();
  const userId = account?.id ?? null;
  const [queue, setQueue] = useState<PendingServiceInvoice[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [discardLeftFile, setDiscardLeftFile] = useState(false);
  const [reopened, setReopened] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const reportFailure = useCallback(() => {
    if (isMounted.current) setLoadFailed(true);
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const loaded = await loadServiceInvoiceOutbox(userId);
      if (!isMounted.current) return;
      setQueue(loaded);
      setLoadFailed(false);
    } catch {
      reportFailure();
    }
  }, [userId, reportFailure]);

  useEffect(() => {
    if (!userId) {
      setQueue([]);
      return;
    }
    refresh();
    return subscribeOfflineServiceInvoices(() => {
      refresh();
    });
  }, [userId, refresh]);

  // The reopened note is the first refused one, seen or not; without it, only
  // a refusal nobody has seen yet is on display.
  const rejection = reopened
    ? firstRejection(queue)
    : firstUnseenRejection(queue);

  const keepRejection = useCallback(() => {
    setReopened(false);
    if (!rejection || !userId || rejection.rejection?.acknowledged) return;
    acknowledgeServiceInvoiceRejection(userId, rejection.id).catch(
      reportFailure,
    );
  }, [rejection, userId, reportFailure]);

  const discardRejection = useCallback(async () => {
    setReopened(false);
    if (!rejection || !userId) return;
    try {
      const { pdfRemoved } = await discardServiceInvoice(userId, rejection.id);
      if (isMounted.current) setDiscardLeftFile(!pdfRemoved);
    } catch {
      reportFailure();
    }
  }, [rejection, userId, reportFailure]);

  const sendRejectionAnyway = useCallback(() => {
    setReopened(false);
    if (!rejection || !userId) return;
    resendAllowingDuplicate(userId, rejection.id).catch(reportFailure);
  }, [rejection, userId, reportFailure]);

  return {
    counts: queue.length > 0 ? countPending(queue) : NOTHING_PENDING,
    rejection,
    loadFailed,
    discardLeftFile,
    reopenRejection: useCallback(() => setReopened(true), []),
    keepRejection,
    discardRejection,
    sendRejectionAnyway,
    dismissDiscardNotice: useCallback(() => setDiscardLeftFile(false), []),
  };
}
