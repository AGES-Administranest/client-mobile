import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { useNewClinicForm } from 'features/clinics';

import type { NewClientPrefill } from '../domain/initialClient';

type Stage = 'review' | 'register';

type CreatedClient = { id: string; name: string };

type UseClientRegistrationOptions = {
  prefill: NewClientPrefill;
  onCreated: (client: CreatedClient) => void;
};

/**
 * Swaps the review and the taker registration without ever stacking two
 * modals. `shown` is what is on screen: it goes through 'none' in between, and
 * the next one only opens once the previous one reports it has left. iOS drops
 * a Modal presented while another is still leaving, without an error.
 */
export type ClientRegistrationState = {
  form: ReturnType<typeof useNewClinicForm>;
  isReviewShown: boolean;
  isRegisterShown: boolean;
  open: () => void;
  cancel: () => void;
  submit: () => Promise<void>;
  onReviewLeft: () => void;
  onRegisterLeft: () => void;
};

export function useClientRegistration({
  prefill,
  onCreated,
}: UseClientRegistrationOptions): ClientRegistrationState {
  const form = useNewClinicForm();
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

  // Only iOS reports a full-screen Modal leaving (onDismiss); elsewhere there
  // is nothing to wait for.
  useEffect(() => {
    if (shown === 'none' && Platform.OS !== 'ios') setShown(stage);
  }, [shown, stage]);

  const goTo = useCallback((next: Stage) => {
    setStage(next);
    setShown('none');
  }, []);

  const open = useCallback(() => {
    form.reset({ name: prefill.name, cnpj: prefill.taxId });
    goTo('register');
  }, [form, goTo, prefill]);

  const cancel = useCallback(() => goTo('review'), [goTo]);

  const submit = useCallback(async () => {
    const created = await form.submit();
    if (!created || !isMounted.current) return;
    onCreated(created);
    goTo('review');
  }, [form, goTo, onCreated]);

  const onReviewLeft = useCallback(() => {
    if (stageRef.current === 'register') setShown('register');
  }, []);

  const onRegisterLeft = useCallback(() => {
    if (stageRef.current === 'review') setShown('review');
  }, []);

  return {
    form,
    isReviewShown: shown === 'review',
    isRegisterShown: shown === 'register',
    open,
    cancel,
    submit,
    onReviewLeft,
    onRegisterLeft,
  };
}
