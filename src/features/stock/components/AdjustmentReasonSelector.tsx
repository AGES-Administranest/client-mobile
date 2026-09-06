import { Pressable, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

import type { AdjustmentReason } from '../domain/validateOutputAdjustment';

const REASONS: AdjustmentReason[] = ['loss', 'expiration', 'breakage'];

interface AdjustmentReasonSelectorProps {
  value: AdjustmentReason | null;
  onSelect: (reason: AdjustmentReason) => void;
}

function AdjustmentReasonSelector({
  value,
  onSelect,
}: AdjustmentReasonSelectorProps) {
  return (
    <View className="flex-row gap-2">
      {REASONS.map(reason => (
        <Pressable
          className={cn(
            'rounded-md px-4 py-2 border border-primary',
            value === reason && 'bg-primary',
          )}
          key={reason}
          onPress={() => onSelect(reason)}
        >
          <Text>{reason}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export { AdjustmentReasonSelector };
