import { useCallback, useState } from 'react';

import {
  useClientSearch,
  type ClientOption,
  type ClientSearchStatus,
} from 'features/clients';
import { formatCurrencyInput, formatDateInput } from 'shared/utils/inputMasks';

import type {
  ServiceInvoiceErrors,
  ServiceInvoiceField,
  ServiceInvoiceFormValues,
} from '../domain/serviceInvoice.types';

type UseServiceInvoiceFieldsOptions = {
  initialValues: ServiceInvoiceFormValues;
  initialClient: ClientOption | null;
};

export type ServiceInvoiceFieldsState = {
  values: ServiceInvoiceFormValues;
  errors: ServiceInvoiceErrors;
  setErrors: (errors: ServiceInvoiceErrors) => void;
  isDirty: boolean;
  client: {
    term: string;
    status: ClientSearchStatus;
    options: ClientOption[];
  };
  changeIssueDate: (text: string) => void;
  changeAmount: (text: string) => void;
  changeNumber: (text: string) => void;
  changeClientTerm: (term: string) => void;
  selectClient: (client: ClientOption) => void;
};

export function useServiceInvoiceFields({
  initialValues,
  initialClient,
}: UseServiceInvoiceFieldsOptions): ServiceInvoiceFieldsState {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<ServiceInvoiceErrors>({});
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(
    initialClient && { id: initialClient.id, name: initialClient.name },
  );
  const clientSearch = useClientSearch({
    active: true,
    paused: selectedClient !== null,
  });

  const clearError = useCallback((field: ServiceInvoiceField) => {
    setErrors(current => {
      if (current[field] === undefined) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  const changeIssueDate = useCallback(
    (text: string) => {
      setValues(current => ({ ...current, issueDate: formatDateInput(text) }));
      clearError('issueDate');
    },
    [clearError],
  );

  const changeAmount = useCallback(
    (text: string) => {
      setValues(current => ({ ...current, amount: formatCurrencyInput(text) }));
      clearError('amount');
    },
    [clearError],
  );

  const changeNumber = useCallback((text: string) => {
    setValues(current => ({ ...current, number: text }));
  }, []);

  const selectClient = useCallback(
    (client: ClientOption) => {
      setSelectedClient({ id: client.id, name: client.name });
      setValues(current => ({ ...current, clientId: client.id }));
      clearError('clientId');
    },
    [clearError],
  );

  // Typing again undoes the choice: the clientId cannot keep pointing at a
  // taker the field no longer shows.
  const changeClientTerm = useCallback(
    (term: string) => {
      if (selectedClient !== null) {
        setSelectedClient(null);
        setValues(current => ({ ...current, clientId: null }));
      }
      clientSearch.onTermChange(term);
    },
    [clientSearch, selectedClient],
  );

  // A taker the reading linked came with the review, so it is not something
  // the person changed.
  const isDirty =
    values.clientId !== initialValues.clientId ||
    (values.clientId === null && clientSearch.term !== '') ||
    values.issueDate !== initialValues.issueDate ||
    values.amount !== initialValues.amount ||
    values.number !== initialValues.number;

  return {
    values,
    errors,
    setErrors,
    isDirty,
    client: {
      term: selectedClient?.name ?? clientSearch.term,
      status: clientSearch.status,
      options: clientSearch.options,
    },
    changeIssueDate,
    changeAmount,
    changeNumber,
    changeClientTerm,
    selectClient,
  };
}
