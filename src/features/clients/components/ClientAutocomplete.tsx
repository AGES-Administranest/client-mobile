import {
  SearchSelect,
  type SearchSelectMessages,
  type SearchSelectOption,
} from 'app/components/ui/search-select';

import type { ClientOption } from '../domain/client';
import type { ClientSearchStatus } from '../domain/clientSearch';

export type ClientAutocompleteMessages = SearchSelectMessages;

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
  function selectPickedClient({ id }: SearchSelectOption): void {
    const client = options.find(option => option.id === id);
    if (client) onSelect(client);
  }

  return (
    <SearchSelect
      label={label}
      placeholder={placeholder}
      text={value}
      error={error}
      status={status}
      options={options.map(toSearchSelectOption)}
      messages={messages}
      onChangeText={onChangeText}
      onSelect={selectPickedClient}
    />
  );
}

function toSearchSelectOption(client: ClientOption): SearchSelectOption {
  return { id: client.id, label: client.name };
}
