import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import { isLocalClientId } from 'features/clients';
import { ApiError } from 'shared/services/apiClient';
import { isNetworkError } from 'shared/utils/network';

import {
  useServiceInvoiceFields,
  type ServiceInvoiceFieldsState,
} from './useServiceInvoiceFields';
import {
  toCorrectionValues,
  validateCorrection,
} from '../domain/invoiceCorrection';
import type { ServiceInvoiceRecord } from '../domain/serviceInvoiceRecord.types';
import { notifyOfflineServiceInvoicesChanged } from '../services/offlineServiceInvoiceStore';
import { correctServiceInvoice } from '../services/serviceInvoiceRecordService';

export type CorrectionFailure =
  | 'network'
  | 'notFound'
  | 'clientNotFound'
  | 'generic';

type UseServiceInvoiceCorrectionOptions = {
  record: ServiceInvoiceRecord;
  onCorrected: (record: ServiceInvoiceRecord) => void;
};

export type ServiceInvoiceCorrectionState = Omit<
  ServiceInvoiceFieldsState,
  'setErrors' | 'changeNumber'
> & {
  location: string;
  isDirty: boolean;
  isSubmitting: boolean;
  failure: CorrectionFailure | null;
  changeLocation: (text: string) => void;
  submit: () => Promise<void>;
};

function failureOf(error: unknown): CorrectionFailure {
  if (isNetworkError(error)) return 'network';
  if (error instanceof ApiError && error.code === 'CLIENT_NOT_FOUND') {
    return 'clientNotFound';
  }
  if (error instanceof ApiError && error.code === 'SERVICE_INVOICE_NOT_FOUND') {
    return 'notFound';
  }
  return 'generic';
}

export function useServiceInvoiceCorrection({
  record,
  onCorrected,
}: UseServiceInvoiceCorrectionOptions): ServiceInvoiceCorrectionState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [initialValues] = useState(() => toCorrectionValues(record));
  const fields = useServiceInvoiceFields({
    initialValues,
    initialClient: { id: record.clientId, name: record.clientName },
  });
  const [location, setLocation] = useState(initialValues.location);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failure, setFailure] = useState<CorrectionFailure | null>(null);
  const isMounted = useRef(true);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const { values, setErrors } = fields;

  const submit = useCallback(async () => {
    if (isSubmittingRef.current) return;
    const { errors, input } = validateCorrection(values, location);
    if (input && isLocalClientId(input.clientId)) errors.clientId = 'pending';
    setErrors(errors);
    if (!input || errors.clientId) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setFailure(null);
    try {
      if (!idToken) throw new Error('No active session');
      const corrected = await correctServiceInvoice(idToken, record.id, input);
      notifyOfflineServiceInvoicesChanged();
      if (isMounted.current) onCorrected(corrected);
    } catch (error) {
      if (isMounted.current) setFailure(failureOf(error));
    } finally {
      isSubmittingRef.current = false;
      if (isMounted.current) setIsSubmitting(false);
    }
  }, [values, location, setErrors, idToken, record.id, onCorrected]);

  return {
    values: fields.values,
    errors: fields.errors,
    client: fields.client,
    location,
    isDirty: fields.isDirty || location !== initialValues.location,
    isSubmitting,
    failure,
    changeIssueDate: fields.changeIssueDate,
    changeAmount: fields.changeAmount,
    changeClientTerm: fields.changeClientTerm,
    selectClient: fields.selectClient,
    changeLocation: setLocation,
    submit,
  };
}
