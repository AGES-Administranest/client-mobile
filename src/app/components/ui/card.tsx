import { cva, type VariantProps } from 'class-variance-authority';
import { TriangleAlert } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { useTranslation } from 'shared/i18n';

const cardVariants = cva('bg-white rounded-2xl shadow-md shadow-black/10', {
  variants: {
    variant: {
      default: 'gap-1 p-4',
      material: 'flex-row items-center justify-between p-4',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type CardProps = React.ComponentProps<typeof View> &
  VariantProps<typeof cardVariants>;

function Card({ className, variant, ...props }: CardProps) {
  return (
    <View className={cn(cardVariants({ variant }), className)} {...props} />
  );
}

type MaterialCardProps = {
  name: string;
  category: string;
  price: number;
  unit: string;
  quantity: number;
  minQuantity: number;
  alerts?: readonly string[];
  className?: string;
};

function MaterialCard({
  name,
  category,
  price,
  unit,
  quantity,
  minQuantity,
  alerts = [],
  className,
}: MaterialCardProps) {
  const { t } = useTranslation();
  const isLowStock = quantity <= minQuantity;

  return (
    <Card
      variant="material"
      className={cn(
        'flex-col items-stretch gap-1 rounded-[14px]',
        (isLowStock || alerts.length > 0) && 'border-2 border-alert-primary',
        className,
      )}
    >
      <View className="flex-row items-start gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-sm font-semibold leading-[21px]">{name}</Text>
          <Text variant="muted" className="text-xs leading-[18px]">
            {category} · R$ {price.toFixed(2)}/{unit}
          </Text>
        </View>
        <View className="shrink-0 items-end">
          <Text className="text-lg font-bold leading-[27px]">{quantity}</Text>
          <Text variant="muted" className="text-[11px] leading-[17px]">
            min. {minQuantity}
          </Text>
        </View>
      </View>
      {isLowStock ? (
        <View className="flex-row items-center gap-[3px]">
          <Icon as={TriangleAlert} size={10} className="text-alert-primary" />
          <Text className="flex-1 text-xs leading-[18px] text-alert-primary">
            {t(
              quantity === minQuantity
                ? 'inventory.card.atMinimum'
                : 'inventory.card.belowMinimum',
            )}
          </Text>
        </View>
      ) : null}
      {alerts.map(alert => (
        <View key={alert} className="flex-row items-center gap-[3px]">
          <Icon as={TriangleAlert} size={10} className="text-alert-primary" />
          <Text className="flex-1 text-xs leading-[18px] text-alert-primary">
            {alert}
          </Text>
        </View>
      ))}
    </Card>
  );
}

export { Card, cardVariants, MaterialCard };
export type { CardProps, MaterialCardProps };
