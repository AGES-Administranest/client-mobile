// LAYOUT PROVISÓRIO: aguardando protótipo do Figma
import { SlidersHorizontal } from 'lucide-react-native';

import { EmptyState } from 'app/components/ui/empty-state';

export type PricingSetupRequiredProps = {
  title: string;
  message: string;
  buttonLabel: string;
  onConfigure: () => void;
  className?: string;
};

export function PricingSetupRequired({
  title,
  message,
  buttonLabel,
  onConfigure,
  className,
}: PricingSetupRequiredProps) {
  return (
    <EmptyState
      icon={SlidersHorizontal}
      title={title}
      message={message}
      action={{
        label: buttonLabel,
        icon: SlidersHorizontal,
        onPress: onConfigure,
      }}
      className={className}
    />
  );
}
