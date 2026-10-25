import { ChevronRight } from 'lucide-react-native';
import { Pressable, TextInput, View } from 'react-native';

import { Card } from 'app/components/ui/card';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { LabelPlaceholder, LabelPrimary } from 'theme/colors';

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
  transportPlaceholder: string;
  transportHint: string;
  transportError: string | null;
  onTransportChange: (text: string) => void;
  onTransportBlur: () => void;
  isSaving: boolean;
  listLabel: string;
  onListPress: () => void;
};

export function FixedCostsCard({
  title,
  lines,
  totalLabel,
  totalValue,
  transportLabel,
  transportValue,
  transportPlaceholder,
  transportHint,
  transportError,
  onTransportChange,
  onTransportBlur,
  isSaving,
  listLabel,
  onListPress,
}: FixedCostsCardProps) {
  return (
    <Card className="gap-0 rounded-[14px] p-4 shadow-[0px_5px_10px_-3px_rgba(0,0,0,0.1)]">
      <Text className="mb-1.5 text-[11px] font-bold uppercase leading-[16.5px] tracking-[0.55px] text-label-primary">
        {title}
      </Text>

      {lines.map(line => (
        <View
          key={line.label}
          className="flex-row items-center justify-between gap-2 py-[7px]"
        >
          <View className="min-w-0 flex-1">
            <Text className="text-[13px] leading-[19.5px] text-label-primary">
              {line.label}
            </Text>
            {line.caption ? (
              <Text className="text-[10px] leading-[15px] text-label-muted">
                {line.caption}
              </Text>
            ) : null}
          </View>
          <Text className="text-right text-sm font-semibold leading-[21px] text-label-primary">
            {line.value}
          </Text>
        </View>
      ))}

      <View className="gap-1 border-y border-border-warm py-3">
        <Text className="text-xs font-semibold uppercase leading-[18px] tracking-[0.48px] text-label-primary">
          {transportLabel}
        </Text>
        <TextInput
          accessibilityLabel={transportLabel}
          value={transportValue}
          onChangeText={onTransportChange}
          onBlur={onTransportBlur}
          editable={!isSaving}
          keyboardType="decimal-pad"
          placeholder={transportPlaceholder}
          placeholderTextColor={LabelPlaceholder}
          selectionColor={LabelPrimary}
          className={cn(
            'rounded-lg border bg-white px-4 py-[9.5px] text-sm leading-[21px] text-label-primary',
            transportError ? 'border-alert-primary' : 'border-border-primary',
          )}
        />
        <Text
          className={cn(
            'text-[11px] leading-[16.5px]',
            transportError ? 'text-alert-primary' : 'text-label-primary',
          )}
        >
          {transportError ?? transportHint}
        </Text>
      </View>

      <View className="flex-row items-center pb-1 pt-3">
        <Text className="flex-1 text-[13px] font-semibold leading-[19.5px] text-label-primary">
          {totalLabel}
        </Text>
        <Text className="text-right text-[15px] font-bold leading-[22.5px] text-label-primary">
          {totalValue}
        </Text>
      </View>

      <Pressable
        accessibilityRole="link"
        onPress={onListPress}
        hitSlop={8}
        className="flex-row items-center gap-1 self-start pt-2 active:opacity-70"
      >
        <Text className="text-xs font-semibold leading-[18px] text-label-quartenery">
          {listLabel}
        </Text>
        <Icon as={ChevronRight} size={14} className="text-label-quartenery" />
      </Pressable>
    </Card>
  );
}
