import { useEffect, useState } from 'react';

import { useAuth } from 'features/auth';

import type { ReportHistoryItem } from '../domain/report.types';
import { fetchReportHistory } from '../services/reportHistoryService';

export function useReportHistory(): ReportHistoryItem[] {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [items, setItems] = useState<ReportHistoryItem[]>([]);

  useEffect(() => {
    if (!idToken) {
      return;
    }

    let isMounted = true;

    fetchReportHistory(idToken)
      .then(history => isMounted && setItems(history))
      .catch(() => isMounted && setItems([]));

    return () => {
      isMounted = false;
    };
  }, [idToken]);

  return items;
}
