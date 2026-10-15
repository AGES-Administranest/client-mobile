import { useCallback, useEffect, useRef, useState } from 'react';

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
  reloadIfFailed: () => void;
  add: (category: FinancialCategory) => void;
};

export function useFinancialCategories(): FinancialCategoriesState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [status, setStatus] = useState<CategoriesStatus>('loading');
  const [failure, setFailure] = useState<TranslationKey | null>(null);
  const [version, setVersion] = useState(0);
  const lastLoadFailed = useRef(false);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setFailure(null);

    Promise.resolve()
      .then(() => fetchFinancialCategories(requireToken(idToken)))
      .then(loaded => {
        if (!active) return;
        lastLoadFailed.current = false;
        setCategories(loaded);
        setStatus('ready');
      })
      .catch(error => {
        if (!active) return;
        lastLoadFailed.current = true;
        setStatus('failed');
        setFailure(toCategoriesFailureKey(error));
      });

    return () => {
      active = false;
    };
  }, [idToken, version]);

  // O campo de categoria remonta quando o formulário reabre: se ainda visse a
  // falha antiga, a anunciaria de novo antes da nova busca começar.
  const reload = useCallback(() => {
    setStatus('loading');
    setFailure(null);
    setVersion(current => current + 1);
  }, []);

  const reloadIfFailed = useCallback(() => {
    if (lastLoadFailed.current) {
      reload();
    }
  }, [reload]);

  const add = useCallback((category: FinancialCategory) => {
    setCategories(current => [
      ...current.filter(listed => listed.id !== category.id),
      category,
    ]);
  }, []);

  return { categories, status, failure, reload, reloadIfFailed, add };
}
