import { Check, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
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
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import {
  ClientAutocomplete,
  type ClientAutocompleteMessages,
  type ClientOptionWithAddress,
  type ClientSearchStatus,
} from 'features/clients';
import { useSheetAnimation } from 'shared/hooks/useSheetAnimation';
import { LabelPlaceholder } from 'theme/colors';

import type {
  AsaClassification,
  ProcedureFormValues,
  ProcedureTextField,
  Species,
} from '../domain/procedure.types';

const SCREEN_HEIGHT = Dimensions.get('window').height;

// Altura de um campo multilinha: linhas de texto (20px) + padding e borda.
// Com 4 linhas dá 96px, o mesmo do antigo `h-24`.
const LINE_HEIGHT = 20;
const MULTILINE_CHROME = 16;

export type ProcedureFormTexts = {
  title: string;
  confirm: string;
  close: string;
  labels: Record<keyof ProcedureFormValues, string>;
  placeholders: Partial<Record<keyof ProcedureFormValues, string>>;
  speciesOptions: { value: Species; label: string }[];
  asaOptions: AsaClassification[];
  errors: Partial<Record<keyof ProcedureFormValues, string>>;
  clientSearchMessages: ClientAutocompleteMessages;
  locationHint: string;
  nameMaxLength: number;
  notesMaxLength: number;
};

export type ProcedureClientField = {
  term: string;
  status: ClientSearchStatus;
  options: ClientOptionWithAddress[];
  canRegister: boolean;
  onRegister: () => void;
};

type ProcedureFormSheetProps = {
  visible: boolean;
  onClosed?: () => void;
  registerClientLabel: string;
  values: ProcedureFormValues;
  submitting: boolean;
  submitFailed: boolean;
  submitErrorText: string;
  texts: ProcedureFormTexts;
  client: ProcedureClientField;
  showLocationHint: boolean;
  onChangeText: (key: ProcedureTextField, value: string) => void;
  onChangeClientTerm: (term: string) => void;
  onSelectClient: (client: ClientOptionWithAddress) => void;
  onChangeSpecies: (value: Species) => void;
  onChangeAsa: (value: AsaClassification) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function ProcedureFormSheet({
  visible,
  onClosed,
  registerClientLabel,
  values,
  submitting,
  submitFailed,
  submitErrorText,
  texts,
  client,
  showLocationHint,
  onChangeText,
  onChangeClientTerm,
  onSelectClient,
  onChangeSpecies,
  onChangeAsa,
  onSubmit,
  onClose,
}: ProcedureFormSheetProps) {
  const [speciesOpen, setSpeciesOpen] = useState(false);
  const selectedSpecies = texts.speciesOptions.find(
    option => option.value === values.species,
  );

  const sheet = useSheetAnimation(visible, onClose, onClosed);

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
              contentContainerClassName="pb-1"
            >
              <Field
                label={texts.labels.patientName}
                placeholder={texts.placeholders.patientName}
                value={values.patientName}
                error={texts.errors.patientName}
                maxLength={texts.nameMaxLength}
                onChangeText={v => onChangeText('patientName', v)}
              />
              <Field
                label={texts.labels.procedureName}
                placeholder={texts.placeholders.procedureName}
                value={values.procedureName}
                error={texts.errors.procedureName}
                maxLength={texts.nameMaxLength}
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
                addOption={
                  client.canRegister
                    ? { label: registerClientLabel, onPress: client.onRegister }
                    : undefined
                }
                onChangeText={onChangeClientTerm}
                onSelect={onSelectClient}
              />

              <Field
                label={texts.labels.location}
                placeholder={texts.placeholders.location}
                value={values.location}
                error={texts.errors.location}
                multiline
                numberOfLines={3}
                hint={showLocationHint ? texts.locationHint : undefined}
                onChangeText={v => onChangeText('location', v)}
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

              <Field
                label={texts.labels.notes}
                placeholder={texts.placeholders.notes}
                value={values.notes}
                error={texts.errors.notes}
                multiline
                maxLength={texts.notesMaxLength}
                onChangeText={v => onChangeText('notes', v)}
              />

              <View className="z-10 mb-3">
                <Text className="mb-1 text-xs font-semibold uppercase text-label-primary">
                  {texts.labels.species}
                </Text>
                <Pressable
                  onPress={() => setSpeciesOpen(open => !open)}
                  accessibilityRole="button"
                  className="flex-row items-center justify-between rounded-xl border border-border-primary bg-white px-4 py-2.5"
                >
                  <Text
                    className={
                      selectedSpecies
                        ? 'text-[15px] text-label-primary'
                        : 'text-[15px] text-label-tertiary'
                    }
                  >
                    {selectedSpecies?.label ?? texts.placeholders.species}
                  </Text>
                  <Icon
                    as={ChevronDown}
                    className="size-4 text-label-tertiary"
                  />
                </Pressable>

                {speciesOpen ? (
                  <View className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-border-primary bg-white">
                    {texts.speciesOptions.map((option, index) => (
                      <Pressable
                        key={option.value}
                        accessibilityRole="button"
                        onPress={() => {
                          onChangeSpecies(option.value);
                          setSpeciesOpen(false);
                        }}
                        className={
                          index === 0
                            ? 'px-4 py-3'
                            : 'border-t border-border-primary px-4 py-3'
                        }
                      >
                        <Text className="text-[15px] text-label-primary">
                          {option.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
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

            {submitFailed ? (
              <Text className="text-sm text-alert-primary">
                {submitErrorText}
              </Text>
            ) : null}

            <Button
              icon={Check}
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
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  hint,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 4,
  maxLength,
}: FieldProps) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-xs font-semibold uppercase text-label-primary">
        {label}
      </Text>
      <TextInput
        className="rounded-xl border border-border-primary bg-white px-4 py-2.5 text-[15px] text-label-primary"
        style={
          multiline
            ? { height: numberOfLines * LINE_HEIGHT + MULTILINE_CHROME }
            : undefined
        }
        placeholder={placeholder}
        placeholderTextColor={LabelPlaceholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
        numberOfLines={multiline ? numberOfLines : undefined}
        textAlignVertical={multiline ? 'top' : undefined}
      />
      {error ? (
        <Text className="mt-1 text-xs text-alert-primary">{error}</Text>
      ) : null}
      {hint && !error ? (
        <Text className="mt-1 text-xs text-label-tertiary">{hint}</Text>
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
