import { View } from 'react-native';

import { Text } from 'app/components/ui/text';

type AcceptanceSummaryProps = {
  versionLabel: string;
  version: string;
  dateLabel: string;
  date: string;
  note: string;
};

export function AcceptanceSummary({
  versionLabel,
  version,
  dateLabel,
  date,
  note,
}: AcceptanceSummaryProps) {
  return (
    <View className="gap-3 rounded-2xl bg-white p-5 shadow-md shadow-black/10">
      <SummaryRow label={versionLabel} value={version} />
      <SummaryRow label={dateLabel} value={date} />
      <Text className="text-sm leading-5 text-label-muted">{note}</Text>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="text-sm text-label-muted">{label}</Text>
      <Text className="text-base font-semibold text-label-primary">
        {value}
      </Text>
    </View>
  );
}
