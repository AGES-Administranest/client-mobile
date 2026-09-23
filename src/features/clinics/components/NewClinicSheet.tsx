import { Check } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { LabelPrimary, LabelTertiary } from 'theme/colors';

import {
  CLINIC_FIELD_MAX_LENGTH,
  type ClinicDraft,
  type ClinicField,
} from '../domain/clinicForm';

const SCREEN_HEIGHT = Dimensions.get('window').height;

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

type NewClinicSheetProps = {
  visible: boolean;
  draft: ClinicDraft;
  fieldErrors: Partial<Record<ClinicField, string>>;
  failureMessage: string | null;
  isSaving: boolean;
  title: string;
  fieldTexts: Record<ClinicField, ClinicFieldTexts>;
  confirmLabel: string;
  savingLabel: string;
  closeLabel: string;
  onChangeField: (field: ClinicField, value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
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
          'rounded-xl border bg-white px-4 py-3 text-[15px] text-label-primary',
          error ? 'border-alert-primary' : 'border-border-primary',
        )}
      />
      {error ? (
        <Text className="text-xs text-alert-primary">{error}</Text>
      ) : null}
    </View>
  );
}

function NewClinicSheet({
  visible,
  draft,
  fieldErrors,
  failureMessage,
  isSaving,
  title,
  fieldTexts,
  confirmLabel,
  savingLabel,
  closeLabel,
  onChangeField,
  onSubmit,
  onClose,
}: NewClinicSheetProps) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: visible ? 1 : 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: visible ? 0 : SCREEN_HEIGHT,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, backdropOpacity, sheetTranslateY]);

  const renderField = (field: ClinicField, className?: string) => (
    <ClinicInput
      {...INPUT_PROPS[field]}
      label={fieldTexts[field].label}
      placeholder={fieldTexts[field].placeholder}
      value={draft[field]}
      error={fieldErrors[field]}
      onChangeText={value => onChangeField(field, value)}
      className={className}
    />
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1 justify-end"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            onPress={onClose}
            className="flex-1 bg-background-shade"
          />
        </Animated.View>

        <Animated.View
          className="gap-4 rounded-t-3xl bg-background-modal px-5 pb-8 pt-4"
          style={{
            maxHeight: SCREEN_HEIGHT * 0.9,
            transform: [{ translateY: sheetTranslateY }],
          }}
        >
          <View className="h-1 w-10 self-center rounded-full bg-details-primary" />

          <Text className="text-xl font-bold text-label-primary">{title}</Text>

          <View className="h-px bg-details-primary" />

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="gap-4 pb-1"
          >
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
          </ScrollView>

          {failureMessage ? (
            <View className="rounded-xl border border-alert-primary bg-white p-3">
              <Text className="text-sm text-alert-primary">
                {failureMessage}
              </Text>
            </View>
          ) : null}

          <Button
            shape="pill"
            className="h-[49px] w-full"
            onPress={onSubmit}
            disabled={isSaving}
          >
            <Icon as={Check} className="size-5" />
            <Text className="font-semibold">
              {isSaving ? savingLabel : confirmLabel}
            </Text>
          </Button>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export { NewClinicSheet };
export type { NewClinicSheetProps };
