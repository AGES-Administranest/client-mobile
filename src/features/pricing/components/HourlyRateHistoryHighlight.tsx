import { View } from 'react-native';

import { Card } from 'app/components/ui/card';
import { Text } from 'app/components/ui/text';

import { TrendChip, type TrendChipProps } from './TrendChip';

export type HourlyRateHistoryHighlightProps = {
  title: string;
  marginLabel?: string;
  value: string;
  valueSize?: 'large' | 'medium';
  trend: TrendChipProps | null;
  // The sentence may hold one passage in semibold.
  summary: { lead: string; strong?: string; tail?: string };
};

export function HourlyRateHistoryHighlight({
  title,
  marginLabel,
  value,
  valueSize = 'large',
  trend,
  summary,
}: HourlyRateHistoryHighlightProps) {
  return (
    <Card className="gap-3 rounded-[14px] p-4 shadow-[0px_5px_10px_-3px_rgba(0,0,0,0.1)]">
      <View className="flex-row items-center gap-2">
        <Text className="flex-1 text-[11px] font-semibold uppercase leading-[16.5px] tracking-[0.44px] text-label-primary">
          {title}
        </Text>
        {marginLabel ? (
          <View className="rounded-[20px] bg-details-warm px-2 py-[3px]">
            <Text className="text-[10px] font-semibold leading-[15px] text-label-quartenery">
              {marginLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="flex-row items-end gap-2.5">
        <Text
          className={
            valueSize === 'large'
              ? 'text-[38px] font-bold leading-[50px] tracking-[-0.76px] text-label-primary'
              : 'text-[30px] font-bold leading-[40px] tracking-[-0.6px] text-label-primary'
          }
        >
          {value}
        </Text>
        {trend ? (
          <View className={valueSize === 'large' ? 'pb-3' : 'pb-2'}>
            <TrendChip {...trend} />
          </View>
        ) : null}
      </View>

      <Text className="text-xs leading-[18px] text-label-body">
        {summary.lead}
        {summary.strong ? (
          <Text className="text-xs font-semibold leading-[18px] text-label-body">
            {summary.strong}
          </Text>
        ) : null}
        {summary.tail}
      </Text>
    </Card>
  );
}
