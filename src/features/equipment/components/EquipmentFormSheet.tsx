import { Check } from 'lucide-react-native';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import { useSheetAnimation } from 'shared/hooks/useSheetAnimation';
import { LabelPlaceholder } from 'theme/colors';

import type { EquipmentFormMode } from '../domain/equipment.types';
import type {
  EquipmentFormField,
  EquipmentFormValues,
} from '../domain/validateEquipmentForm';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const NAME_MAX_LENGTH = 120;
const NOTES_MAX_LENGTH = 1000;
const DATE_MAX_LENGTH = 10;
const USEFUL_LIFE_MAX_LENGTH = 3;

export type EquipmentFormTexts = {
  title: string;
  confirm: string;
  startEdit: string;
  delete: string;
  close: string;
  labels: Record<EquipmentFormField, string>;
  placeholders: Record<EquipmentFormField, string>;
  usefulLifeHint: string;
};

type EquipmentFormSheetProps = {
  visible: boolean;
  mode: EquipmentFormMode;
  values: EquipmentFormValues;
  errors: Partial<Record<EquipmentFormField, string>>;
  texts: EquipmentFormTexts;
  /** Substitui o aviso padrão da vida útil, ex.: "Vida útil atual: 18 meses…". */
  usefulLifeNotice: string | null;
  previewLabel: string;
  previewValue: string;
  previewNote: string | null;
  /** Em `view`, no lugar do campo de anos: ele não mostra meses quebrados. */
  usefulLifeViewText: string | null;
  submitErrorText: string | null;
  isSubmitting: boolean;
  onChangeText: (field: EquipmentFormField, text: string) => void;
  onBlur: (field: EquipmentFormField) => void;
  onStartEdit: () => void;
  onSubmit: () => void;
  /** Sem ela o "Excluir" não aparece: a ação chega com a subtask de inativar. Só existe na edição, como em Clínicas. */
  onDelete?: () => void;
  onClose: () => void;
};

export function EquipmentFormSheet({
  visible,
  mode,
  values,
  errors,
  texts,
  usefulLifeNotice,
  previewLabel,
  previewValue,
  previewNote,
  usefulLifeViewText,
  submitErrorText,
  isSubmitting,
  onChangeText,
  onBlur,
  onStartEdit,
  onSubmit,
  onDelete,
  onClose,
}: EquipmentFormSheetProps) {
  const sheet = useSheetAnimation(visible, onClose);
  const isView = mode === 'view';

  function field(
    name: EquipmentFormField,
    extra: Partial<React.ComponentProps<typeof Field>> = {},
  ) {
    return (
      <Field
        label={texts.labels[name]}
        placeholder={isView ? '' : texts.placeholders[name]}
        value={values[name]}
        error={errors[name]}
        readOnly={isView}
        onChangeText={text => onChangeText(name, text)}
        onBlur={() => onBlur(name)}
        {...extra}
      />
    );
  }

  return (
    <Modal
      visible={sheet.isRendered}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1 justify-end"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: sheet.progress }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={texts.close}
            onPress={onClose}
            className="flex-1 bg-background-shade"
          />
        </Animated.View>

        <Animated.View
          {...sheet.panHandlers}
          style={{
            maxHeight: SCREEN_HEIGHT * 0.99,
            ...sheet.sheetStyle,
          }}
        >
          <View className="shrink gap-3 rounded-t-3xl bg-background-modal px-5 pb-8 pt-4">
            <View className="h-1 w-10 self-center rounded-full bg-details-primary" />

            <Text className="text-xl font-bold text-label-primary">
              {texts.title}
            </Text>

            <View className="h-px bg-details-primary" />

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerClassName="gap-4 pb-1"
            >
              {isView ? null : field('name', { maxLength: NAME_MAX_LENGTH })}
              {field('purchaseValue', { keyboardType: 'decimal-pad' })}
              {field('acquisitionDate', {
                keyboardType: 'number-pad',
                maxLength: DATE_MAX_LENGTH,
              })}
              {field('notes', { maxLength: NOTES_MAX_LENGTH })}
              {field('usefulLifeYears', {
                keyboardType: 'number-pad',
                maxLength: USEFUL_LIFE_MAX_LENGTH,
                value: isView
                  ? usefulLifeViewText ?? values.usefulLifeYears
                  : values.usefulLifeYears,
                hint: isView
                  ? undefined
                  : usefulLifeNotice ?? texts.usefulLifeHint,
              })}
            </ScrollView>

            <View className="gap-1">
              <Text className="text-xs text-label-tertiary">
                {previewLabel}{' '}
                <Text className="text-xs font-semibold text-label-tertiary">
                  {previewValue}
                </Text>
              </Text>
              {previewNote ? (
                <Text className="text-xs text-label-tertiary">
                  {previewNote}
                </Text>
              ) : null}
            </View>

            {submitErrorText && !isView ? (
              <Text className="text-sm text-destructive">
                {submitErrorText}
              </Text>
            ) : null}

            {isView ? (
              <Button
                shape="pill"
                className="h-[49px] w-full"
                onPress={onStartEdit}
              >
                <Text className="font-semibold text-label-secondary">
                  {texts.startEdit}
                </Text>
              </Button>
            ) : (
              <View className="gap-3">
                <Button
                  icon={mode === 'create' ? Check : undefined}
                  shape="pill"
                  className="h-[49px] w-full"
                  disabled={isSubmitting}
                  onPress={onSubmit}
                >
                  <Text className="font-semibold text-label-secondary">
                    {texts.confirm}
                  </Text>
                </Button>
                {mode === 'edit' && onDelete ? (
                  <Button
                    variant="secondary"
                    shape="pill"
                    className="h-[49px] w-full"
                    disabled={isSubmitting}
                    onPress={onDelete}
                  >
                    <Text className="font-semibold text-label-secondary">
                      {texts.delete}
                    </Text>
                  </Button>
                ) : null}
              </View>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type FieldProps = {
  label: string;
  value: string;
  placeholder: string;
  error?: string;
  hint?: string;
  maxLength?: number;
  readOnly?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  onChangeText: (value: string) => void;
  onBlur: () => void;
};

function Field({
  label,
  value,
  placeholder,
  error,
  hint,
  maxLength,
  readOnly = false,
  keyboardType = 'default',
  onChangeText,
  onBlur,
}: FieldProps) {
  const border = error ? 'border-destructive' : 'border-details-primary';

  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase text-label-primary">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        className={`rounded-xl border bg-white px-4 py-3 text-[15px] text-label-primary ${border}`}
        placeholder={placeholder}
        placeholderTextColor={LabelPlaceholder}
        value={value}
        maxLength={maxLength}
        keyboardType={keyboardType}
        editable={!readOnly}
        showSoftInputOnFocus={!readOnly}
        onChangeText={onChangeText}
        onBlur={onBlur}
      />
      {error ? <Text className="text-xs text-destructive">{error}</Text> : null}
      {hint ? (
        <Text className="text-xs text-label-tertiary">{hint}</Text>
      ) : null}
    </View>
  );
}
