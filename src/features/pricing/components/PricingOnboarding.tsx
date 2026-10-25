import {
  Clock,
  Percent,
  SlidersHorizontal,
  Target,
  type LucideIcon,
} from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { CalculatorIcon } from 'app/components/ui/calculator-icon';
import { Card } from 'app/components/ui/card';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { LabelQuartenery } from 'theme/colors';

import type { PricingSettingsField } from '../domain/pricing.types';
import { PRICING_SETTINGS_FIELDS } from '../domain/validatePricingSettings';

type RequiredGoal = {
  title: string;
  caption: string;
};

export type PricingOnboardingProps = {
  title: string;
  message: string;
  goals: Record<PricingSettingsField, RequiredGoal>;
  actionLabel: string;
  onConfigure: () => void;
  footnote: string;
};

const GOAL_ICON: Record<PricingSettingsField, LucideIcon> = {
  monthlyIncomeGoal: Target,
  weeklyHours: Clock,
  safetyMarginPct: Percent,
};

// The "Estado inicial (sem configuração)" frame: what the calculator needs
// before it can show a rate, and the way into the setup screen.
export function PricingOnboarding({
  title,
  message,
  goals,
  actionLabel,
  onConfigure,
  footnote,
}: PricingOnboardingProps) {
  return (
    <Card className="items-center gap-[14px] rounded-[14px] px-5 py-6 shadow-[0px_5px_10px_-3px_rgba(0,0,0,0.1)]">
      <View className="size-14 items-center justify-center rounded-full bg-details-warm">
        <CalculatorIcon size={26} color={LabelQuartenery} />
      </View>
      <Text
        accessibilityRole="header"
        className="text-center text-base font-semibold leading-6 text-label-primary"
      >
        {title}
      </Text>
      <Text className="text-center text-[13px] leading-[19.5px] text-label-body">
        {message}
      </Text>

      <View className="w-full gap-2 py-1">
        {PRICING_SETTINGS_FIELDS.map(field => (
          <View
            key={field}
            accessible
            accessibilityLabel={`${goals[field].title}, ${goals[field].caption}`}
            className="flex-row items-center gap-3 rounded-[10px] bg-details-warm px-3 py-2.5"
          >
            <Icon
              as={GOAL_ICON[field]}
              size={18}
              className="text-label-quartenery"
            />
            <View className="min-w-0 flex-1">
              <Text className="text-[13px] font-medium leading-[19.5px] text-label-primary">
                {goals[field].title}
              </Text>
              <Text className="text-[11px] leading-[16.5px] text-label-muted">
                {goals[field].caption}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Button
        shape="pill"
        onPress={onConfigure}
        className="h-[49px] w-full bg-button-primary px-6"
      >
        <Icon
          as={SlidersHorizontal}
          size={16}
          className="text-label-secondary"
        />
        <Text className="text-[15px] font-medium leading-[21px] text-label-secondary">
          {actionLabel}
        </Text>
      </Button>

      <Text className="text-center text-[11px] leading-[16.5px] text-label-muted">
        {footnote}
      </Text>
    </Card>
  );
}
