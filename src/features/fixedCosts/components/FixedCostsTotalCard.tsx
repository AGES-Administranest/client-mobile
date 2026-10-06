import { View } from 'react-native';

import { Text } from 'app/components/ui/text';

export type FixedCostsTotalCardProps = {
  label: string;
  formattedTotal: string;
  countLabel: string;
};

function FixedCostsTotalCard({
  label,
  formattedTotal,
  countLabel,
}: FixedCostsTotalCardProps) {
  return (
    <View className="gap-1 rounded-2xl bg-white p-4 shadow-md shadow-black/10">
      <Text className="text-[11px] font-bold uppercase tracking-wide text-label-tertiary">
        {label}
      </Text>
      <Text className="text-[30px] font-bold text-label-primary">
        {formattedTotal}
      </Text>
      <Text className="text-[13px] text-label-tertiary">{countLabel}</Text>
    </View>
  );
}

export { FixedCostsTotalCard };
