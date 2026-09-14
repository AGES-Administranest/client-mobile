import { cva, type VariantProps } from 'class-variance-authority';
import { TriangleAlert } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

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
  belowMinimum?: boolean;
  className?: string;
  onPress?: () => void;
};

function MaterialCard({
  name,
  category,
  price,
  unit,
  quantity,
  minQuantity,
  belowMinimum = false,
  className,
  onPress,
}: MaterialCardProps) {
  const { t } = useTranslation();

  return (
    <Pressable onPress={onPress}>
      <Card
        variant="material"
        className={cn(
          'flex-col items-stretch',
          belowMinimum && 'border border-alert-primary',
          className,
        )}
      >
        <View className="w-full flex-row items-center justify-between">
          <View className="flex-1 gap-1">
            <Text className="font-bold" numberOfLines={1}>
              {name}
            </Text>
            <Text variant="muted">
              {category} · R$ {price.toFixed(2)}/{unit}
            </Text>
          </View>
          <View className="items-end gap-1">
            <Text className="text-1 font-bold">{quantity}</Text>
            <Text variant="muted" className="text-xs">
              min. {minQuantity}
            </Text>
          </View>
        </View>
        {belowMinimum && (
          <View className="mt-1 flex-row items-center gap-1.5">
            <Icon as={TriangleAlert} size={14} className="text-alert-primary" />
            <Text className="text-xs font-medium text-alert-primary">
              {t('materials.lowStockWarning')}
            </Text>
          </View>
        )}
      </Card>
    </Pressable>
  );
}

export { Card, cardVariants, MaterialCard };
export type { CardProps, MaterialCardProps };
