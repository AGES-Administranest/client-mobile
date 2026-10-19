import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import type { TranslationKey } from 'shared/i18n';
import { ApiError } from 'shared/services/apiClient';

import type { Equipment, EquipmentSummary } from '../domain/equipment.types';
import { equipmentService } from '../services/equipmentService';

type EquipmentListState = {
  equipments: Equipment[];
  summary: EquipmentSummary | null;
  isLoading: boolean;
  error: TranslationKey | null;
  refresh: () => Promise<void>;
};

// Sem token a chamada só pode voltar 401; falhar antes com o mesmo erro mantém
// uma única mensagem de sessão na tela.
function requireToken(idToken: string | null): string {
  if (!idToken) {
    throw new ApiError('No active session', 'UNAUTHENTICATED', 401);
  }
  return idToken;
}

function errorKey(error: unknown): TranslationKey {
  return error instanceof ApiError && error.status === 401
    ? 'equipment.errorSession'
    : 'equipment.errorLoad';
}

export function useEquipmentList(): EquipmentListState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [summary, setSummary] = useState<EquipmentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<TranslationKey | null>(null);
  const isMounted = useRef(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = requireToken(idToken);
      const [list, totals] = await Promise.all([
        equipmentService.list(token),
        equipmentService.summary(token),
      ]);
      if (!isMounted.current) return;
      setEquipments(list);
      setSummary(totals);
    } catch (loadError) {
      if (!isMounted.current) return;
      setError(errorKey(loadError));
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    isMounted.current = true;
    refresh();
    return () => {
      isMounted.current = false;
    };
  }, [refresh]);

  return { equipments, summary, isLoading, error, refresh };
}
