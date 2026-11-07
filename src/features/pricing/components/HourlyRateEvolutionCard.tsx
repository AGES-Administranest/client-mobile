import { View } from 'react-native';

import { Card } from 'app/components/ui/card';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

import {
  HourlyRateEvolutionChart,
  type HourlyRateEvolutionChartProps,
} from './HourlyRateEvolutionChart';
import { TrendChip, type TrendChipProps } from './TrendChip';

export type EvolutionStat = {
  label: string;
  value: string;
  caption: string;
};

export type HourlyRateEvolutionCardProps = {
  title: string;
  periodChange: TrendChipProps | null;
  legend: string;
  chart: HourlyRateEvolutionChartProps;
  stats: EvolutionStat[];
};

export function HourlyRateEvolutionCard({
  title,
  periodChange,
  legend,
  chart,
  stats,
}: HourlyRateEvolutionCardProps) {
  return (
    <Card className="gap-3 rounded-[14px] p-4 shadow-[0px_5px_10px_-3px_rgba(0,0,0,0.1)]">
      <View className="flex-row items-center gap-2">
        <Text
          accessibilityRole="header"
          className="flex-1 text-[11px] font-bold uppercase leading-[16.5px] tracking-[0.55px] text-label-primary"
        >
          {title}
        </Text>
        {periodChange ? <TrendChip {...periodChange} /> : null}
      </View>

      <View className="flex-row items-center gap-1.5">
        <View className="h-[2.5px] w-[18px] rounded-full bg-label-quartenery" />
        <Text className="text-[11px] leading-[16.5px] text-label-body">
          {legend}
        </Text>
      </View>

      <HourlyRateEvolutionChart {...chart} />

      <View className="flex-row border-t border-border-warm pt-3">
        {stats.map((stat, index) => (
          <View
            key={stat.label}
            className={cn(
              'min-w-0 flex-1 gap-px',
              index > 0 && 'border-l border-border-warm pl-3',
            )}
          >
            <Text className="text-[10px] font-semibold uppercase leading-[15px] tracking-[0.4px] text-label-muted">
              {stat.label}
            </Text>
            <Text className="text-sm font-semibold leading-[21px] text-label-primary">
              {stat.value}
            </Text>
            <Text className="text-[10px] leading-[15px] text-label-muted">
              {stat.caption}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
