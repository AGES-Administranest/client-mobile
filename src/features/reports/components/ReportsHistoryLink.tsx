import { Pressable, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type ReportsHistoryLinkProps = {
  title: string;
  actionLabel: string;
  onPress: () => void;
  className?: string;
};

export function ReportsHistoryLink({
  title,
  actionLabel,
  onPress,
  className,
}: ReportsHistoryLinkProps) {
  return (
    <View className={cn('flex-row items-center justify-between', className)}>
      <Text
        accessibilityRole="header"
        className="text-sm font-semibold uppercase text-label-primary"
      >
        {title}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${actionLabel}`}
        hitSlop={8}
        onPress={onPress}
      >
        <Text className="text-xs text-label-quartenery">{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

export type { ReportsHistoryLinkProps };
