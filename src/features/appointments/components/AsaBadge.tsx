import { View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

import { formatAsaLabel } from '../domain/appointment';

type AsaBadgeProps = {
  asa: string;
  className?: string;
};

// The patient's ASA physical status, as the gray tag on the Figma cards.
export function AsaBadge({ asa, className }: AsaBadgeProps) {
  const label = formatAsaLabel(asa);

  return (
    <View
      accessibilityLabel={label}
      className={cn('rounded-md bg-details-primary px-2 py-0.5', className)}
    >
      <Text className="text-[11px] font-bold text-label-tertiary">{label}</Text>
    </View>
  );
}
