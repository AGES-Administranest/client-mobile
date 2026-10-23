import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
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
import { validateServiceInvoiceForm } from '../domain/validateServiceInvoiceForm';
import { confirmServiceInvoice } from '../services/serviceInvoiceService';

type UseServiceInvoiceReviewOptions = {
  initialValues: ServiceInvoiceFormValues;
  onConfirmed: () => void;
};

export type ServiceInvoiceReviewState = {
  values: ServiceInvoiceFormValues;
  errors: ServiceInvoiceErrors;
  isDirty: boolean;
  client: {
    term: string;
    status: ClientSearchStatus;
    options: ClientOption[];
  };
  isSubmitting: boolean;
  submitFailed: boolean;
  changeIssueDate: (text: string) => void;
  changeAmount: (text: string) => void;
  changeNumber: (text: string) => void;
  changeClientTerm: (term: string) => void;
  selectClient: (client: ClientOption) => void;
  submit: () => Promise<void>;
};

export function useServiceInvoiceReview({
  initialValues,
  onConfirmed,
}: UseServiceInvoiceReviewOptions): ServiceInvoiceReviewState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<ServiceInvoiceErrors>({});
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const isMounted = useRef(true);
  const isSubmittingRef = useRef(false);
  const clientSearch = useClientSearch({
    active: true,
    paused: selectedClient !== null,
  });

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

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
      clientSearch.onTermChange(client.name);
    },
    [clearError, clientSearch],
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

  const submit = useCallback(async () => {
    if (isSubmittingRef.current) return;
    const { errors: found, input } = validateServiceInvoiceForm(values);
    setErrors(found);
    if (!input) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitFailed(false);
    try {
      if (!idToken) throw new Error('No active session');
      await confirmServiceInvoice(idToken, input);
    } catch {
      isSubmittingRef.current = false;
      if (isMounted.current) {
        setIsSubmitting(false);
        setSubmitFailed(true);
      }
      return;
    }
    isSubmittingRef.current = false;
    if (isMounted.current) setIsSubmitting(false);
    onConfirmed();
  }, [idToken, onConfirmed, values]);

  const isDirty =
    clientSearch.term !== '' ||
    values.issueDate !== initialValues.issueDate ||
    values.amount !== initialValues.amount ||
    values.number !== initialValues.number;

  return {
    values,
    errors,
    isDirty,
    client: {
      term: clientSearch.term,
      status: clientSearch.status,
      options: clientSearch.options,
    },
    isSubmitting,
    submitFailed,
    changeIssueDate,
    changeAmount,
    changeNumber,
    changeClientTerm,
    selectClient,
    submit,
  };
}
