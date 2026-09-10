import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

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
  className?: string;
};

function MaterialCard({
  name,
  category,
  price,
  unit,
  quantity,
  minQuantity,
  className,
}: MaterialCardProps) {
  const isLowStock = quantity <= minQuantity;

  return (
    <Card
      variant="material"
      className={cn(isLowStock && 'border border-red-500', className)}
    >
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
        {isLowStock ? (
          <Text variant="muted" className="text-[10px] text-red-500">
            Item abaixo da quantitade mínima
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

export { Card, cardVariants, MaterialCard };
export type { CardProps, MaterialCardProps };
