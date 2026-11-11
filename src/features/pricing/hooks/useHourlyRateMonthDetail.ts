import { useCallback, useEffect, useState } from 'react';

import { useAuth } from 'features/auth';
import type { MonthPeriod } from 'shared/utils/monthPeriod';

import type { HourlyRate } from '../domain/hourlyRate';
import { pricingService } from '../services/pricingService';

export type HourlyRateMonthDetailState =
  | { status: 'loading' }
  | { status: 'error' }
  // The month has no stored calculation: not a failure, retrying won't help.
  | { status: 'notFound' }
  | { status: 'ready'; hourlyRate: HourlyRate };

export type UseHourlyRateMonthDetail = {
  state: HourlyRateMonthDetailState;
  reload: () => void;
};

// Read-only on purpose: it only reads the stored month and knows nothing of
// the current goals, so opening a month cannot change them.
export function useHourlyRateMonthDetail({
  month,
  year,
}: MonthPeriod): UseHourlyRateMonthDetail {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [state, setState] = useState<HourlyRateMonthDetailState>({
    status: 'loading',
  });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion(current => current + 1), []);

  useEffect(() => {
    if (!idToken) {
      setState({ status: 'error' });
      return;
    }

    let isMounted = true;
    setState({ status: 'loading' });

    pricingService
      .getHourlyRateHistoryMonth(idToken, { month, year })
      .then(hourlyRate => {
        if (!isMounted) return;
        setState(
          hourlyRate ? { status: 'ready', hourlyRate } : { status: 'notFound' },
        );
      })
      .catch(() => {
        if (isMounted) setState({ status: 'error' });
      });

    return () => {
      isMounted = false;
    };
  }, [idToken, month, year, version]);

  return { state, reload };
}
