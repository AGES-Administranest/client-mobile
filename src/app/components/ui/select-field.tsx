import { Check, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type SelectFieldOption<T extends string> = { value: T; label: string };

type SelectFieldProps<T extends string> = {
  label: string;
  options: readonly SelectFieldOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  /** Small text under the field, usually about the option chosen. */
  description?: string;
  className?: string;
};

// A dropdown that opens its list in place, under the field.
function SelectField<T extends string>({
  label,
  options,
  value,
  onValueChange,
  description,
  className,
}: SelectFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value);

  return (
    <View className={cn('gap-1', className)}>
      <Text className="text-xs font-semibold uppercase text-label-primary">
        {label}
      </Text>
      <Pressable
        onPress={() => setOpen(current => !current)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        className="flex-row items-center justify-between rounded-xl border border-border-primary bg-white px-4 py-3"
      >
        <Text className="text-[15px] text-label-primary">
          {selected?.label}
        </Text>
        <Icon
          as={ChevronDown}
          className={cn('size-4 text-label-tertiary', open && 'rotate-180')}
        />
      </Pressable>

      {open ? (
        <View className="overflow-hidden rounded-xl border border-border-primary bg-white">
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  'flex-row items-center justify-between px-4 py-3',
                  index > 0 && 'border-t border-border-primary',
                  isSelected && 'bg-details-primary',
                )}
              >
                <Text className="text-[15px] text-label-primary">
                  {option.label}
                </Text>
                {isSelected ? (
                  <Icon as={Check} className="size-4 text-label-quartenery" />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {description ? (
        <Text className="text-xs text-label-tertiary">{description}</Text>
      ) : null}
    </View>
  );
}

export { SelectField, type SelectFieldOption };
