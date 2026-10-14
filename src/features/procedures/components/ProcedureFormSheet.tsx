import { Check, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { BottomSheet } from 'app/components/ui/bottom-sheet';
import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
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
  onChangeSpecies,
  onChangeAsa,
  onSubmit,
  onClose,
}: ProcedureFormSheetProps) {
  const [speciesOpen, setSpeciesOpen] = useState(false);
  const selectedSpecies = texts.speciesOptions.find(
    option => option.value === values.species,
  );

  return (
    <BottomSheet
      visible={visible}
      title={texts.title}
      closeLabel={texts.close}
      onClose={onClose}
      footer={
        <>
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
        </>
      }
    >
      {/* Um bloco só: os campos, o ClientAutocomplete incluído, já trazem a
          margem de baixo, e o gap do corpo do sheet somaria a ela. */}
      <View>
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
          onChangeText={onChangeClientTerm}
          onSelect={onSelectClient}
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
            <Icon as={ChevronDown} className="size-4 text-label-tertiary" />
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
      </View>
    </BottomSheet>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  multiline?: boolean;
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType = 'default',
  multiline = false,
}: FieldProps) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-xs font-semibold uppercase text-label-primary">
        {label}
      </Text>
      <TextInput
        className={
          multiline
            ? 'h-24 rounded-xl border border-border-primary bg-white px-4 py-2.5 text-[15px] text-label-primary'
            : 'rounded-xl border border-border-primary bg-white px-4 py-2.5 text-[15px] text-label-primary'
        }
        placeholder={placeholder}
        placeholderTextColor={LabelPlaceholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 4 : undefined}
        textAlignVertical={multiline ? 'top' : undefined}
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
