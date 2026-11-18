import {
  CalendarDays,
  DollarSign,
  FileText,
  Hospital,
  Package,
} from 'lucide-react-native';
import React from 'react';
import { Animated, Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { useTranslation } from 'shared/i18n';

const TABS = [
  { value: 'day', labelKey: 'tabbar.day', icon: CalendarDays },
  { value: 'finance', labelKey: 'tabbar.finance', icon: DollarSign },
  { value: 'materials', labelKey: 'tabbar.materials', icon: Package },
  { value: 'partners', labelKey: 'tabbar.partners', icon: Hospital },
  { value: 'reports', labelKey: 'tabbar.reports', icon: FileText },
] as const;

type TabValue = (typeof TABS)[number]['value'];

const ROW_PADDING = 4;
const INDICATOR_INSET = 2;

type TabBarProps = {
  value: TabValue;
  onValueChange: (value: TabValue) => void;
  className?: string;
};

function TabBar({ value, onValueChange, className }: TabBarProps) {
  const { t } = useTranslation();
  const [width, setWidth] = React.useState(0);
  const slide = React.useRef(new Animated.Value(0)).current;
  const cellWidth = (width - ROW_PADDING * 2) / TABS.length;
  const activeIndex = TABS.findIndex(tab => tab.value === value);

  React.useEffect(() => {
    Animated.spring(slide, {
      toValue: activeIndex * cellWidth,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
      mass: 0.8,
    }).start();
  }, [activeIndex, cellWidth, slide]);

  return (
    <View
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      className={cn(
        'bg-white flex-row items-center rounded-full p-1',
        className,
      )}
    >
      {width > 0 && (
        <Animated.View
          pointerEvents="none"
          className="absolute inset-y-1 rounded-[64px] bg-details-primary shadow-sm shadow-black/5"
          style={{
            left: ROW_PADDING + INDICATOR_INSET,
            width: cellWidth - INDICATOR_INSET * 2,
            transform: [{ translateX: slide }],
          }}
        />
      )}
      {TABS.map(tab => {
        const active = tab.value === value;
        return (
          <Pressable
            key={tab.value}
            onPress={() => onValueChange(tab.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className="flex-1 items-center py-2"
          >
            <View
              className={cn('items-center gap-1 rounded-[64px] px-3 py-1.5')}
            >
              <Icon
                as={tab.icon}
                className={cn(
                  'size-5',
                  active ? 'text-label-quartenery' : 'text-muted-foreground',
                )}
              />
              <Text
                className={cn(
                  'text-[10px]',
                  active
                    ? 'text-label-quartenery font-medium'
                    : 'text-muted-foreground',
                )}
              >
                {t(tab.labelKey)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export { TabBar, type TabValue };
