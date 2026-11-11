import { type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type ReportFieldProps = {
  value: string;
  isPlaceholder?: boolean;
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
  accessibilityLabel: string;
  onPress: () => void;
  className?: string;
};

export function ReportField({
  value,
  isPlaceholder = false,
  leadingIcon,
  trailingIcon,
  accessibilityLabel,
  onPress,
  className,
}: ReportFieldProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={cn(
        'min-h-9 flex-row items-center gap-2 rounded-lg border border-border-primary bg-white px-3 py-1.5',
        className,
      )}
    >
      {leadingIcon ? (
        <Icon as={leadingIcon} size={16} className="text-label-primary" />
      ) : null}
      <View className="flex-1">
        <Text
          className={cn(
            'text-sm',
            isPlaceholder ? 'text-label-tertiary' : 'text-label-primary',
          )}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
      {trailingIcon ? (
        <Icon as={trailingIcon} size={16} className="text-label-tertiary" />
      ) : null}
    </Pressable>
  );
}
