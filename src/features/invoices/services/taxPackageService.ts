import { Linking, Platform } from 'react-native';

import { NetworkError } from 'shared/api';
import { ApiError, apiClient } from 'shared/services/apiClient';

import { allTimeTaxPackagePeriod } from '../domain/taxPackagePeriod';

// The API builds the zip inside the request and gives up after 2 minutes: the
// app waits a little longer than that, and no longer.
const REQUEST_TIMEOUT_MS = 150_000;

export type TaxPackageExport = {
  url: string;
  expiresAt: number;
  fileName: string;
  documentsCount: number;
  skipped: { type: string; id: string; reason: string }[];
};

export type TaxPackageFailure =
  | 'empty'
  | 'tooLarge'
  | 'rateLimited'
  | 'offline'
  | 'failed';

export function requestTaxPackage(
  idToken: string,
  now: Date = new Date(),
): Promise<TaxPackageExport> {
  return apiClient.post<TaxPackageExport>(
    '/reports/tax-package',
    allTimeTaxPackagePeriod(now),
    { token: idToken, timeoutMs: REQUEST_TIMEOUT_MS },
  );
}

/**
 * The link is an attachment: whichever way it is opened, the browser saves
 * it. On web the current tab navigates to it, because a new tab opened after
 * waiting for the API is what popup blockers refuse.
 */
function openDownload(url: string): Promise<void> {
  if (Platform.OS === 'web') {
    const { location } = globalThis as unknown as {
      location: { assign: (target: string) => void };
    };
    location.assign(url);
    return Promise.resolve();
  }

  return Linking.openURL(url);
}

export async function downloadTaxPackage(idToken: string): Promise<void> {
  const { url } = await requestTaxPackage(idToken);
  await openDownload(url);
}

export function taxPackageFailure(error: unknown): TaxPackageFailure {
  if (error instanceof ApiError) {
    if (error.code === 'TAX_PACKAGE_EMPTY') return 'empty';
    if (error.code === 'TAX_PACKAGE_TOO_LARGE') return 'tooLarge';
    if (error.status === 429) return 'rateLimited';
    return 'failed';
  }

  if (error instanceof NetworkError || error instanceof TypeError) {
    return 'offline';
  }

  return 'failed';
}