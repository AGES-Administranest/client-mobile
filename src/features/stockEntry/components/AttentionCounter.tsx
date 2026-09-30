import { Check, TriangleAlert } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type AttentionCounterProps = {
  label: string;
  needsAttention: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

export function AttentionCounter({
  label,
  needsAttention,
  actionLabel,
  onAction,
}: AttentionCounterProps) {
  return (
    <View
      className={cn(
        'flex-row items-center gap-2 rounded-2xl px-4 py-3',
        needsAttention ? 'bg-details-tertiary' : 'bg-details-primary',
      )}
    >
      <Icon
        as={needsAttention ? TriangleAlert : Check}
        size={18}
        className="text-label-quartenery"
      />
      <Text className="flex-1 text-sm font-medium text-label-primary">
        {label}
      </Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8}>
          <Text className="text-xs font-medium text-label-quartenery underline">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
