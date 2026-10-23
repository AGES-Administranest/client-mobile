import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from 'features/auth';

import type { QueryTripParams, Trip } from '../domain/trip.types';
import {
  loadTripCache,
  loadTripsWithOffline,
  saveTripCache,
  subscribeOfflineTrips,
} from '../services/offlineTripStore';
import { tripService } from '../services/tripService';

export type TripGroup = {
  date: string;
  formattedDate: string;
  trips: Trip[];
};

export type UseTripsOptions = {
  from?: string;
  to?: string;
  appointmentId?: string;
  clientId?: string;
  token?: string;
  pageSize?: number;
  autoFetch?: boolean;
  locale?: string;
};

export function useTrips(options: UseTripsOptions = {}) {
  const {
    from,
    to,
    appointmentId,
    clientId,
    token: propToken,
    pageSize = 20,
    autoFetch = true,
    locale = 'pt-BR',
  } = options;

  let sessionToken: string | undefined;
  let currentUserId: string | null = null;
  try {
    const auth = useAuth();
    sessionToken = auth.session?.idToken;
    currentUserId = auth.account?.id ?? null;
  } catch {
    sessionToken = undefined;
  }
  const token = propToken ?? sessionToken ?? '';
  const userId = currentUserId ?? 'anonymous';

  const [trips, setTrips] = useState<Trip[]>([]);
  const [totalKm, setTotalKm] = useState('0.00');
  const [totalCost, setTotalCost] = useState('0.00');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const isFetchingRef = useRef(false);

  const fetchPage = useCallback(
    async (
      targetPage: number,
      isLoadMore = false,
    ): Promise<Trip[]> => {
      if (isFetchingRef.current) return [];
      isFetchingRef.current = true;

      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const params: QueryTripParams = {
          from,
          to,
          appointmentId,
          clientId,
          page: targetPage,
          pageSize,
        };

        let serverItems: Trip[] = [];
        let serverTotalKm = '0.00';
        let serverTotalCost = '0.00';
        let totalCount = 0;

        if (token) {
          try {
            const response = await tripService.list(token, params);
            serverItems = response.items;
            serverTotalKm = response.totalKm;
            serverTotalCost = response.totalCost;
            totalCount = response.total;

            if (targetPage === 1 && !appointmentId && !clientId) {
              await saveTripCache(userId, serverItems);
            }
          } catch {
            // If offline, load from cache
            const cached = await loadTripCache(userId);
            serverItems = cached;
          }
        } else {
          serverItems = await loadTripCache(userId);
        }

        // Merge with offline outbox
        const allItemsWithOffline = await loadTripsWithOffline(
          userId,
          serverItems,
        );

        // Filter in-memory if query params present and offline fallback
        let filtered = allItemsWithOffline;
        if (from) {
          filtered = filtered.filter(t => t.occurredOn >= from);
        }
        if (to) {
          filtered = filtered.filter(t => t.occurredOn <= to);
        }
        if (appointmentId) {
          filtered = filtered.filter(t => t.appointmentId === appointmentId);
        }
        if (clientId) {
          filtered = filtered.filter(t => t.clientId === clientId);
        }

        // Sort latest day first
        filtered.sort((a, b) => b.occurredOn.localeCompare(a.occurredOn));

        if (isLoadMore) {
          setTrips(prev => {
            const known = new Set(prev.map(p => p.id));
            const newItems = filtered.filter(f => !known.has(f.id));
            return [...prev, ...newItems];
          });
        } else {
          setTrips(filtered);
        }

        setPage(targetPage);
        setHasMore(
          totalCount > targetPage * pageSize ||
            serverItems.length === pageSize,
        );

        // Recalculate totals if offline or not returned
        if (
          serverTotalKm === '0.00' &&
          serverTotalCost === '0.00' &&
          filtered.length > 0
        ) {
          let sumKm = 0;
          let sumCost = 0;
          for (const item of filtered) {
            if (item.distanceKm != null) {
              sumKm += parseFloat(String(item.distanceKm)) || 0;
            }
            if (item.cost != null) {
              sumCost += parseFloat(String(item.cost)) || 0;
            }
          }
          setTotalKm(sumKm.toFixed(2));
          setTotalCost(sumCost.toFixed(2));
        } else {
          setTotalKm(serverTotalKm);
          setTotalCost(serverTotalCost);
        }

        return filtered;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        return [];
      } finally {
        isFetchingRef.current = false;
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [from, to, appointmentId, clientId, pageSize, token, userId],
  );

  const refetch = useCallback(() => fetchPage(1, false), [fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading || isLoadingMore) return;
    fetchPage(page + 1, true);
  }, [hasMore, isLoading, isLoadingMore, page, fetchPage]);

  useEffect(() => {
    if (autoFetch) {
      refetch().catch(() => {});
    }
  }, [autoFetch, refetch]);

  // Subscribe to offline changes
  useEffect(() => {
    const unsubscribe = subscribeOfflineTrips(() => {
      refetch().catch(() => {});
    });
    return unsubscribe;
  }, [refetch]);

  // Group trips by date
  const groupedTrips = useMemo<TripGroup[]>(() => {
    const groupsMap = new Map<string, Trip[]>();

    for (const trip of trips) {
      const list = groupsMap.get(trip.occurredOn) ?? [];
      list.push(trip);
      groupsMap.set(trip.occurredOn, list);
    }

    const result: TripGroup[] = [];
    for (const [date, items] of groupsMap.entries()) {
      let formattedDate = date;
      try {
        const [year, month, day] = date.split('-').map(Number);
        const d = new Date(year, month - 1, day);
        const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' })
          .format(d)
          .replace('.', '');
        const monthShort = new Intl.DateTimeFormat(locale, { month: 'short' })
          .format(d)
          .replace('.', '');
        formattedDate = `${weekday.toUpperCase()}, ${day} ${monthShort.toUpperCase()}`;
      } catch {
        // Fallback
      }

      result.push({
        date,
        formattedDate,
        trips: items,
      });
    }

    return result;
  }, [trips, locale]);

  return {
    trips,
    groupedTrips,
    totalKm,
    totalCost,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    refetch,
    loadMore,
  };
}
