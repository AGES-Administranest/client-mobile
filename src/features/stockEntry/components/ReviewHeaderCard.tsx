import { View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

import { FormField } from './FormField';

type ReviewHeaderCardProps = {
  labels: {
    supplier: string;
    invoiceNumber: string;
    date: string;
    datePlaceholder: string;
    total: string;
  };
  supplierName: string;
  /** Shown under the supplier when it is not one of the user's. */
  supplierNote?: string;
  invoiceNumber: string;
  orderDate: string;
  total: string;
  sumLabel: string;
  sumOff: boolean;
  onChangeInvoiceNumber: (text: string) => void;
  onChangeOrderDate: (text: string) => void;
  onChangeTotal: (text: string) => void;
};

export function ReviewHeaderCard({
  labels,
  supplierName,
  supplierNote,
  invoiceNumber,
  orderDate,
  total,
  sumLabel,
  sumOff,
  onChangeInvoiceNumber,
  onChangeOrderDate,
  onChangeTotal,
}: ReviewHeaderCardProps) {
  return (
    <View className="gap-3 rounded-2xl bg-white p-4">
      <View className="gap-1">
        <FormField label={labels.supplier} value={supplierName} />
        {supplierNote ? (
          <Text className="text-xs text-label-tertiary">{supplierNote}</Text>
        ) : null}
      </View>
      <View className="flex-row gap-3">
        <FormField
          className="flex-1"
          label={labels.invoiceNumber}
          value={invoiceNumber}
          onChangeText={onChangeInvoiceNumber}
        />
        <FormField
          className="flex-1"
          label={labels.date}
          value={orderDate}
          placeholder={labels.datePlaceholder}
          keyboardType="number-pad"
          onChangeText={onChangeOrderDate}
        />
      </View>
      <FormField
        label={labels.total}
        value={total}
        keyboardType="number-pad"
        onChangeText={onChangeTotal}
      />
      <Text
        className={cn(
          'text-xs',
          sumOff ? 'text-alert-primary' : 'text-label-tertiary',
        )}
      >
        {sumLabel}
      </Text>
    </View>
  );
}
