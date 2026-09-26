import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import { fetchClients } from 'features/clients';
import {
  EMPTY_CALENDAR_RANGE,
  type CalendarRange,
} from 'shared/utils/calendar';

import {
  APPOINTMENTS_PAGE_SIZE,
  appendPage,
  hasMorePages,
} from '../domain/appointmentPagination';
import {
  hasActivePeriod,
  toAppointmentPeriod,
} from '../domain/appointmentPeriod';
import type {
  AppointmentResult,
  ProcedureHistoryItem,
} from '../domain/procedure.types';
import {
  buildClientNames,
  toHistoryItems,
  type ClientNames,
} from '../domain/procedureHistory';
import { fetchAppointments } from '../services/procedureService';

export type DiaDiaState = {
  range: CalendarRange;
  items: ProcedureHistoryItem[];
  isFiltering: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasError: boolean;
  setRange: (range: CalendarRange) => void;
  clearRange: () => void;
  loadMore: () => void;
  retry: () => void;
  refresh: () => void;
};

const NO_CLIENT_NAMES: ClientNames = new Map();

export function useDiaDia(): DiaDiaState {
  const { session } = useAuth();
  const [range, setRange] = useState<CalendarRange>(EMPTY_CALENDAR_RANGE);
  const [appointments, setAppointments] = useState<AppointmentResult[]>([]);
  const [clientNames, setClientNames] = useState<ClientNames>(NO_CLIENT_NAMES);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  const loadingMoreInFlight = useRef(false);

  const idToken = session?.idToken ?? null;
  const period = useMemo(() => toAppointmentPeriod(range), [range]);

  useEffect(() => {
    if (!idToken) {
      return;
    }

    let isMounted = true;
    loadingMoreInFlight.current = false;
    setIsLoading(true);
    setIsLoadingMore(false);
    setHasError(false);
    setAppointments([]);
    setPage(1);
    setHasMore(false);

    fetchAppointments(idToken, {
      status: 'COMPLETED',
      page: 1,
      pageSize: APPOINTMENTS_PAGE_SIZE,
      ...period,
    })
      .then(list => {
        if (isMounted) {
          setAppointments(list);
          setHasMore(hasMorePages(list.length, APPOINTMENTS_PAGE_SIZE));
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      generation.current += 1;
    };
  }, [idToken, period, attempt]);

  useEffect(() => {
    if (!idToken) {
      return;
    }

    let isMounted = true;

    fetchClients(idToken)
      .then(clients => {
        if (isMounted) {
          setClientNames(buildClientNames(clients));
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [idToken, attempt]);

  const requestNextPage = useCallback(() => {
    if (!idToken || loadingMoreInFlight.current) {
      return;
    }

    loadingMoreInFlight.current = true;
    setIsLoadingMore(true);
    setHasError(false);
    const startedIn = generation.current;
    const nextPage = page + 1;

    fetchAppointments(idToken, {
      status: 'COMPLETED',
      page: nextPage,
      pageSize: APPOINTMENTS_PAGE_SIZE,
      ...period,
    })
      .then(list => {
        if (startedIn === generation.current) {
          setAppointments(current => appendPage(current, list));
          setPage(nextPage);
          setHasMore(hasMorePages(list.length, APPOINTMENTS_PAGE_SIZE));
        }
      })
      .catch(() => {
        if (startedIn === generation.current) {
          setHasError(true);
        }
      })
      .finally(() => {
        if (startedIn === generation.current) {
          loadingMoreInFlight.current = false;
          setIsLoadingMore(false);
        }
      });
  }, [idToken, page, period]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading || hasError) {
      return;
    }
    requestNextPage();
  }, [hasMore, isLoading, hasError, requestNextPage]);

  const refresh = useCallback(() => setAttempt(current => current + 1), []);

  const retry = useCallback(() => {
    if (appointments.length === 0) {
      refresh();
      return;
    }
    requestNextPage();
  }, [appointments.length, refresh, requestNextPage]);

  const clearRange = useCallback(() => setRange(EMPTY_CALENDAR_RANGE), []);

  const items = useMemo(
    () => toHistoryItems(appointments, clientNames),
    [appointments, clientNames],
  );

  return {
    range,
    items,
    isFiltering: hasActivePeriod(range),
    isLoading,
    isLoadingMore,
    hasError,
    setRange,
    clearRange,
    loadMore,
    retry,
    refresh,
  };
}
