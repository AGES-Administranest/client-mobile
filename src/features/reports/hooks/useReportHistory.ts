import { useCallback, useEffect, useState } from 'react';

import { useAuth } from 'features/auth';
import { NetworkError } from 'shared/api';
import { RequestTimeoutError } from 'shared/services/apiClient';

import type { ReportCategory, ReportHistoryItem } from '../domain/report.types';
import {
  fetchReportHistory,
  generateReport,
  shareReport,
  type GenerateReportInput,
} from '../services/reportHistoryService';
import {
  loadLastSelection,
  saveLastSelection,
} from '../services/reportSelectionStore';

/** Why a report could not be generated, for the screen to say so. */
export type GenerateFailure = 'offline' | 'failed';

export type GenerateResult =
  | { ok: true }
  | { ok: false; reason: GenerateFailure };

export type ReportHistoryState = {
  items: ReportHistoryItem[];
  isGenerating: boolean;
  /** The sections of the last report generated; every one before the first. */
  lastSelection: ReportCategory[];
  generate: (input: GenerateReportInput) => Promise<GenerateResult>;
  share: (report: ReportHistoryItem) => Promise<boolean>;
};

function failureOf(error: unknown): GenerateFailure {
  // The PDF is made on the server (ADR-04): without a connection there is
  // nothing to generate, and the screen says that instead of "try again".
  return error instanceof NetworkError || error instanceof RequestTimeoutError
    ? 'offline'
    : 'failed';
}

export function useReportHistory(): ReportHistoryState {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;
  const [items, setItems] = useState<ReportHistoryItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastSelection, setLastSelection] = useState<ReportCategory[]>([]);

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

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isMounted = true;

    loadLastSelection(userId).then(
      selection => isMounted && setLastSelection(selection),
    );

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const generate = useCallback(
    async (input: GenerateReportInput): Promise<GenerateResult> => {
      if (!idToken) {
        return { ok: false, reason: 'failed' };
      }

      setIsGenerating(true);

      try {
        const report = await generateReport(idToken, input);
        setItems(current => [report, ...current]);
        setLastSelection([...input.categories]);
        if (userId) {
          await saveLastSelection(userId, input.categories);
        }
        return { ok: true };
      } catch (error) {
        return { ok: false, reason: failureOf(error) };
      } finally {
        setIsGenerating(false);
      }
    },
    [idToken, userId],
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

  return { items, isGenerating, lastSelection, generate, share };
}
