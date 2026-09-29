import { View } from 'react-native';

import { Text } from 'app/components/ui/text';

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
      <SummaryCard title={labels.attendances} value={String(count)}>
        {labels.day}
      </SummaryCard>
      <SummaryCard title={labels.revenue} value={revenue}>
        {labels.estimated}
      </SummaryCard>
    </View>
  );
}

function SummaryCard({
  title,
  value,
  children,
}: {
  title: string;
  value: string;
  children: string;
}) {
  return (
    <View className="flex-1 gap-1 rounded-2xl bg-white p-4 shadow-sm">
      <Text
        className="text-[11px] font-bold uppercase text-label-primary"
        numberOfLines={1}
      >
        {title}
      </Text>
      <Text className="text-2xl font-bold text-label-primary">{value}</Text>
      <Text className="text-xs text-label-tertiary">{children}</Text>
    </View>
  );
}
