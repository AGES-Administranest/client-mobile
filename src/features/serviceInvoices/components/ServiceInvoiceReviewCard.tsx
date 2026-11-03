import { Pressable, View } from 'react-native';

import { FormField } from 'app/components/ui/form-field';
import { Text } from 'app/components/ui/text';
import {
  ClientAutocomplete,
  type ClientAutocompleteMessages,
  type ClientOption,
  type ClientSearchStatus,
} from 'features/clients';

type ServiceInvoiceReviewCardProps = {
  labels: {
    issueDate: string;
    issueDatePlaceholder: string;
    amount: string;
    amountPlaceholder: string;
    number: string;
    client: string;
    clientPlaceholder: string;
    suggestions: string;
    registerClient: string;
  };
  issueDate: string;
  issueDateError?: string;
  amount: string;
  amountError?: string;
  number: string;
  client: {
    term: string;
    status: ClientSearchStatus;
    options: ClientOption[];
    suggestions: ClientOption[];
    messages: ClientAutocompleteMessages;
    error?: string;
  };
  onChangeIssueDate: (text: string) => void;
  onChangeAmount: (text: string) => void;
  onChangeNumber: (text: string) => void;
  onChangeClientTerm: (term: string) => void;
  onSelectClient: (client: ClientOption) => void;
  onRegisterClient: () => void;
};

export function ServiceInvoiceReviewCard({
  labels,
  issueDate,
  issueDateError,
  amount,
  amountError,
  number,
  client,
  onChangeIssueDate,
  onChangeAmount,
  onChangeNumber,
  onChangeClientTerm,
  onSelectClient,
  onRegisterClient,
}: ServiceInvoiceReviewCardProps) {
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
      <FormField
        label={labels.number}
        value={number}
        onChangeText={onChangeNumber}
      />
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
      {client.suggestions.length > 0 ? (
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase text-label-primary">
            {labels.suggestions}
          </Text>
          {client.suggestions.map(suggestion => (
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
      <Pressable
        accessibilityRole="button"
        className="self-start"
        onPress={onRegisterClient}
      >
        <Text className="text-[13px] font-semibold text-label-quartenery">
          {labels.registerClient}
        </Text>
      </Pressable>
    </View>
  );
}
