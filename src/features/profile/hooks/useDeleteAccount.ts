import { useCallback, useEffect, useRef, useState } from 'react';

import { AuthError, useAuth } from 'features/auth';
import { isOnline } from 'shared/services/network';

import { classifyDeletionFailure } from '../domain/deleteAccount';

export type DeletionPhase =
  | 'idle'
  | 'deleting'
  | 'wrongPassword'
  | 'offline'
  | 'failed'
  | 'done';

export type DeleteAccountState = {
  phase: DeletionPhase;
  password: string;
  canSubmit: boolean;
  setPassword: (password: string) => void;
  submit: () => Promise<void>;
  dismiss: () => void;
  finish: () => Promise<void>;
};

export function useDeleteAccount(active: boolean): DeleteAccountState {
  const { deleteAccount, finishAccountDeletion } = useAuth();
  const [phase, setPhase] = useState<DeletionPhase>('idle');
  const [password, setPassword] = useState('');
  const inFlight = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!active) {
      setPhase('idle');
      setPassword('');
    }
  }, [active]);

  const submit = useCallback(async () => {
    if (inFlight.current || password.length === 0) {
      return;
    }

    inFlight.current = true;
    setPhase('deleting');

    try {
      if (!(await isOnline())) {
        setPhase('offline');
        return;
      }

      await deleteAccount(password);
      if (isMounted.current) setPhase('done');
    } catch (error) {
      if (__DEV__ && !(error instanceof AuthError)) {
        console.warn(error);
      }
      if (isMounted.current) {
        setPhase(
          classifyDeletionFailure(
            error instanceof AuthError ? error.code : 'UNKNOWN',
          ),
        );
      }
    } finally {
      inFlight.current = false;
    }
  }, [deleteAccount, password]);

  const dismiss = useCallback(() => {
    setPhase(current => (current === 'deleting' ? current : 'idle'));
  }, []);

  return {
    phase,
    password,
    canSubmit: password.length > 0 && phase === 'idle',
    setPassword,
    submit,
    dismiss,
    finish: finishAccountDeletion,
  };
}
