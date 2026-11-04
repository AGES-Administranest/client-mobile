import { useTranslation } from 'shared/i18n';

import { invoiceDetailRows } from './invoicePresenter';
import { InvoiceDetailSheet } from '../components/InvoiceDetailSheet';
import type { Invoice } from '../domain/invoice.types';
import { useInvoiceDownload } from '../hooks/useInvoiceDownload';

type InvoiceDetailModalProps = {
  invoice: Invoice | null;
  visible: boolean;
  onClose: () => void;
};

const DOWNLOAD_MESSAGE = {
  idle: null,
  downloading: 'invoices.detail.downloading',
  done: 'invoices.detail.downloaded',
  failed: 'invoices.detail.downloadFailed',
} as const;

export function InvoiceDetailModal({
  invoice,
  visible,
  onClose,
}: InvoiceDetailModalProps) {
  const { t, locale } = useTranslation();
  const { status, download } = useInvoiceDownload(invoice?.id ?? null);

  if (!invoice) {
    return null;
  }

  const messageKey = DOWNLOAD_MESSAGE[status];

  return (
    <InvoiceDetailSheet
      visible={visible}
      title={t('invoices.detail.title', { number: invoice.number })}
      closeLabel={t('invoices.detail.close')}
      rows={invoiceDetailRows(invoice, t, locale)}
      downloadLabel={t('invoices.detail.download')}
      downloadMessage={messageKey ? t(messageKey) : null}
      isDownloading={status === 'downloading'}
      onDownload={download}
      onClose={onClose}
    />
  );
}
