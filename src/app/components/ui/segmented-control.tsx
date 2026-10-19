import { cva } from 'class-variance-authority';
import { Pressable, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

const segmentVariants = cva(
  'flex-1 basis-0 items-center justify-center rounded-lg px-2 py-2',
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
    <View
      className={cn(
        'flex-row items-stretch rounded-lg bg-white p-2',
        className,
      )}
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
    </View>
  );
}

export { SegmentedControl, type SegmentOption };
