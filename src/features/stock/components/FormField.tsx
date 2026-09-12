import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { Input } from 'app/components/ui/input';
import { Text } from 'app/components/ui/text';

type FormFieldProps = ComponentProps<typeof Input> & {
  label: string;
  /** Already-translated error message; `undefined` hides the line. */
  error?: string;
};

// Label + Input + error line, the block every field in the Figma form repeats.
// Everything shown here arrives translated; the field only lays it out.
export function FormField({ label, error, ...inputProps }: FormFieldProps) {
  return (
    <View className="gap-1">
      <Text className="text-xs font-medium uppercase text-label-tertiary">
        {label}
      </Text>
      <Input
        placeholderTextColor="rgba(17, 17, 17, 0.5)"
        className="rounded-xl border-border-primary bg-white"
        {...inputProps}
      />
      {error ? (
        <Text className="text-xs text-alert-primary">{error}</Text>
      ) : null}
    </View>
  );
}
