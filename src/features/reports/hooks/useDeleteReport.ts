import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import { isOnline } from 'shared/services/network';

import { removeReportFile } from '../services/reportFileStore';
import { deleteReport } from '../services/reportHistoryService';

export type DeleteReportError = 'offline' | 'failed' | null;

export type DeleteReportState = {
  isDeleting: boolean;
  error: DeleteReportError;
  remove: (reportId: string) => Promise<boolean>;
  clearError: () => void;
};

export function useDeleteReport(): DeleteReportState {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<DeleteReportError>(null);
  const isMounted = useRef(true);
  const inFlight = useRef(false);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  const remove = useCallback(
    async (reportId: string) => {
      if (!idToken || inFlight.current) {
        return false;
      }

      inFlight.current = true;
      setIsDeleting(true);
      setError(null);

      try {
        // Deleting only on the device would leave the report in the history
        // of every other device, so it needs the API.
        if (!(await isOnline())) {
          if (isMounted.current) setError('offline');
          return false;
        }

        await deleteReport(idToken, reportId);

        if (userId) {
          try {
            removeReportFile(userId, reportId);
          } catch {
            // The report is already gone from the history; a copy left on the
            // device is never listed again and does not undo the deletion.
          }
        }

        return true;
      } catch {
        if (isMounted.current) setError('failed');
        return false;
      } finally {
        inFlight.current = false;
        if (isMounted.current) setIsDeleting(false);
      }
    },
    [idToken, userId],
  );

  const clearError = useCallback(() => setError(null), []);

  return { isDeleting, error, remove, clearError };
}
