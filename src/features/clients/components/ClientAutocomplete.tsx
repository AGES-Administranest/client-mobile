import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { LabelPlaceholder } from 'theme/colors';

import type { ClientOption } from '../domain/client';
import type { ClientSearchStatus } from '../domain/clientSearch';

export type ClientAutocompleteMessages = {
  loading: string;
  error: string;
  empty: string;
};

type ClientAutocompleteProps = {
  label: string;
  placeholder?: string;
  value: string;
  error?: string;
  status: ClientSearchStatus;
  options: ClientOption[];
  messages: ClientAutocompleteMessages;
  onChangeText: (value: string) => void;
  onSelect: (option: ClientOption) => void;
};

// Atraso entre perder o foco e esconder a lista: sem ele, o blur do
// TextInput chega antes do onPress da opção tocada e a seleção nunca
// acontece (a lista já sumiu quando o toque seria processado).
const BLUR_CLOSE_DELAY_MS = 150;

export function ClientAutocomplete({
  label,
  placeholder,
  value,
  error,
  status,
  options,
  messages,
  onChangeText,
  onSelect,
}: ClientAutocompleteProps) {
  const [focused, setFocused] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (blurTimeout.current) clearTimeout(blurTimeout.current);
    },
    [],
  );

  function handleFocus(): void {
    if (blurTimeout.current) {
      clearTimeout(blurTimeout.current);
      blurTimeout.current = null;
    }
    setFocused(true);
  }

  function handleBlur(): void {
    blurTimeout.current = setTimeout(
      () => setFocused(false),
      BLUR_CLOSE_DELAY_MS,
    );
  }

  function handleSelect(option: ClientOption): void {
    if (blurTimeout.current) {
      clearTimeout(blurTimeout.current);
      blurTimeout.current = null;
    }
    setFocused(false);
    onSelect(option);
  }

  return (
    <View className="mb-3">
      <Text className="mb-1 text-xs font-semibold uppercase text-label-primary">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        className={
          error
            ? 'rounded-xl border border-alert-primary bg-white px-4 py-2.5 text-[15px] text-label-primary'
            : 'rounded-xl border border-border-primary bg-white px-4 py-2.5 text-[15px] text-label-primary'
        }
        placeholder={placeholder}
        placeholderTextColor={LabelPlaceholder}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoCorrect={false}
      />
      {error ? (
        <Text className="mt-1 text-xs text-alert-primary">{error}</Text>
      ) : null}

      <ResultList
        status={focused ? status : 'idle'}
        options={options}
        messages={messages}
        onSelect={handleSelect}
      />
    </View>
  );
}

type ResultListProps = {
  status: ClientSearchStatus;
  options: ClientOption[];
  messages: ClientAutocompleteMessages;
  onSelect: (option: ClientOption) => void;
};

function ResultList({ status, options, messages, onSelect }: ResultListProps) {
  if (status === 'idle') {
    return null;
  }

  if (status === 'results') {
    return (
      <View className="mt-1 overflow-hidden rounded-xl border border-border-primary bg-white">
        {options.map((option, index) => (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            onPress={() => onSelect(option)}
            className={
              index === 0
                ? 'px-4 py-3'
                : 'border-t border-border-primary px-4 py-3'
            }
          >
            <Text className="text-base text-label-primary">{option.name}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <Text
      className={
        status === 'error'
          ? 'mt-1 text-xs text-alert-primary'
          : 'mt-1 text-xs text-label-tertiary'
      }
    >
      {messages[status]}
    </Text>
  );
}
