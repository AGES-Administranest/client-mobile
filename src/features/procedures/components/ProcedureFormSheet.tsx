import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import {
  ClientAutocomplete,
  type ClientAutocompleteMessages,
  type ClientOption,
  type ClientSearchStatus,
} from 'features/clients';
import { LabelPlaceholder } from 'theme/colors';

import type {
  AsaClassification,
  ProcedureFormValues,
  ProcedureTextField,
  Species,
} from '../domain/procedure.types';

const TOP_GAP_RATIO = 0.08;

export type ProcedureFormTexts = {
  title: string;
  confirm: string;
  labels: Record<keyof ProcedureFormValues, string>;
  placeholders: Partial<Record<keyof ProcedureFormValues, string>>;
  speciesOptions: { value: Species; label: string }[];
  asaOptions: AsaClassification[];
  errors: Partial<Record<keyof ProcedureFormValues, string>>;
  clientSearchMessages: ClientAutocompleteMessages;
  newClient: string;
};

export type ProcedureClientField = {
  term: string;
  status: ClientSearchStatus;
  options: ClientOption[];
};

type ProcedureFormSheetProps = {
  visible: boolean;
  values: ProcedureFormValues;
  submitting: boolean;
  submitFailed: boolean;
  submitErrorText: string;
  texts: ProcedureFormTexts;
  client: ProcedureClientField;
  onChangeText: (key: ProcedureTextField, value: string) => void;
  onChangeClientTerm: (term: string) => void;
  onSelectClient: (client: ClientOption) => void;
  onPressNewClient: () => void;
  onChangeSpecies: (value: Species) => void;
  onChangeAsa: (value: AsaClassification) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function ProcedureFormSheet({
  visible,
  values,
  submitting,
  submitFailed,
  submitErrorText,
  texts,
  client,
  onChangeText,
  onChangeClientTerm,
  onSelectClient,
  onPressNewClient,
  onChangeSpecies,
  onChangeAsa,
  onSubmit,
  onClose,
}: ProcedureFormSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(windowHeight)).current;

  const topGap = Math.max(windowHeight * TOP_GAP_RATIO, insets.top);

  useEffect(() => {
    Animated.timing(overlayOpacity, {
      toValue: visible ? 1 : 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
    Animated.timing(sheetTranslateY, {
      toValue: visible ? 0 : windowHeight,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, windowHeight, overlayOpacity, sheetTranslateY]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View className="flex-1" style={{ opacity: overlayOpacity }}>
        <Pressable
          className="flex-1 justify-end bg-background-shade"
          onPress={onClose}
        >
          <Animated.View
            style={{ transform: [{ translateY: sheetTranslateY }] }}
          >
            <Pressable
              className="rounded-t-3xl bg-background-modal px-5 pt-4"
              style={{
                maxHeight: windowHeight - topGap,
                paddingBottom: insets.bottom + 12,
              }}
              onPress={e => e.stopPropagation()}
            >
              <View className="mb-3 h-1 w-10 self-center rounded-full bg-details-primary" />

              <Text className="mb-1 text-xl font-bold text-label-primary">
                {texts.title}
              </Text>
              <View className="mb-3 h-px bg-border-primary" />

              <ScrollView
                className="shrink grow-0"
                contentContainerClassName="pb-4"
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Field
                  label={texts.labels.patientName}
                  placeholder={texts.placeholders.patientName}
                  value={values.patientName}
                  error={texts.errors.patientName}
                  onChangeText={v => onChangeText('patientName', v)}
                />
                <Field
                  label={texts.labels.procedureName}
                  placeholder={texts.placeholders.procedureName}
                  value={values.procedureName}
                  error={texts.errors.procedureName}
                  onChangeText={v => onChangeText('procedureName', v)}
                />
                <ClientAutocomplete
                  label={texts.labels.clientId}
                  placeholder={texts.placeholders.clientId}
                  value={client.term}
                  error={texts.errors.clientId}
                  status={client.status}
                  options={client.options}
                  messages={texts.clientSearchMessages}
                  newClientLabel={texts.newClient}
                  onChangeText={onChangeClientTerm}
                  onSelect={onSelectClient}
                  onPressNewClient={onPressNewClient}
                />

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Field
                      label={texts.labels.patientAgeYears}
                      placeholder={texts.placeholders.patientAgeYears}
                      value={values.patientAgeYears}
                      error={texts.errors.patientAgeYears}
                      keyboardType="number-pad"
                      onChangeText={v => onChangeText('patientAgeYears', v)}
                    />
                  </View>
                  <View className="flex-1">
                    <Field
                      label={texts.labels.weightKg}
                      placeholder={texts.placeholders.weightKg}
                      value={values.weightKg}
                      error={texts.errors.weightKg}
                      keyboardType="decimal-pad"
                      onChangeText={v => onChangeText('weightKg', v)}
                    />
                  </View>
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Field
                      label={texts.labels.startTime}
                      placeholder={texts.placeholders.startTime}
                      value={values.startTime}
                      error={texts.errors.startTime}
                      keyboardType="number-pad"
                      onChangeText={v => onChangeText('startTime', v)}
                    />
                  </View>
                  <View className="flex-1">
                    <Field
                      label={texts.labels.endTime}
                      placeholder={texts.placeholders.endTime}
                      value={values.endTime}
                      error={texts.errors.endTime}
                      keyboardType="number-pad"
                      onChangeText={v => onChangeText('endTime', v)}
                    />
                  </View>
                </View>

                <Field
                  label={texts.labels.date}
                  placeholder={texts.placeholders.date}
                  value={values.date}
                  error={texts.errors.date}
                  keyboardType="number-pad"
                  onChangeText={v => onChangeText('date', v)}
                />

                <Field
                  label={texts.labels.amount}
                  placeholder={texts.placeholders.amount}
                  value={values.amount}
                  error={texts.errors.amount}
                  keyboardType="decimal-pad"
                  onChangeText={v => onChangeText('amount', v)}
                />

                <Text className="mb-1 mt-1 text-xs font-semibold uppercase text-label-primary">
                  {texts.labels.species}
                </Text>
                <View className="mb-3 flex-row gap-2">
                  {texts.speciesOptions.map(option => (
                    <Segment
                      key={option.value}
                      label={option.label}
                      active={values.species === option.value}
                      onPress={() => onChangeSpecies(option.value)}
                    />
                  ))}
                </View>

                <Text className="mb-1 text-xs font-semibold uppercase text-label-primary">
                  {texts.labels.asaClassification}
                </Text>
                <View className="mb-4 flex-row gap-2">
                  {texts.asaOptions.map(option => (
                    <Segment
                      key={option}
                      label={option}
                      active={values.asaClassification === option}
                      onPress={() => onChangeAsa(option)}
                    />
                  ))}
                </View>
              </ScrollView>

              <View className="pt-3">
                {submitFailed ? (
                  <Text className="mb-2 text-sm text-alert-primary">
                    {submitErrorText}
                  </Text>
                ) : null}

                <Button
                  shape="pill"
                  className="h-[49px] w-full"
                  disabled={submitting}
                  onPress={onSubmit}
                >
                  <Text className="font-semibold text-label-secondary">
                    {texts.confirm}
                  </Text>
                </Button>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType = 'default',
}: FieldProps) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-xs font-semibold uppercase text-label-primary">
        {label}
      </Text>
      <TextInput
        className="rounded-xl border border-border-primary bg-white px-4 py-3 text-base text-label-primary"
        placeholder={placeholder}
        placeholderTextColor={LabelPlaceholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
      {error ? (
        <Text className="mt-1 text-xs text-alert-primary">{error}</Text>
      ) : null}
    </View>
  );
}

type SegmentProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function Segment({ label, active, onPress }: SegmentProps) {
  return (
    <Pressable
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
