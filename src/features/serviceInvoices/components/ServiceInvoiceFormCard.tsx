import { Pressable, View } from 'react-native';

import { FormField } from 'app/components/ui/form-field';
import { Text } from 'app/components/ui/text';
import {
  ClientAutocomplete,
  type ClientAutocompleteMessages,
  type ClientOption,
  type ClientSearchStatus,
} from 'features/clients';

type ServiceInvoiceFormCardProps = {
  labels: {
    issueDate: string;
    issueDatePlaceholder: string;
    amount: string;
    amountPlaceholder: string;
    client: string;
    clientPlaceholder: string;
  };
  issueDate: string;
  issueDateError?: string;
  amount: string;
  amountError?: string;
  client: {
    term: string;
    status: ClientSearchStatus;
    options: ClientOption[];
    messages: ClientAutocompleteMessages;
    error?: string;
  };
  onChangeIssueDate: (text: string) => void;
  onChangeAmount: (text: string) => void;
  onChangeClientTerm: (term: string) => void;
  onSelectClient: (client: ClientOption) => void;
  /** Shown only with its text and handler: the correction leaves the number alone. */
  number?: {
    label: string;
    value: string;
    onChange: (text: string) => void;
  };
  location?: {
    label: string;
    placeholder: string;
    value: string;
    onChange: (text: string) => void;
  };
  suggestions?: {
    label: string;
    options: ClientOption[];
  };
  registerClient?: {
    label: string;
    onPress: () => void;
  };
};

/** The note's fields, shared by the review of a new note and the correction of a saved one. */
export function ServiceInvoiceFormCard({
  labels,
  issueDate,
  issueDateError,
  amount,
  amountError,
  client,
  onChangeIssueDate,
  onChangeAmount,
  onChangeClientTerm,
  onSelectClient,
  number,
  location,
  suggestions,
  registerClient,
}: ServiceInvoiceFormCardProps) {
  return (
    <View className="gap-3 rounded-2xl bg-white p-4">
      <FormField
        label={labels.issueDate}
        value={issueDate}
        placeholder={labels.issueDatePlaceholder}
        keyboardType="number-pad"
        maxLength={10}
        error={issueDateError}
        onChangeText={onChangeIssueDate}
      />
      <FormField
        label={labels.amount}
        value={amount}
        placeholder={labels.amountPlaceholder}
        keyboardType="number-pad"
        error={amountError}
        onChangeText={onChangeAmount}
      />
      {number ? (
        <FormField
          label={number.label}
          value={number.value}
          onChangeText={number.onChange}
        />
      ) : null}
      <ClientAutocomplete
        label={labels.client}
        placeholder={labels.clientPlaceholder}
        value={client.term}
        error={client.error}
        status={client.status}
        options={client.options}
        messages={client.messages}
        onChangeText={onChangeClientTerm}
        onSelect={onSelectClient}
      />
      {location ? (
        <FormField
          label={location.label}
          value={location.value}
          placeholder={location.placeholder}
          onChangeText={location.onChange}
        />
      ) : null}
      {suggestions && suggestions.options.length > 0 ? (
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase text-label-primary">
            {suggestions.label}
          </Text>
          {suggestions.options.map(suggestion => (
            <Pressable
              key={suggestion.id}
              accessibilityRole="button"
              className="rounded-xl bg-details-primary px-4 py-3"
              onPress={() => onSelectClient(suggestion)}
            >
              <Text className="text-[15px] text-label-primary">
                {suggestion.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {registerClient ? (
        <Pressable
          accessibilityRole="button"
          className="self-start"
          onPress={registerClient.onPress}
        >
          <Text className="text-[13px] font-semibold text-label-quartenery">
            {registerClient.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
