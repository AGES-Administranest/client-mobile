import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from 'features/auth';

import type { Client } from '../domain/client';
import {
  filterClients,
  getClientSearchStatus,
  MAX_VISIBLE_RESULTS,
  type ClientSearchStatus,
} from '../domain/clientSearch';
import { fetchClients } from '../services/clientService';
import {
  loadClientsWithOffline,
  subscribeOfflineClients,
} from '../services/offlineClientStore';

export type ClientSearchState = {
  term: string;
  status: ClientSearchStatus;
  options: Client[];
  onTermChange: (term: string) => void;
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
 * a cada tecla, sem rede e sem debounce. Sem termo digitado, `options` já traz
 * a lista inteira (até MAX_VISIBLE_RESULTS): quem abre o campo escolhe direto
 * de um dropdown, sem precisar digitar nada.
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
  const { session, account } = useAuth();
  const userId = account?.id ?? null;
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

    // Sem rede, a lista salva da última vez (mais as clínicas cadastradas
    // offline) — o formulário de agendamento funciona offline também.
    loadClientsWithOffline(userId, () => fetchClients(idToken))
      .then(loaded => {
        if (isCurrent) setClients(loaded.clients);
      })
      .catch(() => {
        if (isCurrent) setHasError(true);
      });

    return () => {
      isCurrent = false;
    };
  }, [idToken, userId, active, attempt]);

  // Clínica cadastrada ou sincronizada enquanto o campo está aberto.
  useEffect(
    () => subscribeOfflineClients(() => setAttempt(current => current + 1)),
    [],
  );

  const onTermChange = useCallback(
    (next: string) => {
      setTerm(next);
      if (hasError) {
        setAttempt(current => current + 1);
      }
    },
    [hasError],
  );

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
    paused,
    isLoading: clients === null && !hasError,
    hasError: clients === null && hasError,
    resultCount: options.length,
  });

  return { term, status, options, onTermChange, reset };
}
