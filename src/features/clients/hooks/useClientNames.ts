import { useEffect, useState } from 'react';

import { useAuth } from 'features/auth';

import { fetchClients } from '../services/clientService';

// O atendimento só traz o `clientId`; o nome da clínica vem da lista de clínicas.
export function useClientNames(): Record<string, string> {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!idToken) {
      return;
    }
    let isMounted = true;
    fetchClients(idToken)
      .then(clients => {
        if (isMounted) {
          setNames(Object.fromEntries(clients.map(c => [c.id, c.name])));
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [idToken]);

  return names;
}
