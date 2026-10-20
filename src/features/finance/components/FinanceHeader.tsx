import { CarFront, MapPin } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { CalculatorIcon } from 'app/components/ui/calculator-icon';
import { Text } from 'app/components/ui/text';

type FinanceHeaderProps = {
  title: string;
  calculatorLabel: string;
  vehicleLabel: string;
  tripsLabel?: string;
  onVehiclePress: () => void;
  onCalculatorPress: () => void;
  onTripsPress?: () => void;
};

export function FinanceHeader({
  title,
  calculatorLabel,
  vehicleLabel,
  tripsLabel,
  onVehiclePress,
  onCalculatorPress,
  onTripsPress,
}: FinanceHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-4 pb-2 pt-3">
      <Text
        accessibilityRole="header"
        className="text-[40px] font-medium leading-[48px] text-label-primary"
      >
        {title}
      </Text>
      <View className="flex-row gap-2">
        {onTripsPress ? (
          <Pressable
            onPress={onTripsPress}
            accessibilityRole="button"
            accessibilityLabel={tripsLabel ?? 'Deslocamentos'}
            hitSlop={8}
            className="size-9 items-center justify-center rounded-full bg-button-primary active:opacity-80"
          >
            <MapPin size={18} color="white" />
          </Pressable>
        ) : null}
        <Pressable
          onPress={onVehiclePress}
          accessibilityRole="button"
          accessibilityLabel={vehicleLabel}
          hitSlop={8}
          className="size-9 items-center justify-center rounded-full bg-button-primary active:opacity-80"
        >
          <CarFront size={18} color="white" />
        </Pressable>
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
