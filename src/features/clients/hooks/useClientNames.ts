import { useEffect, useState } from 'react';

import { useAuth } from 'features/auth';

import { fetchClients } from '../services/clientService';
import {
  loadClientsWithOffline,
  subscribeOfflineClients,
} from '../services/offlineClientStore';

// O atendimento só traz o `clientId`; o nome da clínica vem da lista de clínicas.
export function useClientNames(): Record<string, string> {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;
  const [names, setNames] = useState<Record<string, string>>({});
  const [version, setVersion] = useState(0);

  useEffect(
    () => subscribeOfflineClients(() => setVersion(current => current + 1)),
    [],
  );

  useEffect(() => {
    if (!idToken) {
      return;
    }
    let isMounted = true;
    // Inclui as clínicas cadastradas offline: um agendamento offline pode
    // apontar para uma delas pelo id local.
    loadClientsWithOffline(userId, () => fetchClients(idToken))
      .then(({ clients }) => {
        if (isMounted) {
          setNames(Object.fromEntries(clients.map(c => [c.id, c.name])));
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [idToken, userId, version]);

  return names;
}
