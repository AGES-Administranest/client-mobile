import { TextInput, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { LabelPlaceholder } from 'theme/colors';

type FixedCostLine = {
  label: string;
  value: string;
  caption?: string;
};

export type FixedCostsCardProps = {
  title: string;
  lines: FixedCostLine[];
  totalLabel: string;
  totalValue: string;
  transportLabel: string;
  transportValue: string;
  transportHint: string;
  transportError: string | null;
  onTransportChange: (text: string) => void;
  onTransportBlur: () => void;
  isSaving: boolean;
};

export function FixedCostsCard({
  title,
  lines,
  totalLabel,
  totalValue,
  transportLabel,
  transportValue,
  transportHint,
  transportError,
  onTransportChange,
  onTransportBlur,
  isSaving,
}: FixedCostsCardProps) {
  return (
    <View className="gap-4 rounded-2xl bg-white p-4 shadow-md shadow-black/10">
      <Text className="text-[11px] font-bold uppercase tracking-wide text-label-primary">
        {title}
      </Text>

      <View className="gap-3">
        {lines.map(line => (
          <View
            key={line.label}
            className="flex-row items-center justify-between gap-3"
          >
            <View className="min-w-0 flex-1">
              <Text className="text-[15px] text-label-primary">
                {line.label}
              </Text>
              {line.caption ? (
                <Text className="text-[11px] text-label-tertiary">
                  {line.caption}
                </Text>
              ) : null}
            </View>
            <Text className="text-[15px] font-bold text-label-primary">
              {line.value}
            </Text>
          </View>
        ))}
      </View>

      <View className="h-px bg-border-primary" />

      <View className="gap-2">
        <Text className="text-[13px] font-bold uppercase tracking-wide text-label-primary">
          {transportLabel}
        </Text>
        <TextInput
          accessibilityLabel={transportLabel}
          value={transportValue}
          onChangeText={onTransportChange}
          onBlur={onTransportBlur}
          editable={!isSaving}
          keyboardType="decimal-pad"
          placeholder="0,00"
          placeholderTextColor={LabelPlaceholder}
          className={cn(
            'rounded-xl border px-3 py-2.5 text-[15px] text-label-primary',
            transportError ? 'border-alert-primary' : 'border-border-primary',
          )}
        />
        <Text
          className={cn(
            'text-xs',
            transportError ? 'text-alert-primary' : 'text-label-primary',
          )}
        >
          {transportError ?? transportHint}
        </Text>
      </View>

      <View className="h-px bg-border-primary" />

      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-[15px] font-bold text-label-primary">
          {totalLabel}
        </Text>
        <Text className="text-lg font-bold text-label-primary">
          {totalValue}
        </Text>
      </View>
    </View>
  );
}
