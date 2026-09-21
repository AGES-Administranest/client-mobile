import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type TermsCheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  disabled?: boolean;
};

export function TermsCheckbox({
  label,
  checked,
  onChange,
  error,
  disabled = false,
}: TermsCheckboxProps) {
  return (
    <View className="mb-4 w-full">
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ checked, disabled }}
        onPress={() => onChange(!checked)}
        disabled={disabled}
        className="flex-row items-start gap-3 active:opacity-70"
      >
        <View
          className={cn(
            'mt-0.5 size-5 items-center justify-center rounded-md border',
            checked
              ? 'border-button-primary bg-button-primary'
              : 'bg-label-secondary',
            !checked &&
              (error ? 'border-alert-primary' : 'border-border-primary'),
          )}
        >
          {checked ? (
            <Icon as={Check} className="size-3.5 text-label-secondary" />
          ) : null}
        </View>
        <Text className="flex-1 text-sm leading-5 text-label-primary">
          {label}
        </Text>
      </Pressable>
      {error ? (
        <Text
          accessibilityRole="alert"
          className="ml-8 mt-1 text-sm text-alert-primary"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
