import { TextInput, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Card } from 'app/components/ui/card';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { LabelPlaceholder, LabelPrimary } from 'theme/colors';

import type {
  PricingSettingsDraft,
  PricingSettingsField,
} from '../domain/pricing.types';
import { PRICING_SETTINGS_FIELDS } from '../domain/validatePricingSettings';

type PricingSettingsFormTexts = {
  title: string;
  labels: Record<PricingSettingsField, string>;
  weeklyHoursHint: string;
  saveLabel: string;
  savingLabel: string;
};

type PricingSettingsFormProps = {
  draft: PricingSettingsDraft;
  fieldErrors: Partial<Record<PricingSettingsField, string>>;
  failureMessage: string | null;
  isSaving: boolean;
  texts: PricingSettingsFormTexts;
  onChangeField: (field: PricingSettingsField, value: string) => void;
  onSubmit: () => void;
  className?: string;
};

function PricingSettingsForm({
  draft,
  fieldErrors,
  failureMessage,
  isSaving,
  texts,
  onChangeField,
  onSubmit,
  className,
}: PricingSettingsFormProps) {
  return (
    <Card className={cn('gap-4', className)}>
      <Text className="text-xs font-semibold uppercase tracking-wide text-label-primary">
        {texts.title}
      </Text>

      {PRICING_SETTINGS_FIELDS.map(field => {
        const error = fieldErrors[field];
        return (
          <View key={field} className="gap-2">
            <Text className="text-xs font-semibold uppercase tracking-wide text-label-primary">
              {texts.labels[field]}
            </Text>
            <TextInput
              accessibilityLabel={texts.labels[field]}
              value={draft[field]}
              onChangeText={value => onChangeField(field, value)}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholderTextColor={LabelPlaceholder}
              selectionColor={LabelPrimary}
              editable={!isSaving}
              className={cn(
                'rounded-xl border bg-white px-4 py-2.5 text-[15px] text-label-primary',
                error ? 'border-alert-primary' : 'border-border-primary',
              )}
            />
            {error ? (
              <Text className="text-xs text-alert-primary">{error}</Text>
            ) : null}
            {field === 'weeklyHours' ? (
              <Text className="text-xs leading-[18px] text-label-tertiary">
                {texts.weeklyHoursHint}
              </Text>
            ) : null}
          </View>
        );
      })}

      {failureMessage ? (
        <Text className="text-sm text-alert-primary">{failureMessage}</Text>
      ) : null}

      <Button
        shape="pill"
        className="h-[49px] w-full bg-button-primary"
        onPress={onSubmit}
        disabled={isSaving}
      >
        <Text className="font-semibold">
          {isSaving ? texts.savingLabel : texts.saveLabel}
        </Text>
      </Button>
    </Card>
  );
}

export { PricingSettingsForm };
export type { PricingSettingsFormProps, PricingSettingsFormTexts };
