import { View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

export type InvoiceDataRow = {
  label: string;
  value: string;
  emphasized?: boolean;
};

type InvoiceDataCardProps = {
  rows: InvoiceDataRow[];
};

export function InvoiceDataCard({ rows }: InvoiceDataCardProps) {
  return (
    <View className="rounded-2xl bg-white px-4 shadow-md shadow-black/10">
      {rows.map((row, index) => (
        <View
          key={row.label}
          className={cn(
            'gap-0.5 py-3',
            index > 0 && 'border-t border-details-primary',
          )}
        >
          <Text className="text-xs text-label-tertiary">{row.label}</Text>
          <Text
            className={cn(
              'text-[15px] text-label-primary',
              row.emphasized && 'text-xl font-bold',
            )}
          >
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
