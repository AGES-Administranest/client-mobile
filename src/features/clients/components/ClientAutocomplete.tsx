import { Pressable, TextInput, View } from 'react-native';

import { Button } from 'app/components/ui/button';
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
  newClientLabel: string;
  onChangeText: (value: string) => void;
  onSelect: (option: ClientOption) => void;
  onPressNewClient: () => void;
};

export function ClientAutocomplete({
  label,
  placeholder,
  value,
  error,
  status,
  options,
  messages,
  newClientLabel,
  onChangeText,
  onSelect,
  onPressNewClient,
}: ClientAutocompleteProps) {
  return (
    <View className="mb-3">
      <View className="mb-1 flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase text-label-primary">
          {label}
        </Text>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0"
          onPress={onPressNewClient}
        >
          <Text className="text-xs font-semibold">{newClientLabel}</Text>
        </Button>
      </View>
      <TextInput
        accessibilityLabel={label}
        className={
          error
            ? 'rounded-xl border border-alert-primary bg-white px-4 py-3 text-base text-label-primary'
            : 'rounded-xl border border-border-primary bg-white px-4 py-3 text-base text-label-primary'
        }
        placeholder={placeholder}
        placeholderTextColor={LabelPlaceholder}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
      />
      {error ? (
        <Text className="mt-1 text-xs text-alert-primary">{error}</Text>
      ) : null}

      <ResultList
        status={status}
        options={options}
        messages={messages}
        onSelect={onSelect}
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
