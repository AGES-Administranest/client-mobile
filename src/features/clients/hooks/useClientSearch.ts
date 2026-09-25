import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from 'features/auth';

import type { Client } from '../domain/client';
import {
  addClient,
  filterClients,
  getClientSearchStatus,
  MAX_VISIBLE_RESULTS,
  type ClientSearchStatus,
} from '../domain/clientSearch';
import { fetchClients } from '../services/clientService';

export type ClientSearchState = {
  term: string;
  status: ClientSearchStatus;
  options: Client[];
  onTermChange: (term: string) => void;
  /** Encaixa um tomador recém-criado na lista já carregada, sem novo GET. */
  addCreated: (client: Client) => void;
  reset: () => void;
};

type ClientSearchOptions = {
  /** O campo está em uso (o formulário aberto): é quando a lista é buscada. */
  active: boolean;
  /**
   * Desliga o filtro sem apagar o termo: quando um tomador já foi escolhido o
   * campo mostra o nome dele, e listar de novo só traria de volta a lista
   * que o usuário acabou de fechar.
   */
  paused: boolean;
};

/**
 * Estratégia de cache: a lista inteira é buscada uma vez a cada vez que o
 * campo passa a estar `active` (o formulário abre), e o filtro roda em memória
 * a cada tecla, sem rede e sem debounce.
 *
 * Por que a cada abertura e não uma vez por sessão: tomadores são cadastrados
 * também na aba Clínicas, e uma lista guardada desde o login não os veria.
 * A lista antiga continua valendo enquanto a nova carrega, então quem abre o
 * formulário de novo digita sem esperar. Falha na atualização com lista em
 * mãos é silenciosa; só sem lista nenhuma o erro aparece, e digitar de novo
 * tenta buscar outra vez.
 */
export function useClientSearch({
  active,
  paused,
}: ClientSearchOptions): ClientSearchState {
  const { session } = useAuth();
  const [term, setTerm] = useState('');
  const [clients, setClients] = useState<Client[] | null>(null);
  const [hasError, setHasError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const idToken = session?.idToken ?? null;

  useEffect(() => {
    if (!idToken) {
      setClients(null);
      return;
    }
    if (!active) {
      return;
    }

    let isCurrent = true;
    setHasError(false);

    fetchClients(idToken)
      .then(list => {
        if (isCurrent) setClients(list);
      })
      .catch(() => {
        if (isCurrent) setHasError(true);
      });

    return () => {
      isCurrent = false;
    };
  }, [idToken, active, attempt]);

  const onTermChange = useCallback(
    (next: string) => {
      setTerm(next);
      if (hasError) {
        setAttempt(current => current + 1);
      }
    },
    [hasError],
  );

  const addCreated = useCallback((created: Client) => {
    setClients(current => (current ? addClient(current, created) : current));
  }, []);

  const reset = useCallback(() => {
    setTerm('');
  }, []);

  const options = useMemo(
    () =>
      paused
        ? []
        : filterClients(clients ?? [], term).slice(0, MAX_VISIBLE_RESULTS),
    [clients, paused, term],
  );

  const status = getClientSearchStatus({
    term,
    paused,
    isLoading: clients === null && !hasError,
    hasError: clients === null && hasError,
    resultCount: options.length,
  });

  return { term, status, options, onTermChange, addCreated, reset };
}
