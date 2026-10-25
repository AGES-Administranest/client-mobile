import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

type MonthSelectorProps = {
  label: string;
  caption?: string | null;
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
};

// The Figma "Seletor de mês" row. Finance draws it at the top of the net
// balance card and the hourly calculator on a card of its own, so the card
// stays with the caller.
export function MonthSelector({
  label,
  caption,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
}: MonthSelectorProps) {
  return (
    <View className="flex-row items-center justify-between">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={previousLabel}
        onPress={onPrevious}
        hitSlop={6}
        className="size-8 items-center justify-center rounded-full bg-button-primary active:opacity-80"
      >
        <Icon as={ChevronLeft} size={16} className="text-label-secondary" />
      </Pressable>
      <View
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={caption ? `${label}, ${caption}` : label}
        className="items-center"
      >
        <Text className="text-sm leading-[22.5px] tracking-[-0.15px] text-label-primary">
          {label}
        </Text>
        {caption ? (
          <Text className="text-[10px] font-semibold uppercase leading-[15px] tracking-[0.6px] text-label-primary">
            {caption}
          </Text>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={nextLabel}
        onPress={onNext}
        hitSlop={6}
        className="size-8 items-center justify-center rounded-full bg-button-primary active:opacity-80"
      >
        <Icon as={ChevronRight} size={16} className="text-label-secondary" />
      </Pressable>
    </View>
  );
}
