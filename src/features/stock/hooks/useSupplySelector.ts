import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from 'features/auth';
import { backendUnitLabel, searchItems } from 'features/materials';

import {
  canConfirm,
  exceedsBalance,
  isSearchable,
  parseQuantity,
  sanitizeQuantityInput,
  toSupplyOption,
  toSupplySelection,
  type SupplyOption,
  type SupplySelection,
} from '../domain/supplySelection';

const SEARCH_DEBOUNCE_MS = 300;

const DEFAULT_QUANTITY = '1';

export type SupplySelectorState = {
  term: string;
  onTermChange: (term: string) => void;
  options: SupplyOption[];
  isLoading: boolean;
  hasError: boolean;
  /** Digitou pouco para o backend filtrar: a lista espera em vez de mentir. */
  isTermTooShort: boolean;
  selected: SupplyOption | null;
  onSelect: (option: SupplyOption) => void;
  quantity: string;
  onQuantityChange: (quantity: string) => void;
  /** Quantidade acima do saldo: avisa, não impede confirmar. */
  isOverBalance: boolean;
  canSubmit: boolean;
  submit: () => SupplySelection | null;
  reset: () => void;
};

export function useSupplySelector(): SupplySelectorState {
  const { session } = useAuth();
  const [term, setTerm] = useState('');
  const [options, setOptions] = useState<SupplyOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [selected, setSelected] = useState<SupplyOption | null>(null);
  const [quantity, setQuantity] = useState(DEFAULT_QUANTITY);

  const idToken = session?.idToken ?? null;
  const isTermTooShort = term.length > 0 && !isSearchable(term);

  useEffect(() => {
    if (!idToken || !isSearchable(term)) {
      setOptions([]);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    let isCurrent = true;
    setIsLoading(true);
    setHasError(false);

    // Espera a digitação parar: sem isso cada tecla vira uma chamada, e a
    // resposta de um termo antigo pode chegar depois e sobrescrever a atual.
    const timer = setTimeout(() => {
      searchItems(idToken, term)
        .then(items => {
          if (!isCurrent) return;
          setOptions(
            items.map(item =>
              toSupplyOption(item, backendUnitLabel(item.unit)),
            ),
          );
          setIsLoading(false);
        })
        .catch(() => {
          if (!isCurrent) return;
          setHasError(true);
          setIsLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [idToken, term]);

  const onTermChange = useCallback((next: string) => {
    setTerm(next);
    // Trocar a busca desfaz a escolha anterior: o item selecionado pode nem
    // estar na lista nova.
    setSelected(null);
  }, []);

  const onSelect = useCallback((option: SupplyOption) => {
    setSelected(option);
    setQuantity(DEFAULT_QUANTITY);
  }, []);

  const onQuantityChange = useCallback((next: string) => {
    setQuantity(sanitizeQuantityInput(next));
  }, []);

  const isOverBalance = useMemo(
    () =>
      selected !== null &&
      exceedsBalance(parseQuantity(quantity), selected.balance),
    [selected, quantity],
  );

  const canSubmit = canConfirm(selected, quantity);

  const reset = useCallback(() => {
    setTerm('');
    setOptions([]);
    setSelected(null);
    setQuantity(DEFAULT_QUANTITY);
    setHasError(false);
    setIsLoading(false);
  }, []);

  const submit = useCallback(() => {
    if (!selected || !canConfirm(selected, quantity)) {
      return null;
    }
    return toSupplySelection(selected, quantity);
  }, [selected, quantity]);

  return {
    term,
    onTermChange,
    options,
    isLoading,
    hasError,
    isTermTooShort,
    selected,
    onSelect,
    quantity,
    onQuantityChange,
    isOverBalance,
    canSubmit,
    submit,
    reset,
  };
}
