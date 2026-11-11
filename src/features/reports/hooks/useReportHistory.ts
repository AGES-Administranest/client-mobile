import { useCallback, useEffect, useState } from 'react';

import { useAuth } from 'features/auth';

import type { ReportHistoryItem } from '../domain/report.types';
import {
  fetchReportHistory,
  generateReport,
  shareReport,
  type GenerateReportInput,
} from '../services/reportHistoryService';

export type ReportHistoryState = {
  items: ReportHistoryItem[];
  isGenerating: boolean;
  generate: (input: GenerateReportInput) => Promise<boolean>;
  share: (report: ReportHistoryItem) => Promise<boolean>;
};

export function useReportHistory(): ReportHistoryState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [items, setItems] = useState<ReportHistoryItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

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

  const generate = useCallback(
    async (input: GenerateReportInput) => {
      if (!idToken) {
        return false;
      }

      setIsGenerating(true);

      try {
        const report = await generateReport(idToken, input);
        setItems(current => [report, ...current]);
        return true;
      } catch {
        return false;
      } finally {
        setIsGenerating(false);
      }
    },
    [idToken],
  );

  const share = useCallback(async (report: ReportHistoryItem) => {
    if (!report.fileUri) {
      return false;
    }

    try {
      return await shareReport(report.fileUri);
    } catch {
      return false;
    }
  }, []);

  return { items, isGenerating, generate, share };
}
