import { Check, ChevronDown } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { useSheetAnimation } from 'shared/hooks';
import { BackgroundShade, LabelTertiary } from 'theme/colors';

import {
  ASA_CLASSES,
  SPECIES_OPTIONS,
  type AppointmentDraft,
  type AppointmentErrorCode,
  type AppointmentErrors,
  type AsaClass,
  type Species,
} from '../domain/appointment';
import type { ServiceTaker } from '../services/serviceTakerService';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_MAX_HEIGHT_RATIO = 0.92;

const styles = StyleSheet.create({
  // O teto de altura fica na coluna que contém o ScrollView, e não no wrapper
  // animado: é ele que precisa ter altura resolvida para o `flexShrink` do
  // ScrollView valer. Com o teto só no wrapper, a coluna crescia até o tamanho
  // do formulário inteiro, o ScrollView recebia toda essa altura e não sobrava
  // nada para rolar.
  sheet: { maxHeight: SCREEN_HEIGHT * SHEET_MAX_HEIGHT_RATIO },
  scroll: { flexShrink: 1 },
});

export type AppointmentFormLabels = {
  title: string;
  cancel: string;
  patient: string;
  patientPlaceholder: string;
  procedure: string;
  procedurePlaceholder: string;
  clinic: string;
  clinicPlaceholder: string;
  age: string;
  agePlaceholder: string;
  weight: string;
  weightPlaceholder: string;
  startTime: string;
  endTime: string;
  timePlaceholder: string;
  date: string;
  datePlaceholder: string;
  amount: string;
  amountPlaceholder: string;
  species: string;
  asa: string;
  notes: string;
  notesPlaceholder: string;
  confirm: string;
};

type AppointmentFormSheetProps = {
  visible: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  draft: AppointmentDraft;
  errors: AppointmentErrors;
  serviceTakers: readonly ServiceTaker[];
  isSaving: boolean;
  onDateChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onClientChange: (clientId: string) => void;
  onPatientNameChange: (value: string) => void;
  onProcedureNameChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onSpeciesChange: (species: Species) => void;
  onAgeYearsChange: (value: string) => void;
  onWeightKgChange: (value: string) => void;
  onAsaClassChange: (asaClass: AsaClass) => void;
  onNotesChange: (value: string) => void;
  labels: AppointmentFormLabels;
  speciesLabels: Record<Species, string>;
  errorMessages: Record<AppointmentErrorCode, string>;
  failureMessage: string | null;
  /**
   * Folhas que abrem por cima desta (confirmação de descarte, alerta de
   * conflito). Ficam dentro deste `Modal` porque o iOS não apresenta um
   * segundo `Modal` irmão enquanto o primeiro está aberto.
   */
  children?: ReactNode;
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <Text className="text-xs text-alert-primary">{message}</Text>;
}

// O asterisco fica na mesma cor do rótulo: vermelho é reservado a valor
// monetário negativo (DESIGN.md §2), e marcar campo obrigatório com a cor de
// erro faria o formulário parecer errado antes de alguém digitar nada.
function FieldLabel({ label, required }: { label: string; required: boolean }) {
  return (
    <Text className="text-xs font-semibold uppercase text-label-primary">
      {label}
      {required ? ' *' : ''}
    </Text>
  );
}

type FieldProps = {
  label: string;
  required?: boolean;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  errorMessage?: string;
  keyboardType?: 'default' | 'number-pad';
  maxLength?: number;
  multiline?: boolean;
  className?: string;
};

function Field({
  label,
  required = false,
  value,
  placeholder,
  onChangeText,
  errorMessage,
  keyboardType = 'default',
  maxLength,
  multiline = false,
  className,
}: FieldProps) {
  return (
    <View className={cn('gap-2', className)}>
      <FieldLabel label={label} required={required} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={LabelTertiary}
        accessibilityLabel={label}
        keyboardType={keyboardType}
        inputMode={keyboardType === 'number-pad' ? 'numeric' : 'text'}
        maxLength={maxLength}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'auto'}
        className={cn(
          'rounded-xl border bg-white px-4 py-3 text-[15px] text-label-primary',
          multiline && 'min-h-20',
          errorMessage ? 'border-alert-primary' : 'border-border-primary',
        )}
      />
      <FieldError message={errorMessage} />
    </View>
  );
}

type SelectFieldProps = {
  label: string;
  placeholder: string;
  options: readonly ServiceTaker[];
  value: string | null;
  onChange: (id: string) => void;
  errorMessage?: string;
};

// Mesmo padrão de seleção do OutputAdjustmentModal (campo com chevron e lista
// logo abaixo). É um stand-in do seletor de tomador da US05: quando ele
// existir, entra no lugar deste.
function SelectField({
  label,
  placeholder,
  options,
  value,
  onChange,
  errorMessage,
}: SelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find(option => option.id === value) ?? null;

  return (
    <View className="gap-2">
      <FieldLabel label={label} required />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setIsOpen(open => !open)}
        className={cn(
          'flex-row items-center gap-2 rounded-xl border bg-white px-4 py-3',
          errorMessage ? 'border-alert-primary' : 'border-border-primary',
        )}
      >
        <Text
          className={cn(
            'flex-1 text-[15px]',
            selected ? 'text-label-primary' : 'text-label-tertiary',
          )}
          numberOfLines={1}
        >
          {selected ? selected.name : placeholder}
        </Text>
        <Icon as={ChevronDown} className="size-4 text-label-tertiary" />
      </Pressable>

      {isOpen ? (
        <View className="overflow-hidden rounded-xl border border-border-primary bg-white">
          {options.map(option => (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityLabel={option.name}
              accessibilityState={{ selected: option.id === value }}
              onPress={() => {
                onChange(option.id);
                setIsOpen(false);
              }}
              className="flex-row items-center gap-2 border-b border-details-primary px-4 py-3"
            >
              <Text className="flex-1 text-[15px]" numberOfLines={1}>
                {option.name}
              </Text>
              {option.id === value ? (
                <Icon as={Check} className="size-4 text-label-quartenery" />
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      <FieldError message={errorMessage} />
    </View>
  );
}

type ChoiceProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

// Escolha exclusiva no mesmo formato do design: retângulos lado a lado, o
// escolhido preenchido com a cor de marca — não é o chip arredondado usado nos
// filtros, então não reaproveita CategoryFilter.
function Choice({ label, selected, onPress }: ChoiceProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      className={cn(
        'flex-1 items-center justify-center rounded-xl border px-3 py-3',
        selected
          ? 'border-button-primary bg-button-primary'
          : 'border-border-primary bg-white',
      )}
    >
      <Text
        className={cn(
          'text-[15px]',
          selected
            ? 'font-semibold text-label-secondary'
            : 'text-label-primary',
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function AppointmentFormSheet({
  visible,
  onCancel,
  onSubmit,
  draft,
  errors,
  serviceTakers,
  isSaving,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onClientChange,
  onPatientNameChange,
  onProcedureNameChange,
  onAmountChange,
  onSpeciesChange,
  onAgeYearsChange,
  onWeightKgChange,
  onAsaClassChange,
  onNotesChange,
  labels,
  speciesLabels,
  errorMessages,
  failureMessage,
  children,
}: AppointmentFormSheetProps) {
  const { isRendered, progress, translateY } = useSheetAnimation(visible);

  const messageFor = (code?: AppointmentErrorCode) =>
    code ? errorMessages[code] : undefined;

  return (
    <Modal
      visible={isRendered}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View className="flex-1">
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: BackgroundShade, opacity: progress },
          ]}
        />

        <Pressable
          className="flex-1"
          accessibilityLabel={labels.cancel}
          onPress={onCancel}
        />

        <Animated.View style={{ transform: [{ translateY }] }}>
          <View
            style={styles.sheet}
            className="gap-5 rounded-t-3xl bg-background-modal px-5 pb-8 pt-4"
          >
            <View className="h-1 w-10 self-center rounded-full bg-details-primary" />

            <View className="flex-row items-center justify-between gap-3">
              <Text className="flex-1 text-xl font-bold text-label-primary">
                {labels.title}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={labels.cancel}
                onPress={onCancel}
                hitSlop={8}
              >
                <Text className="text-sm font-semibold text-label-quartenery">
                  {labels.cancel}
                </Text>
              </Pressable>
            </View>

            <View className="h-px bg-details-primary" />

            <ScrollView
              style={styles.scroll}
              contentContainerClassName="gap-4 pb-2"
              keyboardShouldPersistTaps="handled"
            >
              <Field
                required
                label={labels.patient}
                value={draft.patientName}
                placeholder={labels.patientPlaceholder}
                onChangeText={onPatientNameChange}
                errorMessage={messageFor(errors.patientName)}
              />

              <Field
                required
                label={labels.procedure}
                value={draft.procedureName}
                placeholder={labels.procedurePlaceholder}
                onChangeText={onProcedureNameChange}
                errorMessage={messageFor(errors.procedureName)}
              />

              <SelectField
                label={labels.clinic}
                placeholder={labels.clinicPlaceholder}
                options={serviceTakers}
                value={draft.clientId}
                onChange={onClientChange}
                errorMessage={messageFor(errors.clientId)}
              />

              <View className="flex-row gap-3">
                <Field
                  className="flex-1"
                  label={labels.age}
                  value={draft.ageYears}
                  placeholder={labels.agePlaceholder}
                  onChangeText={onAgeYearsChange}
                  keyboardType="number-pad"
                />
                <Field
                  className="flex-1"
                  label={labels.weight}
                  value={draft.weightKg}
                  placeholder={labels.weightPlaceholder}
                  onChangeText={onWeightKgChange}
                  errorMessage={messageFor(errors.weightKg)}
                />
              </View>

              <View className="flex-row gap-3">
                <Field
                  className="flex-1"
                  required
                  label={labels.startTime}
                  value={draft.startTime}
                  placeholder={labels.timePlaceholder}
                  onChangeText={onStartTimeChange}
                  errorMessage={messageFor(errors.startTime)}
                  keyboardType="number-pad"
                  maxLength={5}
                />
                <Field
                  className="flex-1"
                  required
                  label={labels.endTime}
                  value={draft.endTime}
                  placeholder={labels.timePlaceholder}
                  onChangeText={onEndTimeChange}
                  errorMessage={messageFor(errors.endTime)}
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>

              <Field
                required
                label={labels.date}
                value={draft.date}
                placeholder={labels.datePlaceholder}
                onChangeText={onDateChange}
                errorMessage={messageFor(errors.date)}
                keyboardType="number-pad"
                maxLength={10}
              />

              <Field
                required
                label={labels.amount}
                value={draft.amount}
                placeholder={labels.amountPlaceholder}
                onChangeText={onAmountChange}
                errorMessage={messageFor(errors.amount)}
                keyboardType="number-pad"
              />

              <View className="gap-2">
                <FieldLabel label={labels.species} required />
                <View className="flex-row gap-3">
                  {SPECIES_OPTIONS.map(species => (
                    <Choice
                      key={species}
                      label={speciesLabels[species]}
                      selected={draft.species === species}
                      onPress={() => onSpeciesChange(species)}
                    />
                  ))}
                </View>
                <FieldError message={messageFor(errors.species)} />
              </View>

              <View className="gap-2">
                <FieldLabel label={labels.asa} required={false} />
                <View className="flex-row gap-3">
                  {ASA_CLASSES.map(asaClass => (
                    <Choice
                      key={asaClass}
                      label={asaClass}
                      selected={draft.asaClass === asaClass}
                      onPress={() => onAsaClassChange(asaClass)}
                    />
                  ))}
                </View>
              </View>

              <Field
                label={labels.notes}
                value={draft.notes}
                placeholder={labels.notesPlaceholder}
                onChangeText={onNotesChange}
                multiline
              />
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
              icon={Check}
              onPress={onSubmit}
              disabled={isSaving}
              accessibilityLabel={labels.confirm}
              className="h-[49px]"
            >
              <Text className="text-base font-semibold">{labels.confirm}</Text>
            </Button>
          </View>
        </Animated.View>

        {children}
      </View>
    </Modal>
  );
}

export { AppointmentFormSheet };
export type { AppointmentFormSheetProps };
