import { ChevronRight, FileText } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import type { InvoiceSyncStatus } from '../domain/serviceInvoiceRecord.types';

export type ServiceInvoiceListItemProps = {
  title: string;
  issueDate: string;
  clientLine: string;
  location: string | null;
  amount: string;
  status: InvoiceSyncStatus;
  statusLabel: string;
  fileAvailableLabel: string | null;
  onPress: () => void;
};

export function ServiceInvoiceListItem({
  title,
  issueDate,
  clientLine,
  location,
  amount,
  status,
  statusLabel,
  fileAvailableLabel,
  onPress,
}: ServiceInvoiceListItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl bg-white p-4 shadow-md shadow-black/10 active:opacity-80"
    >
      <View
        accessibilityLabel={fileAvailableLabel ?? undefined}
        className="size-12 items-center justify-center rounded-xl bg-details-primary"
      >
        <Icon as={FileText} size={22} className="text-label-quartenery" />
      </View>

      <View className="min-w-0 flex-1 gap-0.5">
        <View className="flex-row items-center justify-between gap-2">
          <Text
            numberOfLines={1}
            className="flex-1 text-sm font-bold text-label-primary"
          >
            {title}
          </Text>
          <InvoiceStatusBadge status={status} label={statusLabel} />
        </View>
        <Text className="text-xs text-label-tertiary">{issueDate}</Text>
        <Text numberOfLines={1} className="text-xs text-label-tertiary">
          {clientLine}
        </Text>
        <View className="flex-row items-center justify-between gap-2">
          <Text
            numberOfLines={1}
            className="flex-1 text-xs text-label-tertiary"
          >
            {location ?? ''}
          </Text>
          <Text className="text-sm font-bold text-label-primary">{amount}</Text>
        </View>
      </View>

      <Icon as={ChevronRight} size={16} className="text-label-tertiary" />
    </Pressable>
  );
}
