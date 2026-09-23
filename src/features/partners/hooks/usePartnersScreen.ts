import { useEffect, useState } from 'react';

import { useAuth } from 'features/auth';
import type { TranslationKey } from 'shared/i18n';

import { fetchClinics, type Clinic } from '../services/clinicService';

export type PartnersSegment = 'clinics' | 'suppliers';

export type PartnersScreenState = {
  segment: PartnersSegment;
  onSegmentChange: (segment: PartnersSegment) => void;
  clinics: Clinic[];
  isLoading: boolean;
  error: TranslationKey | null;
};

export function usePartnersScreen(): PartnersScreenState {
  const { session } = useAuth();
  const idToken = session?.idToken;
  const [segment, setSegment] = useState<PartnersSegment>('clinics');
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<TranslationKey | null>(null);

  useEffect(() => {
    if (!idToken) return;
    let isMounted = true;
    fetchClinics(idToken)
      .then(result => {
        if (isMounted) setClinics(result);
      })
      .catch(() => {
        if (isMounted) setError('partners.errorLoad');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [idToken]);

  return { segment, onSegmentChange: setSegment, clinics, isLoading, error };
}
