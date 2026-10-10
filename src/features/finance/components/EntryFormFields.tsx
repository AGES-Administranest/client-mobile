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

import type {
  EntryDraft,
  EntryField,
  EntryTextField,
} from '../domain/entryForm';
import type { EntryNature, EntryScope } from '../domain/financialEntry';

export type EntryFormTexts = {
  nature: { label: string; income: string; expense: string };
  description: { label: string; placeholder: string };
  amount: { label: string; placeholder: string };
  date: { label: string; placeholder: string };
  category: { label: string; loading: string; retry: string; empty: string };
  scope: {
    label: string;
    professional: string;
    personal: string;
    hint: string;
  };
};

/** Categoria já com o nome traduzido. */
export type CategoryOption = { id: string; label: string };

export type CategoriesState =
  | { status: 'loading' }
  | { status: 'failed'; message: string }
  | { status: 'ready'; options: CategoryOption[] };

type EntryFormFieldsProps = {
  draft: EntryDraft;
  /** Mensagens já traduzidas, só dos campos com erro. */
  fieldErrors: Partial<Record<EntryField, string>>;
  texts: EntryFormTexts;
  categories: CategoriesState;
  onChangeNature: (nature: EntryNature) => void;
  onChangeField: (field: EntryTextField, value: string) => void;
  onSelectCategory: (categoryId: string) => void;
  onChangeScope: (scope: EntryScope) => void;
  onRetryCategories: () => void;
};

// Como no Figma: opção não escolhida é um bloco branco com sombra, sem borda
// (a borda fica só nos campos de texto).
const UNSELECTED_TILE = 'bg-white shadow-[0px_5px_5px_rgba(0,0,0,0.1)]';

function Label({ children }: { children: string }) {
  return (
    <Text className="text-xs font-semibold uppercase text-label-primary">
      {children}
    </Text>
  );
}

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

function CategoryChoices({
  state,
  selectedId,
  texts,
  onSelect,
  onRetry,
}: {
  state: CategoriesState;
  selectedId: string | null;
  texts: EntryFormTexts['category'];
  onSelect: (id: string) => void;
  onRetry: () => void;
}) {
  if (state.status === 'loading') {
    return <Text className="text-sm text-label-tertiary">{texts.loading}</Text>;
  }
  if (state.status === 'failed') {
    return (
      <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
        <Text className="text-sm text-alert-primary">{state.message}</Text>
        <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8}>
          <Text className="text-sm font-semibold text-label-primary underline">
            {texts.retry}
          </Text>
        </Pressable>
      </View>
    );
  }
  if (state.options.length === 0) {
    return <Text className="text-sm text-label-tertiary">{texts.empty}</Text>;
  }
  return (
    <View className="flex-row flex-wrap gap-2">
      {state.options.map(option => {
        const selected = option.id === selectedId;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onSelect(option.id)}
            className={cn(
              'h-11 w-[31.5%] items-center justify-center rounded-[10px] px-0.5',
              selected ? 'bg-button-primary' : UNSELECTED_TILE,
            )}
          >
            <Text
              numberOfLines={2}
              className={cn(
                'text-center text-[12px] font-medium',
                selected ? 'text-label-secondary' : 'text-label-primary',
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Os campos do lançamento, sem o sheet em volta: o detalhe do lançamento
 * reaproveita no modo edição.
 */
export function EntryFormFields({
  draft,
  fieldErrors,
  texts,
  categories,
  onChangeNature,
  onChangeField,
  onSelectCategory,
  onChangeScope,
  onRetryCategories,
}: EntryFormFieldsProps) {
  return (
    <>
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

      <EntryInput
        label={texts.description.label}
        placeholder={texts.description.placeholder}
        value={draft.description}
        error={fieldErrors.description}
        autoCapitalize="sentences"
        onChangeText={value => onChangeField('description', value)}
      />

      <View className="flex-row gap-3">
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
      </View>

      <View className="gap-2">
        <Label>{texts.category.label}</Label>
        <CategoryChoices
          state={categories}
          selectedId={draft.categoryId}
          texts={texts.category}
          onSelect={onSelectCategory}
          onRetry={onRetryCategories}
        />
        <FieldError message={fieldErrors.categoryId} />
      </View>

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
