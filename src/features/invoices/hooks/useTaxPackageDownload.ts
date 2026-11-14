import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';

import {
  downloadTaxPackage,
  taxPackageFailure,
  type TaxPackageFailure,
} from '../services/taxPackageService';

export type TaxPackageDownloadStatus =
  | 'idle'
  | 'downloading'
  | 'done'
  | TaxPackageFailure;

export type TaxPackageDownloadState = {
  status: TaxPackageDownloadStatus;
  download: () => void;
};

export function useTaxPackageDownload(): TaxPackageDownloadState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [status, setStatus] = useState<TaxPackageDownloadStatus>('idle');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  const download = useCallback(() => {
    if (!idToken || status === 'downloading') {
      return;
    }

    setStatus('downloading');
    downloadTaxPackage(idToken)
      .then(() => isMounted.current && setStatus('done'))
      .catch(
        (error: unknown) =>
          isMounted.current && setStatus(taxPackageFailure(error)),
      );
  }, [idToken, status]);

  return { status, download };
}
