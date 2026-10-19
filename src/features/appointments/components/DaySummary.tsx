import { StyleSheet, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type DaySummaryProps = {
  count: number;
  revenue: string;
  labels: {
    attendances: string;
    day: string;
    revenue: string;
    estimated: string;
  };
};

export function DaySummary({ count, revenue, labels }: DaySummaryProps) {
  return (
    <View className="flex-row gap-3">
      {/* Figma: contagem em 28px, valor da receita em 22px. */}
      <SummaryCard
        title={labels.attendances}
        value={String(count)}
        valueClassName="text-[28px]"
      >
        {labels.day}
      </SummaryCard>
      <SummaryCard
        title={labels.revenue}
        value={revenue}
        valueClassName="text-[22px]"
      >
        {labels.estimated}
      </SummaryCard>
    </View>
  );
}

function SummaryCard({
  title,
  value,
  valueClassName,
  children,
}: {
  title: string;
  value: string;
  valueClassName: string;
  children: string;
}) {
  return (
    <View className="flex-1 gap-1 rounded-2xl bg-white p-4" style={styles.card}>
      <Text
        className="text-[11px] font-bold uppercase text-label-primary"
        numberOfLines={1}
      >
        {title}
      </Text>
      <Text className={cn('font-bold text-label-primary', valueClassName)}>
        {value}
      </Text>
      <Text className="text-xs text-label-tertiary">{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
});
