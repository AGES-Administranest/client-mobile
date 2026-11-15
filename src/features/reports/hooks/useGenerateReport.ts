import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import { ApiError } from 'shared/services/apiClient';
import { isNetworkError } from 'shared/utils/network';

import {
  REPORT_CATEGORIES,
  sectionsOf,
  type GeneratedReport,
  type ReportCategory,
  type ReportHistoryItem,
} from '../domain/report.types';
import {
  createReport,
  ReportDownloadError,
  saveReport,
  type GenerateReportInput,
} from '../services/reportHistoryService';
import {
  loadLastSelection,
  saveLastSelection,
} from '../services/reportSelectionStore';

export type GenerateFailure =
  | 'offline'
  | 'periodTooLong'
  | 'downloadFailed'
  | 'failed';

export type GenerateResult =
  | { ok: true }
  | { ok: false; reason: GenerateFailure };

export type GenerateReportState = {
  isGenerating: boolean;
  /** The sections of the last report generated; every one before the first. */
  lastSelection: ReportCategory[];
  generate: (input: GenerateReportInput) => Promise<GenerateResult>;
};

type GenerateReportOptions = {
  onGenerated: (report: ReportHistoryItem) => void;
};

type PendingDownload = { key: string; report: GeneratedReport };

function failureOf(error: unknown): GenerateFailure {
  // Checked first: the report already exists, so "try again" has to mean
  // downloading it, not generating a second one.
  if (error instanceof ReportDownloadError) {
    return 'downloadFailed';
  }
  // The PDF is made on the server (ADR-04): without a connection there is
  // nothing to generate, and the screen says that instead of "try again".
  if (isNetworkError(error)) {
    return 'offline';
  }
  // A report covers at most a year (366 days); trying again would not help,
  // the user has to pick a shorter period.
  if (error instanceof ApiError && error.code === 'REPORT_PERIOD_TOO_LONG') {
    return 'periodTooLong';
  }
  return 'failed';
}

function keyOf(input: GenerateReportInput): string {
  return [input.from, input.to, ...sectionsOf(input.categories)].join('|');
}

function canStillDownload(
  pending: PendingDownload | null,
  key: string,
): pending is PendingDownload {
  return (
    pending !== null &&
    pending.key === key &&
    Date.now() < pending.report.downloadUrlExpiresAt
  );
}

export function useGenerateReport({
  onGenerated,
}: GenerateReportOptions): GenerateReportState {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastSelection, setLastSelection] = useState<ReportCategory[]>([
    ...REPORT_CATEGORIES,
  ]);
  // A second tap lands before the disabled button renders: it must get the
  // same answer, not send a second POST /reports.
  const inFlight = useRef<Promise<GenerateResult> | null>(null);
  const pending = useRef<PendingDownload | null>(null);

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

  const run = useCallback(
    async (
      token: string,
      owner: string,
      input: GenerateReportInput,
    ): Promise<GenerateResult> => {
      const key = keyOf(input);
      setIsGenerating(true);

      try {
        const current = pending.current;
        const report = canStillDownload(current, key)
          ? current.report
          : await createReport(token, input);
        pending.current = { key, report };

        const item = await saveReport(owner, report);
        pending.current = null;
        onGenerated(item);
        setLastSelection([...input.categories]);
        await saveLastSelection(owner, input.categories);
        return { ok: true };
      } catch (error) {
        const reason = failureOf(error);
        if (reason !== 'downloadFailed') {
          pending.current = null;
        }
        return { ok: false, reason };
      } finally {
        setIsGenerating(false);
      }
    },
    [onGenerated],
  );

  const generate = useCallback(
    (input: GenerateReportInput): Promise<GenerateResult> => {
      if (!idToken || !userId) {
        return Promise.resolve({ ok: false, reason: 'failed' });
      }
      if (!inFlight.current) {
        inFlight.current = run(idToken, userId, input).finally(() => {
          inFlight.current = null;
        });
      }
      return inFlight.current;
    },
    [idToken, userId, run],
  );

  return { isGenerating, lastSelection, generate };
}
