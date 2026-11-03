import { ChevronDown, ChevronUp, Clock } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Card } from 'app/components/ui/card';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { LabelMuted } from 'theme/colors';

type HourlyRateSummary = {
  label: string;
  value: string;
};

export type HourlyRateHighlightProps = {
  title: string;
  marginLabel: string;
  value: string;
  valueAccessibilityLabel: string;
  description: string;
  minimum: HourlyRateSummary;
  productiveHours: HourlyRateSummary;
  updatedAt: string;
  isRefreshing: boolean;
  refreshingLabel: string;
  toggleLabel: string;
  isExpanded: boolean;
  onToggle: () => void;
  children?: ReactNode;
};

function SummaryTile({ label, value }: HourlyRateSummary) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      className="min-w-0 flex-1 gap-0.5 rounded-[10px] bg-details-warm px-3 py-2.5"
    >
      <Text className="text-[11px] leading-[16.5px] text-label-body">
        {label}
      </Text>
      <Text className="text-[15px] font-semibold leading-[22.5px] text-label-primary">
        {value}
      </Text>
    </View>
  );
}

export function HourlyRateHighlight({
  title,
  marginLabel,
  value,
  valueAccessibilityLabel,
  description,
  minimum,
  productiveHours,
  updatedAt,
  isRefreshing,
  refreshingLabel,
  toggleLabel,
  isExpanded,
  onToggle,
  children,
}: HourlyRateHighlightProps) {
  return (
    <Card className="gap-3 rounded-[14px] p-4 shadow-[0px_5px_10px_-3px_rgba(0,0,0,0.1)]">
      <View className="flex-row items-center gap-2">
        <Text className="flex-1 text-[11px] font-semibold uppercase leading-[16.5px] tracking-[0.44px] text-label-primary">
          {title}
        </Text>
        <View className="rounded-[20px] bg-details-warm px-2 py-[3px]">
          <Text className="text-[10px] font-semibold leading-[15px] text-label-quartenery">
            {marginLabel}
          </Text>
        </View>
      </View>

      <View
        className={cn('gap-0.5', isRefreshing && 'opacity-50')}
        accessibilityState={{ busy: isRefreshing }}
      >
        <Text
          accessibilityLabel={valueAccessibilityLabel}
          className="text-[38px] font-bold leading-[50px] tracking-[-0.76px] text-label-primary"
        >
          {value}
        </Text>
        <Text className="text-xs leading-[18px] text-label-body">
          {description}
        </Text>
      </View>

      <View className={cn('flex-row gap-2', isRefreshing && 'opacity-50')}>
        <SummaryTile {...minimum} />
        <SummaryTile {...productiveHours} />
      </View>

      <View className="flex-row items-center gap-1.5">
        {isRefreshing ? (
          <ActivityIndicator
            size="small"
            color={LabelMuted}
            accessibilityLabel={refreshingLabel}
            className="size-[13px]"
          />
        ) : (
          <Icon as={Clock} size={13} className="text-label-muted" />
        )}
        <Text className="text-[11px] leading-[16.5px] text-label-muted">
          {updatedAt}
        </Text>
      </View>

      <View className="h-px bg-border-warm" />

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        onPress={onToggle}
        className="flex-row items-center gap-1.5 py-0.5 active:opacity-70"
      >
        <Text className="flex-1 text-[13px] font-semibold leading-[19.5px] text-label-quartenery">
          {toggleLabel}
        </Text>
        <Icon
          as={isExpanded ? ChevronUp : ChevronDown}
          size={18}
          className="text-label-quartenery"
        />
      </Pressable>

      {isExpanded ? children : null}
    </Card>
  );
}
