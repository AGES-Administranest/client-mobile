import { useCallback, useEffect, useState } from 'react';

import { useAuth } from 'features/auth';

import type { DraftSummary } from '../domain/draft';
import { discardEntry, listDrafts } from '../services/stockEntryService';

export type EntriesState = {
  drafts: DraftSummary[];
  status: 'loading' | 'ready' | 'failed';
  refresh: () => void;
  discard: (id: string) => void;
  discardFailed: boolean;
  dismissDiscardFailure: () => void;
};

/** The pending entries. A refresh keeps the last list on screen meanwhile. */
export function useEntries(): EntriesState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [status, setStatus] = useState<EntriesState['status']>('loading');
  const [discardFailed, setDiscardFailed] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!idToken) return;
    let isCurrent = true;
    listDrafts(idToken)
      .then(found => {
        if (!isCurrent) return;
        setDrafts(found);
        setStatus('ready');
      })
      .catch(() => {
        if (isCurrent) setStatus('failed');
      });
    return () => {
      isCurrent = false;
    };
  }, [idToken, version]);

  const refresh = useCallback(() => setVersion(current => current + 1), []);

  const discard = useCallback(
    (id: string) => {
      if (!idToken) return;
      discardEntry(idToken, id)
        .then(refresh)
        .catch(() => setDiscardFailed(true));
    },
    [idToken, refresh],
  );

  return {
    drafts,
    status,
    refresh,
    discard,
    discardFailed,
    dismissDiscardFailure: useCallback(() => setDiscardFailed(false), []),
  };
}
