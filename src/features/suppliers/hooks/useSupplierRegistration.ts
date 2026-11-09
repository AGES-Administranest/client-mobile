import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { useSupplierForm } from './useSupplierForm';
import { DUPLICATED_TAX_ID, useSuppliers } from './useSuppliers';
import { EMPTY_SUPPLIER_DRAFT, type Supplier } from '../domain/supplierForm';

type Stage = 'review' | 'register';

type UseSupplierRegistrationOptions = {
  onCreated: (supplier: Supplier) => void;
};

/**
 * Swaps a screen and the supplier registration without ever stacking two
 * modals, the same way the clinic registration does: `shown` goes through
 * 'none' in between, and the next one only opens once the previous one reports
 * it has left (iOS drops a Modal presented while another is still leaving).
 */
export function useSupplierRegistration({
  onCreated,
}: UseSupplierRegistrationOptions) {
  const { suppliers, isLoading, failure, create } = useSuppliers();
  const form = useSupplierForm();
  const [isSaving, setIsSaving] = useState(false);
  const isMounted = useRef(true);
  const [stage, setStage] = useState<Stage>('review');
  const [shown, setShown] = useState<Stage | 'none'>('review');
  const stageRef = useRef(stage);
  stageRef.current = stage;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (shown === 'none' && Platform.OS !== 'ios') setShown(stage);
  }, [shown, stage]);

  const goTo = useCallback((next: Stage) => {
    setStage(next);
    setShown('none');
  }, []);

  const open = useCallback(
    (name: string) => {
      form.reset({ ...EMPTY_SUPPLIER_DRAFT, name });
      goTo('register');
    },
    [form, goTo],
  );

  const cancel = useCallback(() => goTo('review'), [goTo]);

  const submit = useCallback(async () => {
    const payload = form.validate();
    if (!payload) return;
    setIsSaving(true);
    const created = await create(payload);
    if (!isMounted.current) return;
    setIsSaving(false);
    if (created === DUPLICATED_TAX_ID) {
      form.setFieldError('taxId', 'duplicated');
    } else if (created) {
      onCreated(created);
      goTo('review');
    }
  }, [form, create, onCreated, goTo]);

  const onReviewLeft = useCallback(() => {
    if (stageRef.current === 'register') setShown('register');
  }, []);

  const onRegisterLeft = useCallback(() => {
    if (stageRef.current === 'review') setShown('review');
  }, []);

  return {
    suppliers,
    isLoading,
    failure,
    form,
    isSaving,
    isReviewShown: shown === 'review',
    isRegisterShown: shown === 'register',
    open,
    cancel,
    submit,
    onReviewLeft,
    onRegisterLeft,
  };
}
