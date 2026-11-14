import { CalendarDays } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type ReportDateFieldProps = {
  label: string;
  value: string;
  isCalendarOpen: boolean;
  onPress: () => void;
};

export function ReportDateField({
  label,
  value,
  isCalendarOpen,
  onPress,
}: ReportDateFieldProps) {
  return (
    <View className="flex-1 gap-1">
      <Text className="text-sm font-medium">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        accessibilityState={{ expanded: isCalendarOpen }}
        onPress={onPress}
        className={cn(
          'h-11 flex-row items-center gap-2 rounded-xl border border-border-primary px-3',
          isCalendarOpen ? 'bg-details-primary' : 'bg-white',
        )}
      >
        <Icon as={CalendarDays} className="size-4 text-label-tertiary" />
        <Text className="flex-1 text-sm" numberOfLines={1}>
          {value}
        </Text>
      </Pressable>
    </View>
  );
}
