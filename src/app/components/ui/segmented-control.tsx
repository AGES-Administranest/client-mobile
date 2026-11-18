import { cva } from 'class-variance-authority';
import { Pressable, ScrollView } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

const segmentVariants = cva(
  'shrink-0 grow items-center justify-center rounded-lg px-4 py-2',
  {
    variants: {
      active: {
        true: 'bg-details-primary shadow-sm shadow-black/5',
        false: '',
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

const segmentTextVariants = cva('text-center text-[13px] leading-[19.5px]', {
  variants: {
    active: {
      true: 'text-label-primary font-semibold',
      false: 'text-label-tertiary font-semibold',
    },
  },
  defaultVariants: {
    active: false,
  },
});

type SegmentOption<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
};

function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    // Segments keep their text on one line at its natural width: they share
    // the row when it fits and scroll sideways when it does not.
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className={cn('grow-0 rounded-lg bg-white', className)}
      contentContainerClassName="min-w-full flex-row items-stretch gap-1 p-2"
    >
      {options.map(segment => {
        const active = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            onPress={() => onValueChange(segment.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={segmentVariants({ active })}
          >
            <Text className={segmentTextVariants({ active })}>
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export { SegmentedControl, type SegmentOption };
