import { Pressable, View } from 'react-native';

import { CalculatorIcon } from 'app/components/ui/calculator-icon';
import { Text } from 'app/components/ui/text';

type FinanceHeaderProps = {
  title: string;
  calculatorLabel: string;
  onCalculatorPress: () => void;
};

export function FinanceHeader({
  title,
  calculatorLabel,
  onCalculatorPress,
}: FinanceHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-4 pb-2 pt-3">
      <Text
        accessibilityRole="header"
        className="text-3xl font-bold text-label-primary"
      >
        {title}
      </Text>
      <Pressable
        onPress={onCalculatorPress}
        accessibilityRole="button"
        accessibilityLabel={calculatorLabel}
        hitSlop={8}
        className="size-9 items-center justify-center rounded-full bg-button-primary active:opacity-80"
      >
        <CalculatorIcon size={20} />
      </Pressable>
    </View>
  );
}
