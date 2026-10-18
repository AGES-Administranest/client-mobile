import { Lock, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

export function EntryFieldLabel({ children }: { children: string }) {
  return (
    <Text className="text-xs font-semibold uppercase text-label-primary">
      {children}
    </Text>
  );
}

export type EntryReadOnlyFieldProps = {
  label: string;
  value: string;
  accessibilityLabel: string;
  icon?: LucideIcon;
  /** Controlado pela origem: fundo cinza e cadeado, como no Figma. */
  locked?: boolean;
  className?: string;
};

export function EntryReadOnlyField({
  label,
  value,
  accessibilityLabel,
  icon,
  locked = false,
  className,
}: EntryReadOnlyFieldProps) {
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      className={cn('gap-1.5', className)}
    >
      <EntryFieldLabel>{label}</EntryFieldLabel>
      <View
        className={cn(
          'h-[43px] flex-row items-center gap-1.5 rounded-[10px] px-3',
          locked
            ? 'bg-details-primary'
            : 'border border-border-primary bg-white',
        )}
      >
        {icon ? (
          <Icon as={icon} size={14} className="text-label-primary" />
        ) : null}
        <Text
          numberOfLines={1}
          className={cn(
            'min-w-0 flex-1 text-sm text-label-primary',
            !locked && 'font-medium',
          )}
        >
          {value}
        </Text>
        {locked ? (
          <Icon as={Lock} size={16} className="text-label-tertiary" />
        ) : null}
      </View>
    </View>
  );
}
