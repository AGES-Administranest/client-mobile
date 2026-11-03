import { useCallback, useEffect, useState } from 'react';

import { useAuth } from 'features/auth';
import type { MonthPeriod } from 'shared/utils/monthPeriod';

import type { HourlyRate } from '../domain/hourlyRate';
import { pricingService } from '../services/pricingService';

export type HourlyRateState =
  | { status: 'loading' }
  | { status: 'unconfigured' }
  | { status: 'ready'; hourlyRate: HourlyRate; isRefreshing: boolean }
  | { status: 'error' };

export type UseHourlyRate = {
  state: HourlyRateState;
  // Called after the goals (US19) or the transport cost (US18) are saved, so
  // the rate is recalculated without leaving the screen.
  reload: () => void;
};

export function useHourlyRate(month: MonthPeriod): UseHourlyRate {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [state, setState] = useState<HourlyRateState>({ status: 'loading' });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion(current => current + 1), []);

  useEffect(() => {
    if (!idToken) {
      setState({ status: 'error' });
      return;
    }

    let isMounted = true;
    // The result of the previous month stays on screen while the next one
    // loads, so the goals being typed below it are not unmounted.
    setState(current =>
      current.status === 'ready'
        ? { ...current, isRefreshing: true }
        : { status: 'loading' },
    );

    pricingService
      .getHourlyRate(idToken, { month: month.month, year: month.year })
      .then(hourlyRate => {
        if (!isMounted) return;
        setState(
          hourlyRate
            ? { status: 'ready', hourlyRate, isRefreshing: false }
            : { status: 'unconfigured' },
        );
      })
      .catch(() => {
        if (isMounted) setState({ status: 'error' });
      });

    return () => {
      isMounted = false;
    };
  }, [idToken, month.month, month.year, version]);

  return { state, reload };
}
