import { Check, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

export type ItemPickerOption = {
  id: string;
  name: string;
  caption?: string;
};

type ItemPickerProps = {
  label: string;
  placeholder: string;
  options: readonly ItemPickerOption[];
  selectedId: string | null;
  emptyMessage?: string;
  hasError?: boolean;
  onSelect: (id: string) => void;
};

export function ItemPicker({
  label,
  placeholder,
  options,
  selectedId,
  emptyMessage,
  hasError = false,
  onSelect,
}: ItemPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find(option => option.id === selectedId) ?? null;

  const choose = (id: string) => {
    onSelect(id);
    setIsOpen(false);
  };

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setIsOpen(open => !open)}
        className={cn(
          'flex-row items-center gap-2 border bg-white px-4 py-3',
          isOpen ? 'rounded-t-xl' : 'rounded-xl',
          hasError ? 'border-alert-primary' : 'border-border-primary',
        )}
      >
        <Text
          className={cn(
            'flex-1 text-base',
            selected ? 'text-label-primary' : 'text-label-tertiary',
          )}
          numberOfLines={1}
        >
          {selected ? selected.name : placeholder}
        </Text>
        <Icon
          as={isOpen ? ChevronUp : ChevronDown}
          className="size-4 text-label-tertiary"
        />
      </Pressable>

      {isOpen ? (
        <View
          className={cn(
            'overflow-hidden rounded-b-xl border border-t-0 bg-white',
            hasError ? 'border-alert-primary' : 'border-border-primary',
          )}
        >
          {options.length === 0 && emptyMessage ? (
            <Text className="px-4 py-3 text-sm text-label-tertiary">
              {emptyMessage}
            </Text>
          ) : null}
          {options.map((option, index) => {
            const isSelected = option.id === selectedId;
            return (
              <Pressable
                key={option.id}
                testID={`item-option-${option.id}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => choose(option.id)}
                className={cn(
                  'flex-row items-center gap-3 px-4 py-3',
                  index > 0 && 'border-t border-border-primary',
                  isSelected && 'bg-details-primary',
                )}
              >
                <Text
                  className="flex-1 text-base text-label-primary"
                  numberOfLines={1}
                >
                  {option.name}
                </Text>
                {option.caption ? (
                  <Text className="text-sm text-label-tertiary">
                    {option.caption}
                  </Text>
                ) : null}
                {isSelected ? (
                  <Icon as={Check} className="size-4 text-label-quartenery" />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
