import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Card } from 'app/components/ui/card';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

import type { TrendTone } from './TrendChip';

export type HourlyRateMonthRowProps = {
  id: string;
  label: string;
  currentChip: string | null;
  // "130 h produtivas · mín. R$ 81,72", under the month.
  detail: string;
  value: string;
  // A rise or a fall against the previous month, or the caption the oldest
  // month shows in its place.
  trend: { tone: TrendTone; label: string } | null;
  caption: string | null;
  accessibilityLabel: string;
};

export type HourlyRateMonthsCardProps = {
  title: string;
  titleCaption?: string;
  titleVariant?: 'eyebrow' | 'year';
  rows: HourlyRateMonthRowProps[];
  // With no `onSelect` the rows are plain, not pressable. The last row keeps
  // its divider only when the footer action sits right under it.
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  footerAction?: { label: string; onPress: () => void };
};

function MonthRow({
  row,
  hasDivider,
  isSelected,
  onSelect,
}: {
  row: HourlyRateMonthRowProps;
  hasDivider: boolean;
  isSelected: boolean;
  onSelect?: (id: string) => void;
}) {
  const content = (
    <>
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-[13px] font-medium leading-[19.5px] text-label-primary">
            {row.label}
          </Text>
          {row.currentChip ? (
            <View className="rounded-[20px] bg-details-warm px-2 py-[3px]">
              <Text className="text-[10px] font-semibold leading-[15px] text-label-quartenery">
                {row.currentChip}
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="text-[10px] leading-[15px] text-label-muted">
          {row.detail}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-sm font-semibold leading-[21px] text-label-primary">
          {row.value}
        </Text>
        {row.trend ? (
          <View className="flex-row items-center gap-0.5">
            {row.trend.tone === 'flat' ? null : (
              <Icon
                as={row.trend.tone === 'up' ? ArrowUpRight : ArrowDownRight}
                size={12}
                className={
                  row.trend.tone === 'up' ? 'text-trend-up' : 'text-trend-down'
                }
              />
            )}
            <Text
              className={cn(
                'text-[11px] font-semibold leading-[16.5px]',
                row.trend.tone === 'up' && 'text-trend-up',
                row.trend.tone === 'down' && 'text-trend-down',
                row.trend.tone === 'flat' && 'text-label-muted',
              )}
            >
              {row.trend.label}
            </Text>
          </View>
        ) : null}
        {row.caption ? (
          <Text className="text-[11px] leading-[16.5px] text-label-muted">
            {row.caption}
          </Text>
        ) : null}
      </View>
      <Icon as={ChevronRight} size={16} className="text-label-tertiary" />
    </>
  );
  const className = cn(
    'flex-row items-center gap-2.5 px-2 py-[11px]',
    isSelected
      ? 'rounded-[10px] bg-details-warm'
      : hasDivider && 'border-b border-border-warm',
  );

  if (!onSelect) {
    return (
      <View
        accessible
        accessibilityLabel={row.accessibilityLabel}
        className={className}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.accessibilityLabel}
      accessibilityState={{ selected: isSelected }}
      onPress={() => onSelect(row.id)}
      className={className}
    >
      {content}
    </Pressable>
  );
}

export function HourlyRateMonthsCard({
  title,
  titleCaption,
  titleVariant = 'eyebrow',
  rows,
  selectedId = null,
  onSelect,
  footerAction,
}: HourlyRateMonthsCardProps) {
  return (
    <Card className="gap-1 rounded-[14px] px-2 pb-[14px] pt-4 shadow-[0px_5px_10px_-3px_rgba(0,0,0,0.1)]">
      <View className="flex-row items-center gap-2 px-2 pb-1">
        <Text
          accessibilityRole="header"
          className={
            titleVariant === 'eyebrow'
              ? 'text-[11px] font-bold uppercase leading-[16.5px] tracking-[0.55px] text-label-primary'
              : 'text-[13px] font-bold leading-[19.5px] text-label-primary'
          }
        >
          {title}
        </Text>
        {titleCaption ? (
          <Text className="text-[11px] leading-[16.5px] text-label-muted">
            {titleCaption}
          </Text>
        ) : null}
      </View>

      <View>
        {rows.map((row, index) => (
          <MonthRow
            key={row.id}
            row={row}
            hasDivider={index < rows.length - 1 || Boolean(footerAction)}
            isSelected={row.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </View>

      {footerAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={footerAction.onPress}
          hitSlop={8}
          className="flex-row items-center gap-1 px-2 pt-2.5 active:opacity-70"
        >
          <Text className="text-xs font-semibold leading-[18px] text-label-quartenery">
            {footerAction.label}
          </Text>
          <Icon as={ChevronRight} size={14} className="text-label-quartenery" />
        </Pressable>
      ) : null}
    </Card>
  );
}
