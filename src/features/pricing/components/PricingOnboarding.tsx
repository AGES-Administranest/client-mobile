import { Calculator } from 'lucide-react-native';

import { Button } from 'app/components/ui/button';
import { Card } from 'app/components/ui/card';
import { EmptyState } from 'app/components/ui/empty-state';
import { Text } from 'app/components/ui/text';

type PricingOnboardingProps = {
  message: string;
  configureLabel: string;
  onConfigure: () => void;
};

export function PricingOnboarding({
  message,
  configureLabel,
  onConfigure,
}: PricingOnboardingProps) {
  return (
    <Card className="items-stretch gap-0 pb-6">
      <EmptyState icon={Calculator} message={message} className="pb-6" />
      <Button shape="pill" className="h-[49px] w-full" onPress={onConfigure}>
        <Text className="font-semibold">{configureLabel}</Text>
      </Button>
    </Card>
  );
}
