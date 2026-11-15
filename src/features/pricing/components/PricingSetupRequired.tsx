import { FileText, SlidersHorizontal } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Card } from 'app/components/ui/card';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

export type PricingSetupRequiredProps = {
  title: string;
  message: string;
  footnote?: string;
  buttonLabel: string;
  onConfigure: () => void;
  className?: string;
};

export function PricingSetupRequired({
  title,
  message,
  footnote = 'Essa configuração será utilizada em todas as suas simulações de procedimentos.',
  buttonLabel,
  onConfigure,
  className,
}: PricingSetupRequiredProps) {
  return (
    <Card
      className={cn(
        'rounded-2xl border border-border-warm/40 bg-white p-5 shadow-sm',
        className,
      )}
    >
      <View className="mb-3 size-12 items-center justify-center rounded-2xl bg-details-warm">
        <Icon as={FileText} size={22} className="text-label-quartenery" />
      </View>

      <Text
        accessibilityRole="header"
        className="mb-2 text-base font-bold text-label-body"
      >
        {title}
      </Text>

      <Text className="mb-2 text-xs leading-5 text-label-body">{message}</Text>

      {footnote ? (
        <Text className="mb-4 text-xs leading-4 text-label-muted">
          {footnote}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={onConfigure}
        className="h-12 flex-row items-center justify-center gap-2 rounded-full bg-button-primary px-4 active:opacity-90"
      >
        <Icon
          as={SlidersHorizontal}
          size={16}
          className="text-label-secondary"
        />
        <Text className="text-xs font-semibold text-label-secondary">
          {buttonLabel}
        </Text>
      </Pressable>
    </Card>
  );
}
