import { Check, Circle, X } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

import type { RequirementStatus } from '../domain/passwordReset';

type PasswordRequirementsProps = {
  heading: string | null;
  items: { id: string; label: string; status: RequirementStatus }[];
};

const STATUS_ICON = { met: Check, unmet: X, neutral: Circle } as const;

const STATUS_TEXT: Record<RequirementStatus, string> = {
  met: 'text-label-quartenery',
  unmet: 'text-button-secondary',
  neutral: 'text-label-tertiary',
};

export function PasswordRequirements({
  heading,
  items,
}: PasswordRequirementsProps) {
  return (
    <View className="mb-4 w-full">
      {heading ? (
        <Text
          accessibilityRole="alert"
          className="mb-1.5 text-xs text-button-secondary"
        >
          {heading}
        </Text>
      ) : null}
      {items.map(({ id, label, status }) => (
        <View key={id} className="mb-1 flex-row items-center">
          <Icon
            as={STATUS_ICON[status]}
            size={14}
            className={cn('mr-2', STATUS_TEXT[status])}
          />
          <Text className={cn('text-xs', STATUS_TEXT[status])}>{label}</Text>
        </View>
      ))}
    </View>
  );
}
