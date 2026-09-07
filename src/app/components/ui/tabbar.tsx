import {
  CalendarDays,
  DollarSign,
  FileText,
  Hospital,
  Package,
} from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { useTranslation } from 'shared/i18n';

const TABS = [
  { value: 'day', labelKey: 'tabbar.day', icon: CalendarDays },
  { value: 'finance', labelKey: 'tabbar.finance', icon: DollarSign },
  { value: 'materials', labelKey: 'tabbar.materials', icon: Package },
  { value: 'clinics', labelKey: 'tabbar.clinics', icon: Hospital },
  { value: 'reports', labelKey: 'tabbar.reports', icon: FileText },
] as const;

type TabValue = (typeof TABS)[number]['value'];

type TabBarProps = {
  value: TabValue;
  onValueChange: (value: TabValue) => void;
  className?: string;
};

function TabBar({ value, onValueChange, className }: TabBarProps) {
  const { t } = useTranslation();

  return (
    <View
      className={cn(
        'bg-white flex-row items-center rounded-full p-1',
        className,
      )}
    >
      {TABS.map(tab => {
        const active = tab.value === value;
        return (
          <Pressable
            key={tab.value}
            onPress={() => onValueChange(tab.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={cn(
              'flex-1 items-center gap-1 rounded-full py-2',
              active && 'bg-details-primary shadow-sm shadow-black/5',
            )}
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
          </Pressable>
        );
      })}
    </View>
  );
}

export { TabBar, type TabValue };
