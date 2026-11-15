import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import { isOnline } from 'shared/services';
import { isNetworkError } from 'shared/utils/network';

import type { ReportPeriod } from '../domain/report.types';
import { hasReportRecords } from '../domain/reportAvailability';
import { fetchReportAvailability } from '../services/reportAvailabilityService';

export type ReportAvailabilityNotice = 'offline' | 'empty' | 'failed';

export type ReportAvailabilityState = {
  isChecking: boolean;
  notice: ReportAvailabilityNotice | null;
  /** Drops the notice and any check still running: the period changed. */
  reset: () => void;
  /** Resolves `true` only when the period can go on to be generated. */
  ensureRecords: (period: ReportPeriod) => Promise<boolean>;
};

async function checkRecords(
  idToken: string,
  period: ReportPeriod,
): Promise<ReportAvailabilityNotice | null> {
  try {
    // ADR-04: reports are made by the backend, so there is no offline way.
    if (!(await isOnline())) {
      return 'offline';
    }

    const availability = await fetchReportAvailability(idToken, period);
    return hasReportRecords(availability) ? null : 'empty';
  } catch (error) {
    return isNetworkError(error) ? 'offline' : 'failed';
  }
}

export function useReportAvailability(): ReportAvailabilityState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [isChecking, setIsChecking] = useState(false);
  const [notice, setNotice] = useState<ReportAvailabilityNotice | null>(null);
  // The check in progress, null when there is none. An answer that arrives for
  // any other number was asked for a period that is no longer on screen.
  const running = useRef<number | null>(null);
  const lastCheck = useRef(0);

  useEffect(() => {
    return () => {
      running.current = null;
    };
  }, []);

  const reset = useCallback(() => {
    running.current = null;
    setNotice(null);
    setIsChecking(false);
  }, []);

  const ensureRecords = useCallback(
    async (period: ReportPeriod) => {
      if (running.current !== null) {
        return false;
      }
      if (!idToken) {
        setNotice('failed');
        return false;
      }

      lastCheck.current += 1;
      const check = lastCheck.current;
      running.current = check;
      setNotice(null);
      setIsChecking(true);

      const outcome = await checkRecords(idToken, period);
      if (running.current !== check) {
        return false;
      }

      running.current = null;
      setNotice(outcome);
      setIsChecking(false);
      return outcome === null;
    },
    [idToken],
  );

  return { isChecking, notice, reset, ensureRecords };
}
