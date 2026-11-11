import { View } from 'react-native';

import { Card } from 'app/components/ui/card';
import { Text } from 'app/components/ui/text';

export type HourlyRateGoalRow = {
  label: string;
  value: string;
};

export type HourlyRateGoalsCardProps = {
  title: string;
  rows: HourlyRateGoalRow[];
};

// The Figma "Metas" card with the values as text: the same label over value
// as the calculator's form, minus the input box, for the goals a past month
// was calculated with.
export function HourlyRateGoalsCard({ title, rows }: HourlyRateGoalsCardProps) {
  return (
    <Card className="gap-0 rounded-[14px] p-4 shadow-[0px_5px_10px_-3px_rgba(0,0,0,0.1)]">
      <Text
        accessibilityRole="header"
        className="text-[11px] font-bold uppercase leading-[16.5px] tracking-[0.55px] text-label-primary"
      >
        {title}
      </Text>

      {rows.map(row => (
        <View
          key={row.label}
          accessible
          accessibilityLabel={`${row.label}: ${row.value}`}
          className="gap-1 pt-2"
        >
          <Text className="text-xs font-semibold uppercase leading-[18px] tracking-[0.48px] text-label-primary">
            {row.label}
          </Text>
          <Text className="text-sm leading-[21px] text-label-primary">
            {row.value}
          </Text>
        </View>
      ))}
    </Card>
  );
}
