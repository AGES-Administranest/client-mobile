import { useCallback, useEffect, useState } from 'react';

import { useAuth } from 'features/auth';

import {
  buildHistoryRows,
  type HourlyRateHistoryRow,
} from '../domain/hourlyRateHistory';
import { pricingService } from '../services/pricingService';

export type HourlyRateHistoryState =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'ready';
      rows: HourlyRateHistoryRow[];
      // From the newest month's detail. `null` when that call fails: the
      // list is still worth showing without the margin chip.
      safetyMarginPct: number | null;
    };

export type UseHourlyRateHistory = {
  state: HourlyRateHistoryState;
  reload: () => void;
};

async function fetchLatestMargin(
  idToken: string,
  rows: HourlyRateHistoryRow[],
): Promise<number | null> {
  if (rows.length === 0) return null;

  try {
    const latest = await pricingService.getHourlyRateHistoryMonth(
      idToken,
      rows[0].rate.month,
    );
    return latest?.settings.safetyMarginPct ?? null;
  } catch {
    return null;
  }
}

export function useHourlyRateHistory(): UseHourlyRateHistory {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [state, setState] = useState<HourlyRateHistoryState>({
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
      .getHourlyRateHistory(idToken)
      .then(async history => {
        const rows = buildHistoryRows(history);
        const safetyMarginPct = await fetchLatestMargin(idToken, rows);
        if (isMounted) setState({ status: 'ready', rows, safetyMarginPct });
      })
      .catch(() => {
        if (isMounted) setState({ status: 'error' });
      });

    return () => {
      isMounted = false;
    };
  }, [idToken, version]);

  return { state, reload };
}
