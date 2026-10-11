import { Car } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { CalculatorIcon } from 'app/components/ui/calculator-icon';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

type FinanceHeaderProps = {
  title: string;
  calculatorLabel: string;
  onCalculatorPress: () => void;
  vehiclesLabel?: string;
  onVehiclesPress?: () => void;
};

export function FinanceHeader({
  title,
  calculatorLabel,
  onCalculatorPress,
  vehiclesLabel,
  onVehiclesPress,
}: FinanceHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-4 pb-2 pt-3">
      <Text
        accessibilityRole="header"
        className="text-3xl font-bold text-label-primary"
      >
        {title}
      </Text>
      <View className="flex-row items-center gap-2">
        {onVehiclesPress ? (
          <Pressable
            onPress={onVehiclesPress}
            accessibilityRole="button"
            accessibilityLabel={vehiclesLabel ?? 'Veículos'}
            hitSlop={8}
            className="size-9 items-center justify-center rounded-full bg-button-primary active:opacity-80"
          >
            <Icon as={Car} size={18} className="text-white" />
          </Pressable>
        ) : null}
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
    </View>
  );
}
