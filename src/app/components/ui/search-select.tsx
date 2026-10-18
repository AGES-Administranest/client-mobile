import { Plus } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { LabelPlaceholder } from 'theme/colors';

export type SearchSelectOption = {
  id: string;
  label: string;
};

export type SearchSelectStatus =
  | 'idle'
  | 'loading'
  | 'error'
  | 'empty'
  | 'results';

export type SearchSelectMessages = {
  loading: string;
  error: string;
  empty: string;
};

export type SearchSelectAddOption = {
  label: string;
  onPress: () => void;
};

type SearchSelectProps = {
  label: string;
  placeholder?: string;
  text: string;
  selectedId?: string | null;
  error?: string;
  status: SearchSelectStatus;
  options: readonly SearchSelectOption[];
  messages: SearchSelectMessages;
  addOption?: SearchSelectAddOption;
  onChangeText: (text: string) => void;
  onSelect: (option: SearchSelectOption) => void;
};

// Atraso entre perder o foco e esconder a lista: sem ele, o blur do
// TextInput chega antes do onPress da opção tocada e a seleção nunca
// acontece (a lista já sumiu quando o toque seria processado).
const BLUR_CLOSE_DELAY_MS = 150;

export function SearchSelect({
  label,
  placeholder,
  text,
  selectedId = null,
  error,
  status,
  options,
  messages,
  addOption,
  onChangeText,
  onSelect,
}: SearchSelectProps) {
  const [inUse, setInUse] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (blurTimeout.current) clearTimeout(blurTimeout.current);
    },
    [],
  );

  function cancelPendingClose(): void {
    if (blurTimeout.current) {
      clearTimeout(blurTimeout.current);
      blurTimeout.current = null;
    }
  }

  function handleFocus(): void {
    cancelPendingClose();
    setInUse(true);
  }

  function handleChangeText(next: string): void {
    setInUse(true);
    onChangeText(next);
  }

  function handleBlur(): void {
    blurTimeout.current = setTimeout(
      () => setInUse(false),
      BLUR_CLOSE_DELAY_MS,
    );
  }

  function closeAndThen(action: () => void): void {
    cancelPendingClose();
    setInUse(false);
    // Dentro de um ScrollView com keyboardShouldPersistTaps, o input continua
    // focado depois do toque na linha, e tocar nele de novo não reabriria a lista.
    inputRef.current?.blur();
    action();
  }

  const visibleStatus = inUse ? status : 'idle';
  const listIsOpen = hasRowsToShow(visibleStatus, addOption !== undefined);

  return (
    <View className="mb-3">
      <Text className="mb-1 text-xs font-semibold uppercase text-label-primary">
        {label}
      </Text>
      <TextInput
        ref={inputRef}
        accessibilityLabel={label}
        accessibilityRole="combobox"
        accessibilityState={{ expanded: listIsOpen }}
        className={cn(
          'rounded-xl border bg-white px-4 py-2.5 text-[15px] text-label-primary',
          error ? 'border-alert-primary' : 'border-border-primary',
        )}
        placeholder={placeholder}
        placeholderTextColor={LabelPlaceholder}
        value={text}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoCorrect={false}
      />
      {error ? (
        <Text className="mt-1 text-xs text-alert-primary">{error}</Text>
      ) : null}

      {listIsOpen ? (
        <OptionList
          options={options}
          selectedId={selectedId}
          addOption={addOption}
          onSelect={option => closeAndThen(() => onSelect(option))}
          onAdd={() => closeAndThen(() => addOption?.onPress())}
        />
      ) : (
        <StatusLine status={visibleStatus} messages={messages} />
      )}
    </View>
  );
}

// Figma: sem resultado, a linha de adicionar substitui a mensagem de vazio.
function hasRowsToShow(status: SearchSelectStatus, canAdd: boolean): boolean {
  return status === 'results' || (status === 'empty' && canAdd);
}

type OptionListProps = {
  options: readonly SearchSelectOption[];
  selectedId: string | null;
  addOption?: SearchSelectAddOption;
  onSelect: (option: SearchSelectOption) => void;
  onAdd: () => void;
};

function OptionList({
  options,
  selectedId,
  addOption,
  onSelect,
  onAdd,
}: OptionListProps) {
  return (
    <View className="mt-1 overflow-hidden rounded-xl border border-border-primary bg-white">
      {options.map((option, index) => {
        const selected = option.id === selectedId;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onSelect(option)}
            className={cn(
              'px-4 py-3',
              index > 0 && 'border-t border-border-primary',
              selected && 'bg-details-primary',
            )}
          >
            <Text className="text-base text-label-primary">{option.label}</Text>
          </Pressable>
        );
      })}
      {addOption ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAdd}
          className={cn(
            'flex-row items-center gap-2 px-4 py-3',
            options.length > 0 && 'border-t border-border-primary',
          )}
        >
          <Icon as={Plus} size={16} className="text-label-primary" />
          <Text className="text-base text-label-primary">
            {addOption.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type StatusLineProps = {
  status: SearchSelectStatus;
  messages: SearchSelectMessages;
};

function StatusLine({ status, messages }: StatusLineProps) {
  if (status === 'idle' || status === 'results') {
    return null;
  }

  return (
    <Text
      className={cn(
        'mt-1 text-xs',
        status === 'error' ? 'text-alert-primary' : 'text-label-tertiary',
      )}
    >
      {messages[status]}
    </Text>
  );
}
