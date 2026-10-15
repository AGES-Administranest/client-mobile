import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import type { TranslationKey } from 'shared/i18n';

import { requireToken, toStatementFailureKey } from './entryFailure';
import type { FinancialEntry } from '../domain/financialEntry';
import {
  appendStatementPage,
  isLastStatementPage,
  type StatementFilters,
} from '../domain/statement';
import { fetchFinancialEntries } from '../services/financialEntryService';

export type StatementStatus = 'loading' | 'ready' | 'failed';

export type FinancialStatementState = {
  entries: FinancialEntry[];
  status: StatementStatus;
  failure: TranslationKey | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMoreFailed: boolean;
  loadMore: () => void;
  retryLoadMore: () => void;
  reload: () => void;
};

export function useFinancialStatement(
  filters: StatementFilters,
): FinancialStatementState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const { month, year } = filters.period;
  const { scope } = filters;
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [status, setStatus] = useState<StatementStatus>('loading');
  const [failure, setFailure] = useState<TranslationKey | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const [version, setVersion] = useState(0);
  const loadedPages = useRef(0);
  // Cada troca de filtro começa uma nova geração: a resposta de um pedido da
  // geração anterior não pode entrar na lista atual.
  const generation = useRef(0);
  const isFetchingMore = useRef(false);
  // Sem isso, depois de uma falha cada evento de rolagem mandaria outro pedido
  // que também falharia: a próxima página só volta a ser pedida no "Tentar
  // novamente" ou numa nova busca.
  const nextPageFailed = useRef(false);

  useEffect(() => {
    generation.current += 1;
    const current = generation.current;
    isFetchingMore.current = false;
    nextPageFailed.current = false;
    setLoadMoreFailed(false);
    setStatus('loading');
    setFailure(null);
    setIsLoadingMore(false);

    Promise.resolve()
      .then(() =>
        fetchFinancialEntries(
          requireToken(idToken),
          { period: { month, year }, scope },
          1,
        ),
      )
      .then(page => {
        if (current !== generation.current) return;
        loadedPages.current = 1;
        setEntries(page);
        setHasMore(!isLastStatementPage(page));
        setStatus('ready');
      })
      .catch(error => {
        if (current !== generation.current) return;
        setEntries([]);
        setHasMore(false);
        setStatus('failed');
        setFailure(toStatementFailureKey(error));
      });

    return () => {
      generation.current += 1;
    };
  }, [idToken, month, year, scope, version]);

  const loadMore = useCallback(() => {
    if (
      status !== 'ready' ||
      !hasMore ||
      isFetchingMore.current ||
      nextPageFailed.current
    ) {
      return;
    }
    const current = generation.current;
    const nextPage = loadedPages.current + 1;
    isFetchingMore.current = true;
    setIsLoadingMore(true);

    Promise.resolve()
      .then(() =>
        fetchFinancialEntries(
          requireToken(idToken),
          { period: { month, year }, scope },
          nextPage,
        ),
      )
      .then(page => {
        if (current !== generation.current) return;
        loadedPages.current = nextPage;
        setEntries(known => appendStatementPage(known, page));
        setHasMore(!isLastStatementPage(page));
      })
      .catch(() => {
        if (current !== generation.current) return;
        nextPageFailed.current = true;
        setLoadMoreFailed(true);
      })
      .finally(() => {
        if (current !== generation.current) return;
        isFetchingMore.current = false;
        setIsLoadingMore(false);
      });
  }, [status, hasMore, idToken, month, year, scope]);

  const retryLoadMore = useCallback(() => {
    nextPageFailed.current = false;
    setLoadMoreFailed(false);
    loadMore();
  }, [loadMore]);

  const reload = useCallback(() => setVersion(v => v + 1), []);

  return {
    entries,
    status,
    failure,
    hasMore,
    isLoadingMore,
    loadMoreFailed,
    loadMore,
    retryLoadMore,
    reload,
  };
}
