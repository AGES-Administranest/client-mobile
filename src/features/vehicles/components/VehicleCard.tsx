import { ChevronRight, Gauge } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Card } from 'app/components/ui/card';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

import { formatConsumption, formatCostPerKm } from '../domain/formatCostPerKm';
import type { Vehicle } from '../domain/vehicle.types';

type VehicleCardProps = {
  vehicle: Vehicle;
  onPress?: () => void;
  className?: string;
  deactivatedLabel: string;
};

export function VehicleCard({
  vehicle,
  onPress,
  className,
  deactivatedLabel,
}: VehicleCardProps) {
  const title = vehicle.model
    .toLowerCase()
    .startsWith(vehicle.brand.toLowerCase())
    ? vehicle.model
    : `${vehicle.brand} ${vehicle.model}`;

  const costText = formatCostPerKm(vehicle.costPerKm);
  const consumptionText = formatConsumption(vehicle.avgConsumptionKmL);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${costText}`}
      className="active:opacity-90"
    >
      <Card
        className={cn(
          'rounded-2xl bg-white p-4 shadow-sm shadow-black/5',
          className,
        )}
      >
        <View className="flex-row items-center justify-between">
          <View className="min-w-0 flex-1 pr-2">
            <Text
              className="text-base font-semibold text-label-primary"
              numberOfLines={1}
            >
              {title}
            </Text>
            <View className="flex-row items-center gap-1.5 pt-1">
              <Icon as={Gauge} size={14} className="text-label-tertiary" />
              <Text variant="muted" className="text-xs text-label-tertiary">
                {costText}
              </Text>
              {consumptionText ? (
                <Text variant="muted" className="text-xs text-label-tertiary">
                  {' · '}
                  {consumptionText}
                </Text>
              ) : null}
            </View>
            {!vehicle.active ? (
              <View className="mt-2 self-start rounded-md bg-alert-primary/10 px-2 py-0.5">
                <Text className="text-[11px] font-semibold text-alert-primary">
                  {deactivatedLabel}
                </Text>
              </View>
            ) : null}
          </View>
          <Icon as={ChevronRight} size={18} className="text-label-tertiary" />
        </View>
      </Card>
    </Pressable>
  );
}
