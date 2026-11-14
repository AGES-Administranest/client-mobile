import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import { NetworkError } from 'shared/api';
import { isOnline } from 'shared/services';

import { hasReportRecords } from '../domain/reportAvailability';
import type { ReportPeriod } from '../domain/reportPeriod';
import { fetchReportAvailability } from '../services/reportAvailabilityService';

export type ReportAvailabilityNotice = 'offline' | 'empty' | 'failed';

export type ReportAvailabilityState = {
  isChecking: boolean;
  notice: ReportAvailabilityNotice | null;
  dismissNotice: () => void;
  /** Resolves `true` only when the period can go on to be generated or exported. */
  ensureRecords: (period: ReportPeriod) => Promise<boolean>;
};

// A timeout (RequestTimeoutError) is a TypeError, like a fetch with no answer.
function isConnectionFailure(error: unknown): boolean {
  return error instanceof NetworkError || error instanceof TypeError;
}

export function useReportAvailability(): ReportAvailabilityState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [isChecking, setIsChecking] = useState(false);
  const [notice, setNotice] = useState<ReportAvailabilityNotice | null>(null);
  const isMounted = useRef(true);
  const isBusy = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const dismissNotice = useCallback(() => setNotice(null), []);

  const ensureRecords = useCallback(
    async (period: ReportPeriod) => {
      if (isBusy.current || !idToken) {
        return false;
      }

      isBusy.current = true;
      setNotice(null);
      setIsChecking(true);

      let outcome: ReportAvailabilityNotice | null;
      try {
        // ADR-04: reports are made by the backend, so there is no offline way.
        if (!(await isOnline())) {
          outcome = 'offline';
        } else {
          const availability = await fetchReportAvailability(idToken, period);
          outcome = hasReportRecords(availability) ? null : 'empty';
        }
      } catch (error) {
        outcome = isConnectionFailure(error) ? 'offline' : 'failed';
      } finally {
        isBusy.current = false;
      }

      if (isMounted.current) {
        setNotice(outcome);
        setIsChecking(false);
      }

      return outcome === null;
    },
    [idToken],
  );

  return { isChecking, notice, dismissNotice, ensureRecords };
}
