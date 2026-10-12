import { Card } from 'app/components/ui/card';
import { Text } from 'app/components/ui/text';

type PricingOnboardingProps = {
  message: string;
};

export function PricingOnboarding({ message }: PricingOnboardingProps) {
  return (
    <Card className="px-5 py-6">
      <Text className="text-[15px] leading-[22px] text-label-primary">
        {message}
      </Text>
    </Card>
  );
}
