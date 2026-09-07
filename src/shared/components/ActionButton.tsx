import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { cn } from 'app/lib/utils';

// Pill-shaped primary action button from the Figma design system (node 31:1237).
// Shared because the same button repeats across the stock-entry flow and other
// screens (scan capture, review confirm, menu actions, etc.).
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
    /** Optional leading icon, rendered to the left of the label. */
    icon?: ReactNode;
    /**
     * Minimum width (in points) reserved for the label.
     *
     * The icon and label are centered together as one group, so a shorter label
     * would otherwise push its icon further right than its neighbours'. Giving
     * every button in a stack the same value makes the groups equally wide, so
     * the icons line up in a column while each label stays centered — matching
     * the Figma menu, where the icons share a single x position.
     */
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
        <View className="h-4 w-4 items-center justify-center">{icon}</View>
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
