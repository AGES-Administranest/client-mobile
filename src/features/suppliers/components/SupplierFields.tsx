import { TextInput, View, type TextInputProps } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { LabelPrimary, LabelTertiary } from 'theme/colors';

import {
  SUPPLIER_FIELD_MAX_LENGTH,
  type SupplierDraft,
  type SupplierField,
} from '../domain/supplierForm';

const INPUT_PROPS: Record<SupplierField, TextInputProps> = {
  name: { autoCapitalize: 'words', maxLength: SUPPLIER_FIELD_MAX_LENGTH.name },
  email: {
    keyboardType: 'email-address',
    inputMode: 'email',
    autoCapitalize: 'none',
    autoCorrect: false,
    autoComplete: 'email',
    maxLength: SUPPLIER_FIELD_MAX_LENGTH.email,
  },
  address: { maxLength: SUPPLIER_FIELD_MAX_LENGTH.address },
  phone: {
    keyboardType: 'phone-pad',
    inputMode: 'tel',
    autoComplete: 'tel',
    maxLength: SUPPLIER_FIELD_MAX_LENGTH.phone,
  },
};

type SupplierFieldTexts = {
  label: string;
  placeholder: string;
};

type SupplierFieldsProps = {
  draft: SupplierDraft;
  fieldErrors: Partial<Record<SupplierField, string>>;
  fieldTexts: Record<SupplierField, SupplierFieldTexts>;
  editable?: boolean;
  showName?: boolean;
  onChangeField: (field: SupplierField, value: string) => void;
};

function SupplierFields({
  draft,
  fieldErrors,
  fieldTexts,
  editable = true,
  showName = true,
  onChangeField,
}: SupplierFieldsProps) {
  const fields: SupplierField[] = showName
    ? ['name', 'email', 'address', 'phone']
    : ['email', 'address', 'phone'];

  return (
    <>
      {fields.map(field => (
        <View key={field} className="gap-1.5">
          <Text className="text-xs font-semibold uppercase leading-[18px] tracking-[0.48px] text-label-primary">
            {fieldTexts[field].label}
          </Text>
          <TextInput
            {...INPUT_PROPS[field]}
            accessibilityLabel={fieldTexts[field].label}
            placeholder={editable ? fieldTexts[field].placeholder : undefined}
            editable={editable}
            placeholderTextColor={LabelTertiary}
            selectionColor={LabelPrimary}
            value={draft[field]}
            onChangeText={value => onChangeField(field, value)}
            className={cn(
              'h-[43px] rounded-[10px] border bg-white px-3 text-sm text-label-primary',
              fieldErrors[field]
                ? 'border-alert-primary'
                : 'border-border-primary',
            )}
          />
          {fieldErrors[field] ? (
            <Text className="text-xs text-alert-primary">
              {fieldErrors[field]}
            </Text>
          ) : null}
        </View>
      ))}
    </>
  );
}

export { SupplierFields };
export type { SupplierFieldsProps, SupplierFieldTexts };
