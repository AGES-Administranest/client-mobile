import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import {
  downloadTaxPackage,
  fetchTaxPackageSummary,
  taxPackageFailure,
  type TaxPackageFailure,
  type TaxPackageSummary,
} from 'features/invoices';

type Period = { from: string; to: string };

export type TaxPackageState =
  | { status: 'closed' }
  | { status: 'loading'; period: Period }
  | { status: 'ready'; period: Period; summary: TaxPackageSummary }
  | { status: 'downloading'; period: Period; summary: TaxPackageSummary }
  | {
      status: 'failed';
      period: Period;
      summary: TaxPackageSummary | null;
      reason: TaxPackageFailure;
    };

/**
 * The invoice package of the Reports tab (US30): the summary of the period
 * first, so the user checks what goes in, then the zip.
 */
export function useTaxPackage({ onDownloaded }: { onDownloaded: () => void }) {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [state, setState] = useState<TaxPackageState>({ status: 'closed' });
  // A late answer for a sheet already closed or reopened is dropped.
  const request = useRef(0);

  useEffect(
    () => () => {
      request.current += 1;
    },
    [],
  );

  const open = useCallback(
    (period: Period) => {
      if (!idToken) {
        return;
      }

      const id = ++request.current;
      setState({ status: 'loading', period });
      fetchTaxPackageSummary(idToken, period)
        .then(summary => {
          if (id === request.current) {
            setState({ status: 'ready', period, summary });
          }
        })
        .catch((error: unknown) => {
          if (id === request.current) {
            setState({
              status: 'failed',
              period,
              summary: null,
              reason: taxPackageFailure(error),
            });
          }
        });
    },
    [idToken],
  );

  const download = useCallback(() => {
    if (!idToken || (state.status !== 'ready' && state.status !== 'failed')) {
      return;
    }
    const { period, summary } = state;
    if (summary === null || summary.documentsCount === 0) {
      return;
    }

    const id = ++request.current;
    setState({ status: 'downloading', period, summary });
    downloadTaxPackage(idToken, period)
      .then(() => {
        if (id === request.current) {
          setState({ status: 'closed' });
          onDownloaded();
        }
      })
      .catch((error: unknown) => {
        if (id === request.current) {
          setState({
            status: 'failed',
            period,
            summary,
            reason: taxPackageFailure(error),
          });
        }
      });
  }, [idToken, state, onDownloaded]);

  const close = useCallback(() => {
    request.current += 1;
    setState({ status: 'closed' });
  }, []);

  return { state, open, download, close };
}
