import { ChevronRight, FileText } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

export type InvoiceStatusTone = 'success' | 'attention' | 'alert';

type InvoiceCardProps = {
  title: string;
  date: string;
  issuer: string;
  taker: string;
  value: string;
  statusLabel: string;
  statusTone: InvoiceStatusTone;
  onPress: () => void;
};

const BADGE: Record<InvoiceStatusTone, string> = {
  success: 'bg-details-finish',
  attention: 'bg-details-tertiary',
  alert: 'border border-alert-primary bg-white',
};

const BADGE_TEXT: Record<InvoiceStatusTone, string> = {
  success: 'text-label-primary',
  attention: 'text-label-primary',
  alert: 'text-alert-primary',
};

export function InvoiceCard({
  title,
  date,
  issuer,
  taker,
  value,
  statusLabel,
  statusTone,
  onPress,
}: InvoiceCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${statusLabel}, ${value}`}
      className="flex-row items-center gap-3 rounded-2xl bg-white p-4"
    >
      <View className="size-12 items-center justify-center rounded-xl bg-details-primary">
        <Icon as={FileText} size={24} className="text-label-primary" />
      </View>

      <View className="flex-1 gap-0.5">
        <View className="flex-row items-start justify-between gap-2">
          <Text
            className="flex-1 text-sm font-bold text-label-primary"
            numberOfLines={1}
          >
            {title}
          </Text>
          <View className={cn('rounded-full px-2 py-0.5', BADGE[statusTone])}>
            <Text
              className={cn('text-[11px] font-medium', BADGE_TEXT[statusTone])}
            >
              {statusLabel}
            </Text>
          </View>
        </View>

        <View className="flex-row items-end justify-between gap-2">
          <View className="flex-1 gap-0.5">
            <Text className="text-xs text-label-tertiary">{date}</Text>
            <Text className="text-xs text-label-tertiary" numberOfLines={1}>
              {issuer}
            </Text>
            <Text className="text-xs text-label-tertiary" numberOfLines={1}>
              {taker}
            </Text>
          </View>
          <Text className="text-sm font-bold text-label-primary">{value}</Text>
        </View>
      </View>

      <Icon as={ChevronRight} size={16} className="text-label-tertiary" />
    </Pressable>
  );
}
