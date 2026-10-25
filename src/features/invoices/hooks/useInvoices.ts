import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from 'features/auth';

import type { Invoice } from '../domain/invoice.types';
import {
  toInvoiceQuery,
  type InvoiceFilters,
  type InvoiceQuery,
} from '../domain/invoiceFilters';
import { fetchInvoices } from '../services/invoiceService';

const SEARCH_DEBOUNCE_MS = 300;
const FIRST_PAGE = 1;

export type InvoicesState = {
  invoices: Invoice[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  hasError: boolean;
  loadMoreFailed: boolean;
  loadMore: () => void;
  retry: () => void;
};

export function useInvoices(
  filters: InvoiceFilters,
  searchDebounceMs: number = SEARCH_DEBOUNCE_MS,
): InvoicesState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  const nextPage = useRef(FIRST_PAGE + 1);
  const isFetchingMore = useRef(false);
  const generation = useRef(0);

  useEffect(() => {
    if (filters.search === debouncedSearch) {
      return;
    }

    const timer = setTimeout(
      () => setDebouncedSearch(filters.search),
      searchDebounceMs,
    );

    return () => clearTimeout(timer);
  }, [filters.search, debouncedSearch, searchDebounceMs]);

  // Keyed by what is actually sent, so typing a first letter, which sends
  // nothing new, does not reload the list.
  const queryKey = JSON.stringify(
    toInvoiceQuery({ search: debouncedSearch, range: filters.range }),
  );
  const query = useMemo(() => JSON.parse(queryKey) as InvoiceQuery, [queryKey]);

  useEffect(() => {
    if (!idToken) {
      return;
    }

    const current = generation.current;

    nextPage.current = FIRST_PAGE + 1;
    isFetchingMore.current = false;
    setIsLoading(true);
    setIsLoadingMore(false);
    setHasError(false);
    setLoadMoreFailed(false);

    fetchInvoices(idToken, query, FIRST_PAGE)
      .then(page => {
        if (current !== generation.current) return;
        setInvoices(page.items);
        setHasMore(page.hasMore);
      })
      .catch(() => {
        if (current !== generation.current) return;
        setInvoices([]);
        setHasMore(false);
        setHasError(true);
      })
      .finally(() => {
        if (current !== generation.current) return;
        setIsLoading(false);
      });

    // A response that arrives after the filters changed or the screen closed
    // would put the old list over the new one.
    return () => {
      generation.current += 1;
    };
  }, [idToken, query, attempt]);

  const loadMore = useCallback(() => {
    if (!idToken || isLoading || !hasMore || isFetchingMore.current) {
      return;
    }

    const current = generation.current;

    isFetchingMore.current = true;
    setIsLoadingMore(true);
    setLoadMoreFailed(false);

    fetchInvoices(idToken, query, nextPage.current)
      .then(page => {
        if (current !== generation.current) return;
        nextPage.current += 1;
        setInvoices(known => {
          const knownIds = new Set(known.map(invoice => invoice.id));

          return [
            ...known,
            ...page.items.filter(invoice => !knownIds.has(invoice.id)),
          ];
        });
        setHasMore(page.hasMore);
      })
      .catch(() => {
        if (current !== generation.current) return;
        setLoadMoreFailed(true);
      })
      .finally(() => {
        if (current !== generation.current) return;
        isFetchingMore.current = false;
        setIsLoadingMore(false);
      });
  }, [idToken, isLoading, hasMore, query]);

  const retry = useCallback(() => setAttempt(count => count + 1), []);

  return {
    invoices,
    isLoading,
    isLoadingMore,
    hasMore,
    hasError,
    loadMoreFailed,
    loadMore,
    retry,
  };
}
