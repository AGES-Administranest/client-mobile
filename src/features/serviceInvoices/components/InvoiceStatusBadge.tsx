import { View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

import type { InvoiceSyncStatus } from '../domain/serviceInvoiceRecord.types';

const TONES: Record<InvoiceSyncStatus, { box: string; text: string }> = {
  SYNCED: { box: 'bg-details-finish', text: 'text-label-primary' },
  PENDING: { box: 'bg-details-tertiary', text: 'text-label-primary' },
  ERROR: {
    box: 'border border-alert-primary bg-white',
    text: 'text-alert-primary',
  },
};

type InvoiceStatusBadgeProps = {
  status: InvoiceSyncStatus;
  label: string;
};

export function InvoiceStatusBadge({ status, label }: InvoiceStatusBadgeProps) {
  const tone = TONES[status];
  return (
    <View className={cn('rounded-full px-2 py-0.5', tone.box)}>
      <Text
        className={cn('text-[10px] font-semibold leading-[15px]', tone.text)}
      >
        {label}
      </Text>
    </View>
  );
}
