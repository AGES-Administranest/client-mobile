import { useState, type ComponentType } from 'react';
import { ScrollView, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { ServiceInvoicesSection } from 'features/serviceInvoices';
import { useTranslation } from 'shared/i18n';

type InvoiceDetailScreenProps = {
  invoiceId: string;
  onClose: () => void;
};

type InvoiceListScreenProps = {
  onClose: () => void;
};

type ReportsScreenProps = {
  InvoiceDetailScreen?: ComponentType<InvoiceDetailScreenProps>;
  InvoiceListScreen?: ComponentType<InvoiceListScreenProps>;
};

type OpenInvoiceScreen =
  | { kind: 'detail'; invoiceId: string }
  | { kind: 'list' }
  | null;

export function ReportsScreen({
  InvoiceDetailScreen,
  InvoiceListScreen,
}: ReportsScreenProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<OpenInvoiceScreen>(null);
  const close = () => setOpen(null);

  return (
    <>
      <ScrollView contentContainerClassName="gap-4 pt-4">
        <Text className="px-4 text-4xl font-bold text-label-primary">
          {t('tabbar.reports')}
        </Text>
        <ServiceInvoicesSection
          onOpenInvoice={invoiceId => setOpen({ kind: 'detail', invoiceId })}
          onSeeAll={() => setOpen({ kind: 'list' })}
        />
        {/* Reserved for the "Adicionar nota" button (US01). */}
        <View className="mx-4 h-12" />
      </ScrollView>
      {open?.kind === 'detail' && InvoiceDetailScreen ? (
        <InvoiceDetailScreen invoiceId={open.invoiceId} onClose={close} />
      ) : null}
      {open?.kind === 'list' && InvoiceListScreen ? (
        <InvoiceListScreen onClose={close} />
      ) : null}
    </>
  );
}
