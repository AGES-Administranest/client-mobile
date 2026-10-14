import { useCallback, useEffect, useState } from 'react';

import { useAuth } from 'features/auth';
import type { TranslationKey } from 'shared/i18n';

import { requireToken, toCategoriesFailureKey } from './entryFailure';
import type { FinancialCategory } from '../domain/financialEntry';
import { fetchFinancialCategories } from '../services/financialEntryService';

export type CategoriesStatus = 'loading' | 'ready' | 'failed';

export type FinancialCategoriesState = {
  categories: FinancialCategory[];
  status: CategoriesStatus;
  failure: TranslationKey | null;
  reload: () => void;
  add: (category: FinancialCategory) => void;
};

export function useFinancialCategories(): FinancialCategoriesState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [status, setStatus] = useState<CategoriesStatus>('loading');
  const [failure, setFailure] = useState<TranslationKey | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setFailure(null);

    Promise.resolve()
      .then(() => fetchFinancialCategories(requireToken(idToken)))
      .then(loaded => {
        if (!active) return;
        setCategories(loaded);
        setStatus('ready');
      })
      .catch(error => {
        if (!active) return;
        setStatus('failed');
        setFailure(toCategoriesFailureKey(error));
      });

    return () => {
      active = false;
    };
  }, [idToken, version]);

  const reload = useCallback(() => {
    setVersion(current => current + 1);
  }, []);

  const add = useCallback((category: FinancialCategory) => {
    setCategories(current => [
      ...current.filter(listed => listed.id !== category.id),
      category,
    ]);
  }, []);

  return { categories, status, failure, reload, add };
}
