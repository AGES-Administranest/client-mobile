import { TextInput, View, type TextInputProps } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

import { LabelPlaceholder } from '../../../theme/colors';

type TextFieldProps = Omit<TextInputProps, 'onChangeText' | 'value'> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
};

export function TextField({
  label,
  error,
  className,
  ...props
}: TextFieldProps) {
  return (
    <View className="mb-4 w-full">
      <Text className="mb-1.5 text-sm font-medium text-label-quartenery">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={LabelPlaceholder}
        className={cn(
          'h-12 rounded-xl border bg-label-secondary px-4 text-base text-label-primary',
          error ? 'border-alert-primary' : 'border-border-primary',
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
