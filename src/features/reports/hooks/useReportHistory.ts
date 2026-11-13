import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';

import type { ReportHistoryItem } from '../domain/report.types';
import { mergeReportPages } from '../domain/reportHistory';
import { findLocalReport } from '../services/reportFileStore';
import { fetchReportHistory } from '../services/reportHistoryService';

const FIRST_PAGE = 1;

export type ReportHistoryState = {
  reports: ReportHistoryItem[];
  downloadedIds: ReadonlySet<string>;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  hasError: boolean;
  loadMoreFailed: boolean;
  loadMore: () => void;
  retry: () => void;
};

export function useReportHistory(): ReportHistoryState {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;
  const [reports, setReports] = useState<ReportHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [downloadedIds, setDownloadedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const nextPage = useRef(FIRST_PAGE + 1);
  const isFetchingMore = useRef(false);
  const generation = useRef(0);

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

    fetchReportHistory(idToken, FIRST_PAGE)
      .then(page => {
        if (current !== generation.current) return;
        setReports(mergeReportPages([], page.items));
        setHasMore(page.hasMore);
      })
      .catch(() => {
        if (current !== generation.current) return;
        setReports([]);
        setHasMore(false);
        setHasError(true);
      })
      .finally(() => {
        if (current !== generation.current) return;
        setIsLoading(false);
      });

    // A response that arrives after a retry or after the screen closed would
    // put the old list over the new one.
    return () => {
      generation.current += 1;
    };
  }, [idToken, attempt]);

  const loadMore = useCallback(() => {
    if (!idToken || isLoading || !hasMore || isFetchingMore.current) {
      return;
    }

    const current = generation.current;

    isFetchingMore.current = true;
    setIsLoadingMore(true);
    setLoadMoreFailed(false);

    fetchReportHistory(idToken, nextPage.current)
      .then(page => {
        if (current !== generation.current) return;
        nextPage.current += 1;
        setReports(known => mergeReportPages(known, page.items));
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
  }, [idToken, isLoading, hasMore]);

  useEffect(() => {
    const ids = new Set<string>();

    if (userId) {
      for (const report of reports) {
        if (findLocalReport(userId, report)) {
          ids.add(report.id);
        }
      }
    }

    setDownloadedIds(ids);
  }, [reports, userId]);

  const retry = useCallback(() => setAttempt(count => count + 1), []);

  return {
    reports,
    downloadedIds,
    isLoading,
    isLoadingMore,
    hasMore,
    hasError,
    loadMoreFailed,
    loadMore,
    retry,
  };
}
