import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text, TextClassContext } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

const actionButtonVariants = cva(
  'h-[49px] w-full flex-row items-center justify-center gap-2 rounded-full px-6',
  {
    variants: {
      variant: {
        primary: 'bg-primary active:opacity-90',
        secondary: 'bg-button-secondary active:opacity-90',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  },
);

type ActionButtonProps = React.ComponentProps<typeof Pressable> &
  VariantProps<typeof actionButtonVariants> & {
    label: string;
    icon?: ReactNode;

    labelMinWidth?: number;
  };

export function ActionButton({
  label,
  icon,
  labelMinWidth,
  variant,
  className,
  disabled,
  ...props
}: ActionButtonProps) {
  return (
    <Pressable
      role="button"
      accessibilityRole="button"
      disabled={disabled}
      className={cn(
        actionButtonVariants({ variant }),
        disabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      {icon ? (
        <TextClassContext.Provider value="text-label-secondary">
          <View className="h-4 w-4 items-center justify-center">{icon}</View>
        </TextClassContext.Provider>
      ) : null}
      <Text
        className="text-center text-sm font-medium text-label-secondary"
        style={labelMinWidth ? { minWidth: labelMinWidth } : undefined}
      >
        {label}
      </Text>
    </Pressable>
  );
}
