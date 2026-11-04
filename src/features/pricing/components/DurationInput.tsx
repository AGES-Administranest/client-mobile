// LAYOUT PROVISÓRIO: aguardando protótipo do Figma
import { Clock } from 'lucide-react-native';
import { TextInput, View } from 'react-native';

import { Card } from 'app/components/ui/card';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { LabelTertiary } from 'theme/colors';

export type DurationInputProps = {
  hours: string;
  minutes: string;
  error?: string | null;
  onChangeHours: (hours: string) => void;
  onChangeMinutes: (minutes: string) => void;
  title: string;
  hoursLabel: string;
  minutesLabel: string;
  hoursPlaceholder?: string;
  minutesPlaceholder?: string;
  className?: string;
};

export function DurationInput({
  hours,
  minutes,
  error,
  onChangeHours,
  onChangeMinutes,
  title,
  hoursLabel,
  minutesLabel,
  hoursPlaceholder = '0',
  minutesPlaceholder = '00',
  className,
}: DurationInputProps) {
  return (
    <Card
      className={cn(
        'gap-3 rounded-[14px] p-4 shadow-[0px_5px_10px_-3px_rgba(0,0,0,0.1)]',
        className,
      )}
    >
      <View className="flex-row items-center gap-2">
        <Icon as={Clock} size={18} className="text-label-quartenery" />
        <Text
          accessibilityRole="header"
          className="text-sm font-semibold uppercase tracking-wider text-label-primary"
        >
          {title}
        </Text>
      </View>

      <View className="flex-row items-center gap-3">
        {/* Campo Horas */}
        <View className="flex-1 gap-1">
          <Text className="text-[12px] font-medium text-label-body">
            {hoursLabel}
          </Text>
          <View
            className={cn(
              'h-12 flex-row items-center rounded-[10px] border border-details-primary bg-details-warm px-3',
              error && 'border-alert-primary',
            )}
          >
            <TextInput
              value={hours}
              onChangeText={onChangeHours}
              placeholder={hoursPlaceholder}
              placeholderTextColor={LabelTertiary}
              keyboardType="number-pad"
              maxLength={2}
              accessibilityLabel={hoursLabel}
              className="flex-1 text-base font-semibold text-label-primary"
            />
            <Text className="text-xs text-label-muted">h</Text>
          </View>
        </View>

        {/* Separador */}
        <Text className="mt-5 text-lg font-bold text-label-muted">:</Text>

        {/* Campo Minutos */}
        <View className="flex-1 gap-1">
          <Text className="text-[12px] font-medium text-label-body">
            {minutesLabel}
          </Text>
          <View
            className={cn(
              'h-12 flex-row items-center rounded-[10px] border border-details-primary bg-details-warm px-3',
              error && 'border-alert-primary',
            )}
          >
            <TextInput
              value={minutes}
              onChangeText={onChangeMinutes}
              placeholder={minutesPlaceholder}
              placeholderTextColor={LabelTertiary}
              keyboardType="number-pad"
              maxLength={2}
              accessibilityLabel={minutesLabel}
              className="flex-1 text-base font-semibold text-label-primary"
            />
            <Text className="text-xs text-label-muted">min</Text>
          </View>
        </View>
      </View>

      {error ? (
        <Text className="text-xs font-medium text-alert-primary">{error}</Text>
      ) : null}
    </Card>
  );
}
