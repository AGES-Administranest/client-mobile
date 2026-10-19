import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import type { TranslationKey } from 'shared/i18n';

import {
  isDeleteViaOriginError,
  isEntryNotFoundError,
  requireToken,
  toDeleteFailureKey,
} from './entryFailure';
import type { FinancialEntry } from '../domain/financialEntry';
import { deleteFinancialEntry } from '../services/financialEntryService';

/**
 * `viaOrigin`: um automático, que só sai excluindo a origem. A tela não chega
 * a pedir isso, mas um extrato desatualizado poderia.
 */
export type DeleteEntryOutcome = 'deleted' | 'viaOrigin' | 'failed' | 'busy';

export type DeleteEntryState = {
  isDeleting: boolean;
  failure: TranslationKey | null;
  remove: (entry: FinancialEntry) => Promise<DeleteEntryOutcome>;
  reset: () => void;
};

export function useDeleteEntry(): DeleteEntryState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [isDeleting, setIsDeleting] = useState(false);
  const [failure, setFailure] = useState<TranslationKey | null>(null);
  // Dois toques antes do próximo render não podem mandar dois DELETEs.
  const isSending = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const remove = useCallback(
    async (entry: FinancialEntry): Promise<DeleteEntryOutcome> => {
      if (isSending.current) {
        return 'busy';
      }
      isSending.current = true;
      setIsDeleting(true);
      setFailure(null);
      try {
        await deleteFinancialEntry(requireToken(idToken), entry.id);
        return 'deleted';
      } catch (error) {
        // Já apagado (outro aparelho, outra aba): era o que a pessoa queria.
        if (isEntryNotFoundError(error)) return 'deleted';
        if (isDeleteViaOriginError(error)) return 'viaOrigin';
        if (isMounted.current) setFailure(toDeleteFailureKey(error));
        return 'failed';
      } finally {
        isSending.current = false;
        if (isMounted.current) setIsDeleting(false);
      }
    },
    [idToken],
  );

  const reset = useCallback(() => {
    setFailure(null);
  }, []);

  return { isDeleting, failure, remove, reset };
}
