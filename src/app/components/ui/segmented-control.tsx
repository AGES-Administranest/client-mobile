import { cva } from 'class-variance-authority';
import { Pressable, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { useTranslation } from 'shared/i18n';

const SEGMENTS = [
  { value: 'supplies', labelKey: 'segmentedControl.supplies' },
  { value: 'equipment', labelKey: 'segmentedControl.equipment' },
] as const;

type SegmentValue = (typeof SEGMENTS)[number]['value'];

const segmentVariants = cva(
  'flex-1 basis-0 items-center justify-center rounded-lg px-2 py-2',
  {
    variants: {
      active: {
        true: 'bg-white shadow-sm shadow-black/5',
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

type SegmentedControlProps = {
  value: SegmentValue;
  onValueChange: (value: SegmentValue) => void;
  className?: string;
};

function SegmentedControl({
  value,
  onValueChange,
  className,
}: SegmentedControlProps) {
  const { t } = useTranslation();

  return (
    <View
      className={cn(
        'flex-row items-stretch rounded-lg bg-details-primary p-2',
        className,
      )}
    >
      {SEGMENTS.map(segment => {
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
              {t(segment.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export { SegmentedControl, type SegmentValue };
