import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import { isOnline } from 'shared/services/network';

import type { ReportHistoryItem } from '../domain/report.types';
import { isDownloadLinkUsable } from '../domain/reportHistory';
import {
  downloadInBrowser,
  openLocalReport,
} from '../services/reportFileOpener';
import {
  canKeepReportFiles,
  findLocalReport,
  saveReportFile,
  type LocalReportFile,
} from '../services/reportFileStore';
import {
  fetchReportDownloadLink,
  isReportNotFound,
} from '../services/reportHistoryService';

export type ReportFileStatus =
  | 'idle'
  | 'downloading'
  | 'done'
  | 'failed'
  | 'offline'
  | 'missing';

export type ReportFileState = {
  status: ReportFileStatus;
  open: () => void;
};

type ReportFileOptions = {
  onDownloaded: (reportId: string) => void;
};

async function freshLink(idToken: string, reportId: string) {
  const link = await fetchReportDownloadLink(idToken, reportId);

  return isDownloadLinkUsable(link.expiresAt, Date.now())
    ? link
    : fetchReportDownloadLink(idToken, reportId);
}

// The signed link lasts five minutes: a download that fails with a link in
// hand is tried once more with a new one, in case it expired on the way.
async function downloadWithFreshLink(
  idToken: string,
  userId: string,
  report: ReportHistoryItem,
): Promise<LocalReportFile> {
  const link = await freshLink(idToken, report.id);

  try {
    return await saveReportFile(userId, report, link.url);
  } catch {
    const retryLink = await fetchReportDownloadLink(idToken, report.id);
    return saveReportFile(userId, report, retryLink.url);
  }
}

export function useReportFile(
  report: ReportHistoryItem | null,
  { onDownloaded }: ReportFileOptions,
): ReportFileState {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;
  const [status, setStatus] = useState<ReportFileStatus>('idle');
  const isMounted = useRef(true);
  const isBusy = useRef(false);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  const reportId = report?.id ?? null;
  useEffect(() => setStatus('idle'), [reportId]);

  const open = useCallback(() => {
    if (!report || !userId || isBusy.current) {
      return;
    }

    const settle = (next: ReportFileStatus) => {
      isBusy.current = false;
      if (isMounted.current) setStatus(next);
    };

    isBusy.current = true;

    const run = async (): Promise<ReportFileStatus> => {
      const local = findLocalReport(userId, report);
      if (local) {
        await openLocalReport(local);
        return 'done';
      }

      if (!idToken) {
        return 'failed';
      }

      if (!(await isOnline())) {
        return 'offline';
      }

      if (isMounted.current) setStatus('downloading');

      if (!canKeepReportFiles) {
        const link = await freshLink(idToken, report.id);
        downloadInBrowser(link.url);
        return 'done';
      }

      const file = await downloadWithFreshLink(idToken, userId, report);
      onDownloaded(report.id);
      await openLocalReport(file);
      return 'done';
    };

    run()
      .then(settle)
      .catch(error => settle(isReportNotFound(error) ? 'missing' : 'failed'));
  }, [report, userId, idToken, onDownloaded]);

  return { status, open };
}
