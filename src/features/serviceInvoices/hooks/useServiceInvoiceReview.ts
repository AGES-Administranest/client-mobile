import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import {
  isLocalClientId,
  useClientSearch,
  type ClientOption,
} from 'features/clients';
import { formatCurrencyInput, formatDateInput } from 'shared/utils/inputMasks';

import type { InitialClient } from '../domain/initialClient';
import type {
  ServiceInvoiceConfirmation,
  ServiceInvoiceDuplicate,
  ServiceInvoiceErrors,
  ServiceInvoiceField,
  ServiceInvoiceFormValues,
} from '../domain/serviceInvoice.types';
import { validateServiceInvoiceForm } from '../domain/validateServiceInvoiceForm';
import { confirmServiceInvoice } from '../services/serviceInvoiceService';

type DuplicateNotice = {
  note: ServiceInvoiceDuplicate;
  view: 'alert' | 'details';
  /** Closed but kept, so the sheet still has its text while it slides out. */
  isOpen: boolean;
};

type UseServiceInvoiceReviewOptions = {
  initialValues: ServiceInvoiceFormValues;
  initialClient: InitialClient;
  onConfirmed: () => void;
};

export function useServiceInvoiceReview({
  initialValues,
  initialClient,
  onConfirmed,
}: UseServiceInvoiceReviewOptions) {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<ServiceInvoiceErrors>({});
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(
    initialClient.selected
      ? { id: initialClient.selected.id, name: initialClient.selected.name }
      : null,
  );
  const [duplicate, setDuplicate] = useState<DuplicateNotice | null>(null);
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

  const closeDuplicate = useCallback(
    () => setDuplicate(current => current && { ...current, isOpen: false }),
    [],
  );

  const send = useCallback(
    async (allowDuplicate: boolean) => {
      if (isSubmittingRef.current) return;
      const { errors: found, input } = validateServiceInvoiceForm(values);
      // A taker registered offline has no real id yet, and the note cannot
      // point at one the backend has never seen.
      if (input && isLocalClientId(input.clientId)) {
        found.clientId = 'pending';
      }
      setErrors(found);
      if (!input || found.clientId) {
        closeDuplicate();
        return;
      }

      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setSubmitFailed(false);
      let confirmation: ServiceInvoiceConfirmation;
      try {
        if (!idToken) throw new Error('No active session');
        confirmation = await confirmServiceInvoice(idToken, input, {
          allowDuplicate,
        });
      } catch {
        isSubmittingRef.current = false;
        if (isMounted.current) {
          setIsSubmitting(false);
          setSubmitFailed(true);
          closeDuplicate();
        }
        return;
      }
      isSubmittingRef.current = false;
      if (isMounted.current) setIsSubmitting(false);
      if ('duplicateOf' in confirmation) {
        if (isMounted.current) {
          setDuplicate({
            note: confirmation.duplicateOf,
            view: 'alert',
            isOpen: true,
          });
        }
        return;
      }
      onConfirmed();
    },
    [closeDuplicate, idToken, onConfirmed, values],
  );

  const submit = useCallback(() => send(false), [send]);
  const saveDuplicateAnyway = useCallback(() => send(true), [send]);
  const viewDuplicate = useCallback(
    () => setDuplicate(current => current && { ...current, view: 'details' }),
    [],
  );
  const backToDuplicateAlert = useCallback(
    () => setDuplicate(current => current && { ...current, view: 'alert' }),
    [],
  );

  // The taker the reading linked is not an edit; changing it, clearing it or
  // typing a search is.
  const isDirty =
    values.clientId !== initialValues.clientId ||
    (values.clientId === null && clientSearch.term !== '') ||
    values.issueDate !== initialValues.issueDate ||
    values.amount !== initialValues.amount ||
    values.number !== initialValues.number;

  return {
    values,
    errors,
    isDirty,
    client: {
      term: selectedClient?.name ?? clientSearch.term,
      status: clientSearch.status,
      options: clientSearch.options,
      suggestions: selectedClient ? [] : initialClient.suggestions,
    },
    duplicate,
    isSubmitting,
    submitFailed,
    changeIssueDate,
    changeAmount,
    changeNumber,
    changeClientTerm,
    selectClient,
    submit,
    saveDuplicateAnyway,
    dismissDuplicate: closeDuplicate,
    viewDuplicate,
    backToDuplicateAlert,
  };
}
