import { ChevronDown, Plus } from 'lucide-react-native';
import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, TextInput, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import {
  SearchSelect,
  type SearchSelectOption,
  type SearchSelectStatus,
} from 'app/components/ui/search-select';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { LabelPlaceholder, LabelPrimary } from 'theme/colors';

export type CategoryFieldTexts = {
  label: string;
  placeholder: string;
  loading: string;
  retry: string;
  noResults: string;
  created: string;
  add: string;
  newPlaceholder: string;
  create: string;
};

export type NewCategoryInput = {
  name: string;
  error: string | null;
  failure: string | null;
  canCreate: boolean;
  isSaving: boolean;
};

export type CategoryFieldState = {
  status: 'loading' | 'failed' | 'ready';
  loadFailure: string | null;
  text: string;
  options: readonly SearchSelectOption[];
  selectedId: string | null;
  offersNewCategory: boolean;
  hasNoMatch: boolean;
  wasJustCreated: boolean;
  newCategory: NewCategoryInput | null;
  onChangeText: (text: string) => void;
  onSelect: (categoryId: string) => void;
  onRetry: () => void;
  onStartNewCategory: () => void;
  onChangeNewName: (name: string) => void;
  onCreate: () => void;
};

type CategoryFieldProps = CategoryFieldState & {
  texts: CategoryFieldTexts;
  error?: string;
};

function listStatus(
  status: CategoryFieldState['status'],
  options: readonly SearchSelectOption[],
): SearchSelectStatus {
  if (status === 'loading') return 'loading';
  if (status === 'failed') return 'idle';
  return options.length > 0 ? 'results' : 'empty';
}

// VoiceOver e TalkBack não leem sozinhos o que muda na tela. Nada é anunciado
// a cada tecla: só o resultado vazio, a categoria criada e as falhas.
function useAnnouncement(shouldAnnounce: boolean, message: string) {
  useEffect(() => {
    if (shouldAnnounce) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, [shouldAnnounce, message]);
}

export function CategoryField({
  texts,
  error,
  status,
  loadFailure,
  text,
  options,
  selectedId,
  offersNewCategory,
  hasNoMatch,
  wasJustCreated,
  newCategory,
  onChangeText,
  onSelect,
  onRetry,
  onStartNewCategory,
  onChangeNewName,
  onCreate,
}: CategoryFieldProps) {
  useAnnouncement(status === 'ready' && hasNoMatch, texts.noResults);
  useAnnouncement(wasJustCreated, texts.created);
  useAnnouncement(status === 'failed', loadFailure ?? '');
  useAnnouncement(Boolean(newCategory?.failure), newCategory?.failure ?? '');

  return (
    <View className="gap-2">
      <SearchSelect
        className="mb-0"
        label={texts.label}
        placeholder={texts.placeholder}
        text={text}
        selectedId={selectedId}
        error={error}
        status={listStatus(status, options)}
        options={options}
        messages={{
          loading: texts.loading,
          error: loadFailure ?? '',
          empty: texts.noResults,
        }}
        addOption={
          status === 'ready' && offersNewCategory
            ? { label: texts.add, onPress: onStartNewCategory }
            : undefined
        }
        trailingIcon={ChevronDown}
        onChangeText={onChangeText}
        onSelect={option => onSelect(option.id)}
      />

      {status === 'failed' ? (
        <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
          <Text className="text-sm text-alert-primary">{loadFailure}</Text>
          <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8}>
            <Text className="text-sm font-semibold text-label-quartenery underline">
              {texts.retry}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {newCategory ? (
        <NewCategoryRow
          input={newCategory}
          placeholder={texts.newPlaceholder}
          createLabel={texts.create}
          onChangeName={onChangeNewName}
          onCreate={onCreate}
        />
      ) : null}
    </View>
  );
}

type NewCategoryRowProps = {
  input: NewCategoryInput;
  placeholder: string;
  createLabel: string;
  onChangeName: (name: string) => void;
  onCreate: () => void;
};

function NewCategoryRow({
  input,
  placeholder,
  createLabel,
  onChangeName,
  onCreate,
}: NewCategoryRowProps) {
  const problem = input.error ?? input.failure;
  const create = () => {
    if (input.canCreate) onCreate();
  };

  return (
    <View className="gap-1">
      <View
        className={cn(
          'flex-row items-center rounded-xl border bg-white pl-4 pr-1',
          problem ? 'border-alert-primary' : 'border-border-primary',
        )}
      >
        <TextInput
          accessibilityLabel={placeholder}
          accessibilityHint={problem ?? undefined}
          className="min-w-0 flex-1 py-2.5 text-[15px] text-label-primary"
          placeholder={placeholder}
          placeholderTextColor={LabelPlaceholder}
          selectionColor={LabelPrimary}
          value={input.name}
          editable={!input.isSaving}
          autoFocus
          autoCapitalize="sentences"
          returnKeyType="done"
          onChangeText={onChangeName}
          onSubmitEditing={create}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={createLabel}
          accessibilityState={{
            disabled: !input.canCreate,
            busy: input.isSaving,
          }}
          disabled={!input.canCreate}
          onPress={create}
          hitSlop={4}
          className={cn(
            'size-9 items-center justify-center',
            !input.canCreate && 'opacity-50',
          )}
        >
          <Icon as={Plus} size={22} className="text-label-primary" />
        </Pressable>
      </View>
      {problem ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-xs text-alert-primary"
        >
          {problem}
        </Text>
      ) : null}
    </View>
  );
}
