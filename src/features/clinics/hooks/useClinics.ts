import { useEffect, useState } from 'react';

import { useAuth } from 'features/auth';
import {
  loadClientsWithOffline,
  subscribeOfflineClients,
} from 'features/clients';
import type { TranslationKey } from 'shared/i18n';

import { requireToken, toClinicFailureKey } from './clinicFailure';
import type { Client } from '../domain/client';
import { fetchClinics } from '../services/clientService';

export type ClinicsState = {
  clinics: Client[];
  isLoading: boolean;
  loadFailure: TranslationKey | null;
  setClinics: React.Dispatch<React.SetStateAction<Client[]>>;
};

export function useClinics(): ClinicsState {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;
  const [clinics, setClinics] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailure, setLoadFailure] = useState<TranslationKey | null>(null);
  // Sobe quando a fila offline muda ou sincroniza: a lista se refaz e as
  // clínicas criadas offline trocam o id local pelo do backend.
  const [version, setVersion] = useState(0);

  useEffect(
    () => subscribeOfflineClients(() => setVersion(current => current + 1)),
    [],
  );

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setLoadFailure(null);

    loadClientsWithOffline(userId, () => fetchClinics(requireToken(idToken)))
      .then(loaded => {
        if (isMounted) setClinics(loaded.clients);
      })
      .catch(error => {
        if (!isMounted) return;
        const key = toClinicFailureKey(error);
        setLoadFailure(
          key === 'clinics.newClinic.failures.unknown'
            ? 'clinics.loadFailure'
            : key,
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [idToken, userId, version]);

  return { clinics, isLoading, loadFailure, setClinics };
}
