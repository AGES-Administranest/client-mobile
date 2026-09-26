import { TextInput, View, type TextInputProps } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { LabelPrimary, LabelTertiary } from 'theme/colors';

import {
  CLINIC_FIELD_MAX_LENGTH,
  type ClinicDraft,
  type ClinicField,
} from '../domain/clinicForm';

const INPUT_PROPS: Record<ClinicField, TextInputProps> = {
  name: { autoCapitalize: 'words', maxLength: CLINIC_FIELD_MAX_LENGTH.name },
  cnpj: { keyboardType: 'number-pad', inputMode: 'numeric' },
  addressLine: { maxLength: CLINIC_FIELD_MAX_LENGTH.addressLine },
  city: { autoCapitalize: 'words', maxLength: CLINIC_FIELD_MAX_LENGTH.city },
  state: {
    autoCapitalize: 'characters',
    autoCorrect: false,
    maxLength: CLINIC_FIELD_MAX_LENGTH.state,
  },
  phone: { keyboardType: 'phone-pad', inputMode: 'tel', autoComplete: 'tel' },
  email: {
    keyboardType: 'email-address',
    inputMode: 'email',
    autoCapitalize: 'none',
    autoCorrect: false,
    autoComplete: 'email',
  },
  contactName: {
    autoCapitalize: 'words',
    maxLength: CLINIC_FIELD_MAX_LENGTH.contactName,
  },
};

type ClinicFieldTexts = {
  label: string;
  placeholder: string;
};

type ClinicInputProps = TextInputProps & {
  label: string;
  error?: string;
  className?: string;
};

function ClinicInput({
  label,
  error,
  className,
  ...inputProps
}: ClinicInputProps) {
  return (
    <View className={cn('gap-2', className)}>
      <Text className="text-xs font-semibold uppercase text-label-primary">
        {label}
      </Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        placeholderTextColor={LabelTertiary}
        selectionColor={LabelPrimary}
        className={cn(
          'rounded-xl border bg-white px-4 py-2.5 text-[15px] text-label-primary',
          error ? 'border-alert-primary' : 'border-border-primary',
        )}
      />
      {error ? (
        <Text className="text-xs text-alert-primary">{error}</Text>
      ) : null}
    </View>
  );
}

type ClinicFieldsProps = {
  draft: ClinicDraft;
  fieldErrors: Partial<Record<ClinicField, string>>;
  fieldTexts: Record<ClinicField, ClinicFieldTexts>;
  editable?: boolean;
  onChangeField: (field: ClinicField, value: string) => void;
};

// Os mesmos campos, na mesma ordem e com o mesmo layout, no sheet de nova
// clínica e no de detalhes.
function ClinicFields({
  draft,
  fieldErrors,
  fieldTexts,
  editable = true,
  onChangeField,
}: ClinicFieldsProps) {
  const renderField = (field: ClinicField, className?: string) => (
    <ClinicInput
      {...INPUT_PROPS[field]}
      label={fieldTexts[field].label}
      placeholder={editable ? fieldTexts[field].placeholder : undefined}
      value={draft[field]}
      error={fieldErrors[field]}
      editable={editable}
      onChangeText={value => onChangeField(field, value)}
      className={className}
    />
  );

  return (
    <>
      {renderField('name')}
      {renderField('cnpj')}
      {renderField('addressLine')}
      <View className="flex-row gap-3">
        {renderField('city', 'flex-1')}
        {renderField('state', 'w-20')}
      </View>
      {renderField('phone')}
      {renderField('email')}
      {renderField('contactName')}
    </>
  );
}

export { ClinicFields };
export type { ClinicFieldsProps, ClinicFieldTexts };
