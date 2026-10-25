import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import {
  isLocalClientId,
  useClientSearch,
  type ClientOption,
  type ClientSearchStatus,
} from 'features/clients';
import type { PickedPdf } from 'shared/services/pdfPicker';
import { formatCurrencyInput, formatDateInput } from 'shared/utils/inputMasks';

import { isWithinServiceInvoiceSizeLimit } from '../domain/acceptedFile';
import type { InitialClient } from '../domain/initialClient';
import type {
  ExtractedClient,
  ServiceInvoiceConfirmation,
  ServiceInvoiceDuplicate,
  ServiceInvoiceErrors,
  ServiceInvoiceField,
  ServiceInvoiceFormValues,
} from '../domain/serviceInvoice.types';
import { validateServiceInvoiceForm } from '../domain/validateServiceInvoiceForm';
import { queueManualServiceInvoice } from '../services/offlineServiceInvoiceStore';
import { confirmServiceInvoice } from '../services/serviceInvoiceService';

export type DuplicateNotice = {
  note: ServiceInvoiceDuplicate;
  view: 'alert' | 'details';
  /** Closed but kept, so the sheet still has its text while it slides out. */
  isOpen: boolean;
};

type UseServiceInvoiceReviewOptions = {
  invoiceId: string;
  initialValues: ServiceInvoiceFormValues;
  initialClient: InitialClient;
  /** Set when the note is typed by hand: it is queued with this PDF instead of confirmed. */
  manualFile?: PickedPdf | null;
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
    suggestions: ExtractedClient[];
  };
  duplicate: DuplicateNotice | null;
  isSubmitting: boolean;
  submitFailed: boolean;
  /** The PDF of a note typed by hand is over what the backend accepts. */
  fileTooLarge: boolean;
  changeIssueDate: (text: string) => void;
  changeAmount: (text: string) => void;
  changeNumber: (text: string) => void;
  changeClientTerm: (term: string) => void;
  selectClient: (client: ClientOption) => void;
  submit: () => Promise<void>;
  saveDuplicateAnyway: () => Promise<void>;
  dismissDuplicate: () => void;
  viewDuplicate: () => void;
  backToDuplicateAlert: () => void;
};

export function useServiceInvoiceReview({
  invoiceId,
  initialValues,
  initialClient,
  manualFile = null,
  onConfirmed,
}: UseServiceInvoiceReviewOptions): ServiceInvoiceReviewState {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;
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
  const [fileTooLarge, setFileTooLarge] = useState(false);
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
      // The backend would refuse it on the sync, long after the person left.
      const tooLarge =
        manualFile !== null &&
        !isWithinServiceInvoiceSizeLimit(manualFile.bytes.length);
      setFileTooLarge(tooLarge);
      if (tooLarge) return;
      const { errors: found, input } = validateServiceInvoiceForm(values);
      // A taker registered offline has no real id yet, and a note confirmed now
      // cannot point at one the backend has never seen. A note typed by hand
      // waits in the queue, which swaps the id once the taker has synced.
      if (input && !manualFile && isLocalClientId(input.clientId)) {
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
        if (manualFile) {
          if (!userId) throw new Error('No active session');
          const { id } = await queueManualServiceInvoice(
            userId,
            invoiceId,
            input,
            manualFile,
          );
          confirmation = { id };
        } else {
          if (!idToken) throw new Error('No active session');
          confirmation = await confirmServiceInvoice(
            idToken,
            invoiceId,
            input,
            { allowDuplicate },
          );
        }
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
      if (isMounted.current) onConfirmed();
    },
    [
      closeDuplicate,
      idToken,
      invoiceId,
      manualFile,
      onConfirmed,
      userId,
      values,
    ],
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
    fileTooLarge,
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
