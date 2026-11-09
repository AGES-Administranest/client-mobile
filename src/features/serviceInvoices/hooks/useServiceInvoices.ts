import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import { useClientNames } from 'features/clients';
import { isNetworkError } from 'shared/utils/network';

import type { PendingServiceInvoice } from '../domain/offlineServiceInvoices';
import { mergeInvoiceSources } from '../domain/pendingSummary';
import {
  filterInvoices,
  mergeInvoiceCache,
  sortByIssueDateDesc,
} from '../domain/serviceInvoiceList';
import type { ServiceInvoiceSummary } from '../domain/serviceInvoiceRecord.types';
import {
  loadPendingInvoiceDeletions,
  loadServiceInvoiceCache,
  loadServiceInvoiceOutbox,
  saveServiceInvoiceCache,
  subscribeOfflineServiceInvoices,
} from '../services/offlineServiceInvoiceStore';
import { fetchServiceInvoices } from '../services/serviceInvoiceRecordService';

export type ServiceInvoicesStatus = 'loading' | 'ready' | 'error';

type UseServiceInvoicesOptions = {
  pageSize: number;
  search?: string;
};

export type ServiceInvoicesState = {
  items: ServiceInvoiceSummary[];
  status: ServiceInvoicesStatus;
  isOffline: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  reload: () => void;
  loadMore: () => void;
};

type LocalChanges = { pending: PendingServiceInvoice[]; deletedIds: string[] };

const NO_LOCAL_CHANGES: LocalChanges = { pending: [], deletedIds: [] };

export function useServiceInvoices({
  pageSize,
  search = '',
}: UseServiceInvoicesOptions): ServiceInvoicesState {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;
  const clientNames = useClientNames();

  const [serverItems, setServerItems] = useState<ServiceInvoiceSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ServiceInvoicesStatus>('loading');
  const [isOffline, setIsOffline] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [local, setLocal] = useState<LocalChanges>(NO_LOCAL_CHANGES);
  const latestRequest = useRef(0);

  const readLocal = useCallback(async () => {
    if (!userId) return;
    try {
      const [pending, deletedIds] = await Promise.all([
        loadServiceInvoiceOutbox(userId),
        loadPendingInvoiceDeletions(userId),
      ]);
      setLocal({ pending, deletedIds });
    } catch {
      setLocal(NO_LOCAL_CHANGES);
    }
  }, [userId]);

  const loadFirstPage = useCallback(async () => {
    if (!idToken || !userId) return;
    const request = ++latestRequest.current;
    const isCurrent = () => request === latestRequest.current;
    try {
      const result = await fetchServiceInvoices(idToken, {
        page: 1,
        pageSize,
        search: search || undefined,
      });
      if (!isCurrent()) return;
      setServerItems(result.items);
      setTotal(result.total);
      setPage(1);
      setIsOffline(false);
      setStatus('ready');
      if (!search) {
        loadServiceInvoiceCache(userId)
          .then(cached =>
            saveServiceInvoiceCache(
              userId,
              mergeInvoiceCache(cached, result.items, result.total),
            ),
          )
          .catch(() => undefined);
      }
    } catch (error) {
      if (!isCurrent()) return;
      const cached = isNetworkError(error)
        ? await loadServiceInvoiceCache(userId).catch(() => [])
        : [];
      if (!isCurrent()) return;
      if (cached.length === 0) {
        setServerItems([]);
        setStatus('error');
        setIsOffline(isNetworkError(error));
        return;
      }
      const matching = filterInvoices(cached, { term: search, status: 'ALL' });
      setServerItems(matching);
      setTotal(matching.length);
      setPage(1);
      setIsOffline(true);
      setStatus('ready');
    }
  }, [idToken, userId, pageSize, search]);

  useEffect(() => {
    setStatus('loading');
    loadFirstPage();
  }, [loadFirstPage]);

  useEffect(() => {
    readLocal();
    return subscribeOfflineServiceInvoices(() => {
      readLocal();
      loadFirstPage();
    });
  }, [readLocal, loadFirstPage]);

  const hasMore = !isOffline && serverItems.length < total;

  const loadMore = useCallback(async () => {
    if (!idToken || !hasMore || isLoadingMore || status !== 'ready') return;
    setIsLoadingMore(true);
    const request = latestRequest.current;
    try {
      const next = await fetchServiceInvoices(idToken, {
        page: page + 1,
        pageSize,
        search: search || undefined,
      });
      if (request !== latestRequest.current) return;
      setServerItems(current => {
        const known = new Set(current.map(invoice => invoice.id));
        return [
          ...current,
          ...next.items.filter(invoice => !known.has(invoice.id)),
        ];
      });
      setTotal(next.total);
      setPage(page + 1);
    } catch {
      setIsOffline(true);
    } finally {
      setIsLoadingMore(false);
    }
  }, [idToken, hasMore, isLoadingMore, status, page, pageSize, search]);

  const items = useMemo(
    () =>
      sortByIssueDateDesc(
        filterInvoices(
          mergeInvoiceSources({
            server: serverItems,
            pending: local.pending,
            deletedIds: local.deletedIds,
            clientNames,
          }),
          { term: search, status: 'ALL' },
        ),
      ),
    [serverItems, local, clientNames, search],
  );

  return {
    items,
    status,
    isOffline,
    isLoadingMore,
    hasMore,
    reload: loadFirstPage,
    loadMore,
  };
}
