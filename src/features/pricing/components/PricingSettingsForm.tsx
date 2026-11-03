import { TextInput, View } from 'react-native';

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
  hints?: Partial<Record<PricingSettingsField, string>>;
  placeholders?: Partial<Record<PricingSettingsField, string>>;
};

type PricingSettingsFormProps = {
  draft: PricingSettingsDraft;
  fieldErrors: Partial<Record<PricingSettingsField, string>>;
  failureMessage: string | null;
  isSaving: boolean;
  texts: PricingSettingsFormTexts;
  onChangeField: (field: PricingSettingsField, value: string) => void;
  onBlurField?: (field: PricingSettingsField) => void;
  className?: string;
};

// The Figma "Metas" card has no button: the calculator saves a goal when its
// field loses focus, and the setup screen saves with "Salvar e calcular"
// below the fixed costs.
function PricingSettingsForm({
  draft,
  fieldErrors,
  failureMessage,
  isSaving,
  texts,
  onChangeField,
  onBlurField,
  className,
}: PricingSettingsFormProps) {
  return (
    <Card
      className={cn(
        'gap-0 rounded-[14px] p-4 shadow-[0px_5px_10px_-3px_rgba(0,0,0,0.1)]',
        className,
      )}
    >
      <Text className="text-[11px] font-bold uppercase leading-[16.5px] tracking-[0.55px] text-label-primary">
        {texts.title}
      </Text>

      {PRICING_SETTINGS_FIELDS.map(field => {
        const error = fieldErrors[field];
        const hint = texts.hints?.[field];
        return (
          <View key={field} className="gap-1 pt-2">
            <Text className="text-xs font-semibold uppercase leading-[18px] tracking-[0.48px] text-label-primary">
              {texts.labels[field]}
            </Text>
            <TextInput
              accessibilityLabel={texts.labels[field]}
              accessibilityHint={error}
              value={draft[field]}
              onChangeText={value => onChangeField(field, value)}
              onBlur={onBlurField ? () => onBlurField(field) : undefined}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder={texts.placeholders?.[field] ?? '0'}
              placeholderTextColor={LabelPlaceholder}
              selectionColor={LabelPrimary}
              editable={!isSaving}
              className={cn(
                'rounded-lg border bg-white px-4 py-[9.5px] text-sm leading-[21px] text-label-primary',
                error ? 'border-alert-primary' : 'border-border-primary',
              )}
            />
            {error ? (
              <Text className="text-[11px] leading-[16.5px] text-alert-primary">
                {error}
              </Text>
            ) : null}
            {hint ? (
              <Text className="text-[11px] leading-[16.5px] text-label-muted">
                {hint}
              </Text>
            ) : null}
          </View>
        );
      })}

      {failureMessage ? (
        <Text
          accessibilityLiveRegion="polite"
          role="alert"
          className="pt-3 text-sm text-alert-primary"
        >
          {failureMessage}
        </Text>
      ) : null}
    </Card>
  );
}

export { PricingSettingsForm };
export type { PricingSettingsFormProps, PricingSettingsFormTexts };
