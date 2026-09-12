import { TextInput, View, type TextInputProps } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

import { LabelPlaceholder } from '../../../theme/colors';

type TextFieldProps = Omit<TextInputProps, 'onChangeText' | 'value'> & {
  label: string;
  displayLabel?: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
};

export function TextField({
  label,
  displayLabel,
  error,
  className,
  ...props
}: TextFieldProps) {
  return (
    <View className="mb-4 w-full">
      <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-label-quartenery">
        {displayLabel ?? label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={LabelPlaceholder}
        className={cn(
          'h-12 rounded-xl border border-black/[0.08] bg-white px-4 text-base text-label-primary shadow-xs',
          error ? 'border-alert-primary' : 'border-black/[0.08]',
          className,
        )}
        {...props}
      />
      {error ? (
        <Text
          accessibilityRole="alert"
          className="mt-1 text-sm text-alert-primary"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
