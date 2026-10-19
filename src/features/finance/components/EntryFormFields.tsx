import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { LabelPlaceholder, LabelPrimary } from 'theme/colors';

import {
  CategoryField,
  type CategoryFieldState,
  type CategoryFieldTexts,
} from './CategoryField';
import {
  EntryFieldLabel as Label,
  EntryReadOnlyField,
} from './EntryReadOnlyField';
import type {
  EntryDraft,
  EntryField,
  EntryTextField,
} from '../domain/entryForm';
import type { LockedEntryField } from '../domain/entryOrigin';
import type { EntryNature, EntryScope } from '../domain/financialEntry';

export type EntryFormTexts = {
  nature: { label: string; income: string; expense: string };
  description: { label: string; placeholder: string };
  amount: { label: string; placeholder: string };
  date: { label: string; placeholder: string };
  category: CategoryFieldTexts;
  scope: {
    label: string;
    professional: string;
    personal: string;
    hint: string;
  };
};

/** Campos que a origem controla: aparecem travados, com o motivo embaixo. */
export type LockedFieldsState = {
  fields: readonly LockedEntryField[];
  hint: string;
  accessibilityLabels: Record<LockedEntryField, string>;
};
type EntryFormFieldsProps = {
  draft: EntryDraft;
  fieldErrors: Partial<Record<EntryField, string>>;
  texts: EntryFormTexts;
  category: CategoryFieldState;
  onChangeNature: (nature: EntryNature) => void;
  onChangeField: (field: EntryTextField, value: string) => void;
  onChangeScope: (scope: EntryScope) => void;
  locked?: LockedFieldsState | null;
};

const UNSELECTED_TILE = 'bg-white shadow-[0px_5px_5px_rgba(0,0,0,0.1)]';

function FieldError({ message }: { message?: string }) {
  return message ? (
    <Text className="text-xs text-alert-primary">{message}</Text>
  ) : null;
}

type ChoiceProps = {
  label: string;
  selected: boolean;
  icon?: LucideIcon;
  onPress: () => void;
};

function Choice({ label, selected, icon, onPress }: ChoiceProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={cn(
        'h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px]',
        selected ? 'bg-button-primary' : UNSELECTED_TILE,
      )}
    >
      {icon ? (
        <Icon
          as={icon}
          size={14}
          className={selected ? 'text-label-secondary' : 'text-label-primary'}
        />
      ) : null}
      <Text
        className={cn(
          'text-[13px] font-medium',
          selected ? 'text-label-secondary' : 'text-label-primary',
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type EntryInputProps = TextInputProps & {
  label: string;
  error?: string;
  trailingIcon?: LucideIcon;
  className?: string;
};

function EntryInput({
  label,
  error,
  trailingIcon,
  className,
  ...inputProps
}: EntryInputProps) {
  return (
    <View className={cn('gap-2', className)}>
      <Label>{label}</Label>
      <View
        className={cn(
          'flex-row items-center rounded-xl border bg-white px-4',
          error ? 'border-alert-primary' : 'border-border-primary',
        )}
      >
        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          accessibilityHint={error}
          placeholderTextColor={LabelPlaceholder}
          selectionColor={LabelPrimary}
          // min-w-0: na web o input tem largura mínima própria e empurraria o
          // ícone para fora do campo.
          className="min-w-0 flex-1 py-2.5 text-[15px] text-label-primary"
        />
        {trailingIcon ? (
          <View
            className="ml-2 shrink-0"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Icon as={trailingIcon} size={16} className="text-label-tertiary" />
          </View>
        ) : null}
      </View>
      <FieldError message={error} />
    </View>
  );
}

export function EntryFormFields({
  draft,
  fieldErrors,
  texts,
  category,
  onChangeNature,
  onChangeField,
  onChangeScope,
  locked = null,
}: EntryFormFieldsProps) {
  const isLocked = (field: LockedEntryField) =>
    locked?.fields.includes(field) ?? false;

  return (
    <>
      {isLocked('nature') && locked ? (
        <EntryReadOnlyField
          locked
          label={texts.nature.label}
          value={
            draft.nature === 'INCOME'
              ? texts.nature.income
              : texts.nature.expense
          }
          icon={draft.nature === 'INCOME' ? ArrowUp : ArrowDown}
          accessibilityLabel={locked.accessibilityLabels.nature}
        />
      ) : (
        <View className="gap-2">
          <Label>{texts.nature.label}</Label>
          <View className="flex-row gap-2">
            <Choice
              label={texts.nature.income}
              icon={ArrowUp}
              selected={draft.nature === 'INCOME'}
              onPress={() => onChangeNature('INCOME')}
            />
            <Choice
              label={texts.nature.expense}
              icon={ArrowDown}
              selected={draft.nature === 'EXPENSE'}
              onPress={() => onChangeNature('EXPENSE')}
            />
          </View>
        </View>
      )}

      <EntryInput
        label={texts.description.label}
        placeholder={texts.description.placeholder}
        value={draft.description}
        error={fieldErrors.description}
        autoCapitalize="sentences"
        onChangeText={value => onChangeField('description', value)}
      />

      <View className="gap-1.5">
        <View className="flex-row gap-3">
          {isLocked('amount') && locked ? (
            <EntryReadOnlyField
              locked
              className="flex-1"
              label={texts.amount.label}
              value={draft.amount}
              accessibilityLabel={locked.accessibilityLabels.amount}
            />
          ) : (
            <EntryInput
              className="flex-1"
              label={texts.amount.label}
              placeholder={texts.amount.placeholder}
              value={draft.amount}
              error={fieldErrors.amount}
              keyboardType="number-pad"
              inputMode="numeric"
              onChangeText={value => onChangeField('amount', value)}
            />
          )}
          {isLocked('date') && locked ? (
            <EntryReadOnlyField
              locked
              className="flex-1"
              label={texts.date.label}
              value={draft.date}
              accessibilityLabel={locked.accessibilityLabels.date}
            />
          ) : (
            <EntryInput
              className="flex-1"
              label={texts.date.label}
              placeholder={texts.date.placeholder}
              value={draft.date}
              error={fieldErrors.date}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={10}
              trailingIcon={CalendarDays}
              onChangeText={value => onChangeField('date', value)}
            />
          )}
        </View>
        {locked && locked.fields.length > 0 ? (
          <Text className="text-[11px] leading-[16.5px] text-label-tertiary">
            {locked.hint}
          </Text>
        ) : null}
      </View>

      <CategoryField
        {...category}
        texts={texts.category}
        error={fieldErrors.categoryId}
      />

      <View className="gap-2">
        <Label>{texts.scope.label}</Label>
        <View className="flex-row gap-2">
          <Choice
            label={texts.scope.professional}
            selected={draft.scope === 'PROFESSIONAL'}
            onPress={() => onChangeScope('PROFESSIONAL')}
          />
          <Choice
            label={texts.scope.personal}
            selected={draft.scope === 'PERSONAL'}
            onPress={() => onChangeScope('PERSONAL')}
          />
        </View>
        <Text className="text-xs text-label-tertiary">{texts.scope.hint}</Text>
      </View>
    </>
  );
}
