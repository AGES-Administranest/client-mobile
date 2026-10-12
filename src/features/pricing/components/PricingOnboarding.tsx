import { Card } from 'app/components/ui/card';
import { EmptyState } from 'app/components/ui/empty-state';

type PricingOnboardingProps = {
  message: string;
};

export function PricingOnboarding({ message }: PricingOnboardingProps) {
  return (
    <Card className="px-5 py-6">
      <EmptyState align="start" message={message} />
    </Card>
  );
}
