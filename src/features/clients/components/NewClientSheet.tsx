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

import type { ClientType } from '../domain/client';
import {
  CLIENT_TYPES,
  NEW_CLIENT_NAME_MAX_LENGTH,
  NEW_CLIENT_PHONE_MAX_LENGTH,
  type NewClientDraft,
  type NewClientField,
} from '../domain/newClientForm';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const INPUT_PROPS: Record<NewClientField, TextInputProps> = {
  name: { autoCapitalize: 'words', maxLength: NEW_CLIENT_NAME_MAX_LENGTH },
  phone: {
    keyboardType: 'phone-pad',
    inputMode: 'tel',
    autoComplete: 'tel',
    maxLength: NEW_CLIENT_PHONE_MAX_LENGTH,
  },
};

type NewClientFieldTexts = {
  label: string;
  placeholder: string;
};

type NewClientSheetProps = {
  visible: boolean;
  draft: NewClientDraft;
  fieldErrors: Partial<Record<NewClientField, string>>;
  failureMessage: string | null;
  isSaving: boolean;
  title: string;
  typeLabel: string;
  typeTexts: Record<ClientType, string>;
  fieldTexts: Record<NewClientField, NewClientFieldTexts>;
  confirmLabel: string;
  savingLabel: string;
  cancelLabel: string;
  closeLabel: string;
  onChangeField: (field: NewClientField, value: string) => void;
  onChangeType: (type: ClientType) => void;
  onSubmit: () => void;
  onClose: () => void;
};

type ClientInputProps = TextInputProps & {
  label: string;
  error?: string;
};

function ClientInput({ label, error, ...inputProps }: ClientInputProps) {
  return (
    <View className="gap-2">
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

function NewClientSheet({
  visible,
  draft,
  fieldErrors,
  failureMessage,
  isSaving,
  title,
  typeLabel,
  typeTexts,
  fieldTexts,
  confirmLabel,
  savingLabel,
  cancelLabel,
  closeLabel,
  onChangeField,
  onChangeType,
  onSubmit,
  onClose,
}: NewClientSheetProps) {
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

  const renderField = (field: NewClientField) => (
    <ClientInput
      {...INPUT_PROPS[field]}
      label={fieldTexts[field].label}
      placeholder={fieldTexts[field].placeholder}
      value={draft[field]}
      error={fieldErrors[field]}
      onChangeText={value => onChangeField(field, value)}
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

        {/* A animação fica neste Animated.View e o visual no View de dentro:
            o className não é aplicado ao Animated.View na web (o sheet
            aparecia sem fundo e sem padding), como no NewClinicSheet. */}
        <Animated.View
          style={{
            maxHeight: SCREEN_HEIGHT * 0.9,
            transform: [{ translateY: sheetTranslateY }],
          }}
        >
          <View className="shrink gap-4 rounded-t-3xl bg-background-modal px-5 pb-8 pt-4">
            <View className="h-1 w-10 self-center rounded-full bg-details-primary" />

            <Text className="text-xl font-bold text-label-primary">
              {title}
            </Text>

            <View className="h-px bg-details-primary" />

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerClassName="gap-4 pb-1"
            >
              <View className="gap-2">
                <Text className="text-xs font-semibold uppercase text-label-primary">
                  {typeLabel}
                </Text>
                <View className="flex-row gap-2">
                  {CLIENT_TYPES.map(type => (
                    <TypeSegment
                      key={type}
                      label={typeTexts[type]}
                      active={draft.type === type}
                      onPress={() => onChangeType(type)}
                    />
                  ))}
                </View>
              </View>
              {renderField('name')}
              {renderField('phone')}
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

            <Button
              variant="link"
              className="h-auto self-center p-0"
              onPress={onClose}
            >
              <Text className="font-semibold">{cancelLabel}</Text>
            </Button>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type TypeSegmentProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function TypeSegment({ label, active, onPress }: TypeSegmentProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={
        active
          ? 'flex-1 items-center rounded-xl bg-button-primary py-3'
          : 'flex-1 items-center rounded-xl border border-border-primary bg-white py-3'
      }
    >
      <Text
        className={
          active ? 'font-semibold text-label-secondary' : 'text-label-primary'
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

export { NewClientSheet };
export type { NewClientSheetProps };
