import type { LucideIcon } from 'lucide-react-native';

import {
  SearchSelect,
  type SearchSelectMessages,
  type SearchSelectOption,
} from 'app/components/ui/search-select';

import type { ClientOption } from '../domain/client';
import type { ClientSearchStatus } from '../domain/clientSearch';

export type ClientAutocompleteMessages = SearchSelectMessages;

type ClientAutocompleteProps<T extends ClientOption> = {
  label: string;
  placeholder?: string;
  value: string;
  error?: string;
  status: ClientSearchStatus;
  options: T[];
  messages: ClientAutocompleteMessages;
  trailingIcon?: LucideIcon;
  compact?: boolean;
  className?: string;
  onChangeText: (value: string) => void;
  onSelect: (option: T) => void;
};

export function ClientAutocomplete<T extends ClientOption>({
  label,
  placeholder,
  value,
  error,
  status,
  options,
  messages,
  trailingIcon,
  compact,
  className,
  onChangeText,
  onSelect,
}: ClientAutocompleteProps<T>) {
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
      trailingIcon={trailingIcon}
      compact={compact}
      className={className}
      onChangeText={onChangeText}
      onSelect={selectPickedClient}
    />
  );
}

function toSearchSelectOption(client: ClientOption): SearchSelectOption {
  return { id: client.id, label: client.name };
}
