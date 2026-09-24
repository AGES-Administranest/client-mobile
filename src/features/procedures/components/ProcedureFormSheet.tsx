import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';

import type {
  AsaClassification,
  ProcedureFormValues,
  ProcedureTextField,
  Species,
} from '../domain/procedure.types';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export interface ProcedureFormTexts {
  title: string;
  confirm: string;
  labels: Record<keyof ProcedureFormValues, string>;
  placeholders: Partial<Record<keyof ProcedureFormValues, string>>;
  speciesOptions: { value: Species; label: string }[];
  asaOptions: AsaClassification[];
  errors: Partial<Record<keyof ProcedureFormValues, string>>;
}

interface Props {
  visible: boolean;
  values: ProcedureFormValues;
  submitting: boolean;
  submitFailed: boolean;
  submitErrorText: string;
  texts: ProcedureFormTexts;
  onChangeText: (key: ProcedureTextField, value: string) => void;
  onChangeSpecies: (value: Species) => void;
  onChangeAsa: (value: AsaClassification) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function ProcedureFormSheet({
  visible,
  values,
  submitting,
  submitFailed,
  submitErrorText,
  texts,
  onChangeText,
  onChangeSpecies,
  onChangeAsa,
  onSubmit,
  onClose,
}: Props) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    Animated.timing(overlayOpacity, {
      toValue: visible ? 1 : 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
    Animated.timing(sheetTranslateY, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, overlayOpacity, sheetTranslateY]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
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
              className="rounded-t-3xl bg-background-modal px-5 pb-10 pt-4"
              onPress={e => e.stopPropagation()}
            >
              <View className="mb-2 h-1 w-10 self-center rounded-full bg-details-primary" />
              <Text className="mb-1 text-xl font-bold text-label-primary">
                {texts.title}
              </Text>
              <View className="mb-3 h-px bg-border-primary" />

              <ScrollView
                showsVerticalScrollIndicator={false}
                className="max-h-[70vh]"
              >
                <TextField
                  label={texts.labels.patientName}
                  placeholder={texts.placeholders.patientName}
                  value={values.patientName}
                  error={texts.errors.patientName}
                  onChangeText={v => onChangeText('patientName', v)}
                />
                <TextField
                  label={texts.labels.procedureName}
                  placeholder={texts.placeholders.procedureName}
                  value={values.procedureName}
                  error={texts.errors.procedureName}
                  onChangeText={v => onChangeText('procedureName', v)}
                />
                <TextField
                  label={texts.labels.location}
                  placeholder={texts.placeholders.location}
                  value={values.location}
                  error={texts.errors.location}
                  onChangeText={v => onChangeText('location', v)}
                />

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <TextField
                      label={texts.labels.patientAgeYears}
                      value={values.patientAgeYears}
                      error={texts.errors.patientAgeYears}
                      keyboardType="number-pad"
                      onChangeText={v => onChangeText('patientAgeYears', v)}
                    />
                  </View>
                  <View className="flex-1">
                    <TextField
                      label={texts.labels.weightKg}
                      value={values.weightKg}
                      error={texts.errors.weightKg}
                      keyboardType="decimal-pad"
                      onChangeText={v => onChangeText('weightKg', v)}
                    />
                  </View>
                </View>

                <TextField
                  label={texts.labels.amount}
                  value={values.amount}
                  error={texts.errors.amount}
                  keyboardType="decimal-pad"
                  onChangeText={v => onChangeText('amount', v)}
                />

                <Text className="mb-1 mt-1 text-xs font-bold uppercase text-label-tertiary">
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

                <Text className="mb-1 text-xs font-bold uppercase text-label-tertiary">
                  {texts.labels.asaClassification}
                </Text>
                <View className="mb-3 flex-row gap-2">
                  {texts.asaOptions.map(option => (
                    <Segment
                      key={option}
                      label={option}
                      active={values.asaClassification === option}
                      onPress={() => onChangeAsa(option)}
                    />
                  ))}
                </View>

                <TextField
                  label={texts.labels.notes}
                  value={values.notes}
                  error={texts.errors.notes}
                  multiline
                  onChangeText={v => onChangeText('notes', v)}
                />

                {submitFailed ? (
                  <Text className="mb-2 text-sm text-alert-primary">
                    {submitErrorText}
                  </Text>
                ) : null}

                <Button
                  shape="pill"
                  className="mt-2 h-[49px] w-full"
                  disabled={submitting}
                  onPress={onSubmit}
                >
                  <Text className="font-semibold text-label-secondary">
                    {texts.confirm}
                  </Text>
                </Button>
              </ScrollView>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
}

function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  multiline,
  keyboardType = 'default',
}: TextFieldProps) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-xs font-bold uppercase text-label-tertiary">
        {label}
      </Text>
      <TextInput
        className="rounded-xl border border-border-primary px-4 py-3 text-label-primary"
        placeholder={placeholder}
        placeholderTextColor="rgba(17, 17, 17, 0.5)"
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
      />
      {error ? (
        <Text className="mt-1 text-xs text-alert-primary">{error}</Text>
      ) : null}
    </View>
  );
}

interface SegmentProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function Segment({ label, active, onPress }: SegmentProps) {
  return (
    <Pressable
      onPress={onPress}
      className={
        active
          ? 'flex-1 items-center rounded-xl bg-button-primary py-3'
          : 'flex-1 items-center rounded-xl border border-border-primary py-3'
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
