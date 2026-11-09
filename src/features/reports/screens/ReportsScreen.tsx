import { useState } from 'react';
import { View } from 'react-native';

import {
  ServiceInvoiceUploadFlow,
  ServiceInvoicesFlow,
  useServiceInvoiceUpload,
} from 'features/serviceInvoices';
import { useTranslation } from 'shared/i18n';

import { ReportsHeader } from '../components/ReportsHeader';

export function ReportsScreen() {
  const { t } = useTranslation();
  const invoiceUpload = useServiceInvoiceUpload();
  const [invoicesOpen, setInvoicesOpen] = useState(false);

  return (
    <View className="flex-1">
      <ReportsHeader
        title={t('reports.title')}
        invoicesLabel={t('reports.openInvoices')}
        onInvoicesPress={() => setInvoicesOpen(true)}
      />
      {invoicesOpen ? null : (
        <View className="px-5">
          <ServiceInvoiceUploadFlow upload={invoiceUpload} />
        </View>
      )}
      <ServiceInvoicesFlow
        open={invoicesOpen}
        onClose={() => setInvoicesOpen(false)}
        upload={invoiceUpload}
      />
    </View>
  );
}
