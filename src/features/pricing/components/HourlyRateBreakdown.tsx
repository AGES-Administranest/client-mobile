import { ChevronDown, ChevronUp, Info } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

import type { HourlyRatePart } from '../domain/hourlyRate';

export type HourlyRateBreakdownRow = {
  part: HourlyRatePart;
  label: string;
  caption: string;
  value: string;
  shareLabel: string;
  share: number;
};

export type HourlyRateBreakdownProps = {
  title: string;
  rows: HourlyRateBreakdownRow[];
  explanationTitle: string;
  explanation: string;
};

const PART_COLOR: Record<HourlyRatePart, string> = {
  fixedCosts: 'bg-chart-fixed-costs',
  variableCosts: 'bg-chart-variable-costs',
  proLabore: 'bg-button-primary',
  safetyMargin: 'bg-chart-safety-margin',
};

export function HourlyRateBreakdown({
  title,
  rows,
  explanationTitle,
  explanation,
}: HourlyRateBreakdownProps) {
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const barRows = rows.filter(row => row.share > 0);

  return (
    <View className="gap-2">
      <Text className="text-[11px] font-semibold uppercase leading-[16.5px] tracking-[0.44px] text-label-muted">
        {title}
      </Text>

      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="h-2.5 flex-row gap-[2px] overflow-hidden rounded-[5px]"
      >
        {barRows.map(row => (
          <View
            key={row.part}
            testID={`breakdown-bar-${row.part}`}
            style={{ flex: row.share }}
            className={cn('h-2.5', PART_COLOR[row.part])}
          />
        ))}
      </View>

      <View>
        {rows.map((row, index) => (
          <View
            key={row.part}
            accessible
            accessibilityLabel={`${row.label}, ${row.value}, ${row.shareLabel}`}
            className={cn(
              'flex-row items-center gap-2.5 py-2.5',
              index < rows.length - 1 && 'border-b border-border-warm',
            )}
          >
            <View
              className={cn('size-2.5 rounded-full', PART_COLOR[row.part])}
            />
            <View className="min-w-0 flex-1">
              <Text className="text-[13px] font-medium leading-[19.5px] text-label-primary">
                {row.label}
              </Text>
              <Text className="text-[10px] leading-[15px] text-label-muted">
                {row.caption}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-right text-sm font-semibold leading-[21px] text-label-primary">
                {row.value}
              </Text>
              <Text className="text-right text-[11px] leading-[16.5px] text-label-muted">
                {row.shareLabel}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isExplanationOpen }}
        onPress={() => setIsExplanationOpen(open => !open)}
        className="gap-2 rounded-[10px] bg-details-warm px-3 py-2.5"
      >
        <View className="flex-row items-center gap-2">
          <Icon as={Info} size={14} className="text-label-quartenery" />
          <Text className="flex-1 text-xs font-semibold leading-[18px] text-label-quartenery">
            {explanationTitle}
          </Text>
          <Icon
            as={isExplanationOpen ? ChevronUp : ChevronDown}
            size={16}
            className="text-label-quartenery"
          />
        </View>
        {isExplanationOpen ? (
          <Text className="text-xs leading-[18px] text-label-body">
            {explanation}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}
