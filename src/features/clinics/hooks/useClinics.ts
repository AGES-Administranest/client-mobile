import { useEffect, useState } from 'react';

import { useAuth } from 'features/auth';
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
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [clinics, setClinics] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailure, setLoadFailure] = useState<TranslationKey | null>(null);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setLoadFailure(null);

    (async () => fetchClinics(requireToken(idToken)))()
      .then(loaded => {
        if (isMounted) setClinics(loaded);
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
  }, [idToken]);

  return { clinics, isLoading, loadFailure, setClinics };
}
