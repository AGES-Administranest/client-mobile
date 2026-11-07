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
  supportText?: string;
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
  supportText = 'Informe quanto tempo você estima dedicar ao atendimento',
  hoursLabel,
  minutesLabel,
  hoursPlaceholder = '0',
  minutesPlaceholder = '00',
  className,
}: DurationInputProps) {
  return (
    <Card
      className={cn(
        'gap-2 rounded-2xl border border-border-warm/40 bg-white p-4 shadow-sm',
        className,
      )}
    >
      <View className="flex-row items-center gap-2">
        <Icon as={Clock} size={18} className="text-label-quartenery" />
        <Text
          accessibilityRole="header"
          className="text-sm font-bold text-label-body"
        >
          {title}
        </Text>
      </View>

      {supportText ? (
        <Text className="text-xs text-label-muted">{supportText}</Text>
      ) : null}

      <View className="flex-row items-center gap-3 pt-1">
        {/* Campo Horas */}
        <View className="flex-1">
          <Text className="mb-1 text-xs font-bold tracking-wider text-label-body">
            {hoursLabel}
          </Text>
          <View
            className={cn(
              'h-12 flex-row items-center rounded-xl border border-border-warm bg-white px-3.5',
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
          </View>
        </View>

        {/* Campo Minutos */}
        <View className="flex-1">
          <Text className="mb-1 text-xs font-bold tracking-wider text-label-body">
            {minutesLabel}
          </Text>
          <View
            className={cn(
              'h-12 flex-row items-center rounded-xl border border-border-warm bg-white px-3.5',
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
          </View>
        </View>
      </View>

      {error ? (
        <Text className="pt-0.5 text-xs text-alert-primary">{error}</Text>
      ) : null}
    </Card>
  );
}
