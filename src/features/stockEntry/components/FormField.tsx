import { TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { LabelPlaceholder } from 'theme/colors';

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  className?: string;
};

/** Without `onChangeText` the value is shown in the same box, read-only. */
export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  className,
}: FormFieldProps) {
  return (
    <View className={cn('gap-1', className)}>
      <Text className="text-[11px] font-bold uppercase tracking-wide text-label-tertiary">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        editable={onChangeText !== undefined}
        placeholder={placeholder}
        placeholderTextColor={LabelPlaceholder}
        keyboardType={keyboardType}
        className={cn(
          'rounded-xl border border-border-primary px-3 py-2.5 text-sm text-label-primary',
          onChangeText ? 'bg-white' : 'bg-details-primary',
        )}
      />
    </View>
  );
}
