import { Pressable, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type SexFieldOption<TValue extends string> = {
  value: TValue;
  label: string;
};

type SexFieldProps<TValue extends string> = {
  label: string;
  value: TValue | null;
  options: SexFieldOption<TValue>[];
  disabled?: boolean;
  onChange: (value: TValue | null) => void;
};

export function SexField<TValue extends string>({
  label,
  value,
  options,
  disabled,
  onChange,
}: SexFieldProps<TValue>) {
  return (
    <View className="mb-4 w-full">
      <Text className="mb-1.5 text-sm font-medium text-label-quartenery">
        {label}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map(option => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              // Tapping the chosen one again clears it: the field is optional.
              onPress={() => onChange(selected ? null : option.value)}
              className={cn(
                'rounded-full border px-4 py-2',
                selected
                  ? 'border-button-primary bg-button-primary'
                  : 'border-border-primary bg-label-secondary',
              )}
            >
              <Text
                className={cn(
                  'text-sm',
                  selected
                    ? 'font-semibold text-label-secondary'
                    : 'text-label-primary',
                )}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
