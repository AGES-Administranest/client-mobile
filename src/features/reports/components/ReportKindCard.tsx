import type { LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type ReportKindCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  disabled?: boolean;
  onPress: () => void;
  className?: string;
};

export function ReportKindCard({
  icon,
  title,
  description,
  disabled = false,
  onPress,
  className,
}: ReportKindCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-3 rounded-2xl bg-white p-4 shadow-md shadow-black/10 active:opacity-80',
        disabled && 'opacity-50',
        className,
      )}
    >
      <View className="size-10 items-center justify-center rounded-xl bg-details-primary">
        <Icon as={icon} className="size-5 text-label-quartenery" />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-label-primary">
          {title}
        </Text>
        <Text className="text-xs text-label-tertiary">{description}</Text>
      </View>
    </Pressable>
  );
}

export type { ReportKindCardProps };
