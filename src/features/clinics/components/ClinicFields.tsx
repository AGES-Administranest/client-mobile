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

// The only field the backend requires.
const REQUIRED_FIELDS: ClinicField[] = ['name'];

type ClinicFieldTexts = {
  label: string;
  placeholder: string;
};

type ClinicInputProps = TextInputProps & {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
};

function ClinicInput({
  label,
  required,
  error,
  className,
  ...inputProps
}: ClinicInputProps) {
  return (
    <View className={cn('gap-1.5', className)}>
      <Text className="text-xs font-semibold uppercase leading-[18px] tracking-[0.48px] text-label-primary">
        {label}
        {required ? ' *' : ''}
      </Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        placeholderTextColor={LabelTertiary}
        selectionColor={LabelPrimary}
        className={cn(
          'h-[43px] rounded-[10px] border bg-white px-3 text-sm text-label-primary',
          error ? 'border-alert-primary' : 'border-border-primary',
        )}
      />
      {error ? (
        <Text className="text-xs text-alert-primary">{error}</Text>
      ) : null}
    </View>
  );
}

type ClinicFieldsSection = 'main' | 'contact';

type ClinicFieldsProps = {
  draft: ClinicDraft;
  fieldErrors: Partial<Record<ClinicField, string>>;
  fieldTexts: Record<ClinicField, ClinicFieldTexts>;
  editable?: boolean;
  showName?: boolean;
  /** Um passo do formulário: sem isto, todos os campos. */
  section?: ClinicFieldsSection;
  onChangeField: (field: ClinicField, value: string) => void;
};

function ClinicFields({
  draft,
  fieldErrors,
  fieldTexts,
  editable = true,
  showName = true,
  section,
  onChangeField,
}: ClinicFieldsProps) {
  const renderField = (field: ClinicField, className?: string) => (
    <ClinicInput
      {...INPUT_PROPS[field]}
      label={fieldTexts[field].label}
      required={REQUIRED_FIELDS.includes(field)}
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
      {section !== 'contact' ? (
        <>
          {showName ? renderField('name') : null}
          {renderField('cnpj')}
          {renderField('addressLine')}
          <View className="flex-row gap-3">
            {renderField('city', 'flex-1')}
            {renderField('state', 'w-20')}
          </View>
        </>
      ) : null}
      {section !== 'main' ? (
        <>
          {renderField('phone')}
          {renderField('email')}
          {renderField('contactName')}
        </>
      ) : null}
    </>
  );
}

export { ClinicFields };
export type { ClinicFieldsProps, ClinicFieldsSection, ClinicFieldTexts };
