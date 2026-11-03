import { View } from 'react-native';

import { Card } from 'app/components/ui/card';
import { Text } from 'app/components/ui/text';

type FixedCostLine = {
  label: string;
  value: string;
};

export type FixedCostsCardProps = {
  title: string;
  lines: FixedCostLine[];
  totalLabel: string;
  totalValue: string;
};

export function FixedCostsCard({
  title,
  lines,
  totalLabel,
  totalValue,
}: FixedCostsCardProps) {
  return (
    <Card className="gap-0 rounded-[14px] p-4 shadow-[0px_5px_10px_-3px_rgba(0,0,0,0.1)]">
      <Text className="mb-1.5 text-[11px] font-bold uppercase leading-[16.5px] tracking-[0.55px] text-label-primary">
        {title}
      </Text>

      {lines.map(line => (
        <View
          key={line.label}
          className="flex-row items-center justify-between gap-2 py-[7px]"
        >
          <Text className="min-w-0 flex-1 text-[13px] leading-[19.5px] text-label-primary">
            {line.label}
          </Text>
          <Text className="text-right text-sm font-semibold leading-[21px] text-label-primary">
            {line.value}
          </Text>
        </View>
      ))}

      <View className="flex-row items-center border-t border-border-warm pb-1 pt-3">
        <Text className="flex-1 text-[13px] font-semibold leading-[19.5px] text-label-primary">
          {totalLabel}
        </Text>
        <Text className="text-right text-[15px] font-bold leading-[22.5px] text-label-primary">
          {totalValue}
        </Text>
      </View>
    </Card>
  );
}
