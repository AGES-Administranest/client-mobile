import { View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type DetailStatCardProps = {
  label: string;
  value: string;
  className?: string;
};

export function DetailStatCard({
  label,
  value,
  className,
}: DetailStatCardProps) {
  return (
    <View
      className={cn(
        'flex-1 gap-1 rounded-2xl bg-white p-4 shadow-sm shadow-black/10',
        className,
      )}
    >
      <Text className="text-[11px] font-semibold uppercase tracking-wide text-label-primary">
        {label}
      </Text>
      <Text className="text-xl font-bold text-label-primary">{value}</Text>
    </View>
  );
}
