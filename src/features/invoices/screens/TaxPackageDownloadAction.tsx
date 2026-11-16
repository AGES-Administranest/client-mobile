import { useTranslation } from 'shared/i18n';

import { TaxPackageDownload } from '../components/TaxPackageDownload';
import { useTaxPackageDownload } from '../hooks/useTaxPackageDownload';

const MESSAGE = {
  idle: null,
  downloading: 'invoices.downloadAll.downloading',
  done: 'invoices.downloadAll.done',
  empty: 'invoices.downloadAll.empty',
  tooLarge: 'invoices.downloadAll.tooLarge',
  rateLimited: 'invoices.downloadAll.rateLimited',
  offline: 'invoices.downloadAll.offline',
  failed: 'invoices.downloadAll.failed',
} as const;

export function TaxPackageDownloadAction() {
  const { t } = useTranslation();
  const { status, download } = useTaxPackageDownload();
  const messageKey = MESSAGE[status];

  return (
    <TaxPackageDownload
      label={t('invoices.downloadAll.button')}
      message={messageKey ? t(messageKey) : null}
      isDownloading={status === 'downloading'}
      onPress={download}
    />
  );
}
