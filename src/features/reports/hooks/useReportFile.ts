import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import { isOnline } from 'shared/services/network';

import type { ReportHistoryItem } from '../domain/report.types';
import { isDownloadLinkUsable } from '../domain/reportHistory';
import { saveReportToDevice } from '../services/reportDeviceSaver';
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
  | 'missing'
  | 'shareFailed'
  | 'saved'
  | 'saveFailed';

export type ReportFileState = {
  status: ReportFileStatus;
  open: () => void;
  /** Saves a copy in a folder the person picks (US31). Native apps only. */
  save: () => void;
  canSave: boolean;
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
  const busyWith = useRef<string | null>(null);
  const shown = useRef<string | null>(null);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  const reportId = report?.id ?? null;
  useEffect(() => {
    shown.current = reportId;
    setStatus('idle');
  }, [reportId]);

  // Opening and saving both start from the copy on the device, downloading
  // it first when it is not there yet.
  const withLocalFile = useCallback(
    (handle: (file: LocalReportFile) => Promise<ReportFileStatus>) => {
      if (!report || !userId || busyWith.current !== null) {
        return;
      }

      // A download that ends after the person moved to another report must
      // not show its result on that one.
      const show = (next: ReportFileStatus) => {
        if (isMounted.current && shown.current === report.id) setStatus(next);
      };

      const settle = (next: ReportFileStatus) => {
        busyWith.current = null;
        show(next);
      };

      busyWith.current = report.id;

      const run = async (): Promise<ReportFileStatus> => {
        const local = findLocalReport(userId, report);
        if (local) {
          return handle(local);
        }

        if (!idToken) {
          return 'failed';
        }

        if (!(await isOnline())) {
          return 'offline';
        }

        show('downloading');

        if (!canKeepReportFiles) {
          const link = await freshLink(idToken, report.id);
          await downloadInBrowser(link.url);
          return 'done';
        }

        const file = await downloadWithFreshLink(idToken, userId, report);
        onDownloaded(report.id);
        return handle(file);
      };

      run()
        .then(settle)
        .catch(error => settle(isReportNotFound(error) ? 'missing' : 'failed'));
    },
    [report, userId, idToken, onDownloaded],
  );

  const open = useCallback(
    () =>
      withLocalFile(async file =>
        (await openLocalReport(file)) ? 'done' : 'shareFailed',
      ),
    [withLocalFile],
  );

  const save = useCallback(
    () =>
      withLocalFile(async file => {
        try {
          return (await saveReportToDevice(file)) === 'saved'
            ? 'saved'
            : 'idle';
        } catch {
          return 'saveFailed';
        }
      }),
    [withLocalFile],
  );

  return { status, open, save, canSave: canKeepReportFiles };
}
