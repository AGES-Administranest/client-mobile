import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import type { ClientOption } from 'features/clients';

import type {
  ProcedureEstimate,
  ProcedureEstimateDto,
  ProcedureSelectedSupply,
} from '../domain/pricing.types';
import {
  mapProcedureEstimate,
  validateDuration,
  type DurationValidationResult,
} from '../domain/procedureEstimate';
import {
  isPricingUnconfiguredError,
  pricingService,
} from '../services/pricingService';
import { savedProcedureEstimateService } from '../services/savedProcedureEstimateService';

export const ESTIMATE_DEBOUNCE_MS = 500;

export type ProcedureEstimateStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'error'
  | 'needsPricingSetup';

export type UseProcedureEstimate = {
  hours: string;
  minutes: string;
  selectedClient: ClientOption | null;
  selectedSupplies: ProcedureSelectedSupply[];
  durationValidation: DurationValidationResult;
  status: ProcedureEstimateStatus;
  estimate: ProcedureEstimate | null;
  canSave: boolean;
  setHours: (hours: string) => void;
  setMinutes: (minutes: string) => void;
  selectClient: (client: ClientOption) => void;
  clearClient: () => void;
  addSupply: (supply: ProcedureSelectedSupply) => void;
  updateSupplyQuantity: (itemId: string, quantity: number) => void;
  removeSupply: (itemId: string) => void;
  clearForm: () => void;
  saveSimulation: () => Promise<boolean>;
  retry: () => void;
  reload: () => void;
};

export function useProcedureEstimate(
  debounceMs: number = ESTIMATE_DEBOUNCE_MS,
): UseProcedureEstimate {
  const { account, session } = useAuth();
  const userId = account?.id ?? null;
  const idToken = session?.idToken ?? null;

  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(
    null,
  );
  const [selectedSupplies, setSelectedSupplies] = useState<
    ProcedureSelectedSupply[]
  >([]);

  const [status, setStatus] = useState<ProcedureEstimateStatus>('idle');
  const [estimate, setEstimate] = useState<ProcedureEstimate | null>(null);
  const [isRestored, setIsRestored] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const requestIdRef = useRef(0);

  const durationValidation = validateDuration(hours, minutes);

  useEffect(() => {
    let isCurrent = true;
    savedProcedureEstimateService.load(userId).then(saved => {
      if (!isCurrent) return;
      if (saved) {
        setHours(saved.hours);
        setMinutes(saved.minutes);
        setSelectedClient(saved.client);
        setSelectedSupplies(saved.supplies);
      }
      setIsRestored(true);
    });
    return () => {
      isCurrent = false;
    };
  }, [userId]);

  const calculateEstimate = useCallback(async () => {
    if (!idToken) {
      setStatus('error');
      return;
    }

    if (!durationValidation.isValid) {
      setStatus('idle');
      setEstimate(null);
      return;
    }

    setStatus('loading');
    const currentRequestId = ++requestIdRef.current;

    const dto: ProcedureEstimateDto = {
      durationMinutes: durationValidation.durationMinutes,
      clientId: selectedClient?.id ?? null,
      supplies:
        selectedSupplies.length > 0
          ? selectedSupplies.map(supply => ({
              itemId: supply.itemId,
              quantity: supply.quantity,
            }))
          : undefined,
    };

    try {
      const response = await pricingService.estimateProcedure(idToken, dto);

      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      setEstimate(mapProcedureEstimate(response));
      setStatus('success');
    } catch (error) {
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      if (isPricingUnconfiguredError(error)) {
        setStatus('needsPricingSetup');
      } else {
        setStatus('error');
      }
    }
  }, [
    idToken,
    durationValidation.isValid,
    durationValidation.durationMinutes,
    selectedClient?.id,
    selectedSupplies,
  ]);

  useEffect(() => {
    if (!isRestored) {
      return;
    }

    if (!durationValidation.isValid) {
      setStatus('idle');
      setEstimate(null);
      return;
    }

    setStatus('loading');

    const timer = setTimeout(() => {
      calculateEstimate();
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [
    isRestored,
    durationValidation.isValid,
    debounceMs,
    calculateEstimate,
    retryTrigger,
  ]);

  const addSupply = useCallback((newSupply: ProcedureSelectedSupply) => {
    setSelectedSupplies(prev => {
      const existingIndex = prev.findIndex(s => s.itemId === newSupply.itemId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + newSupply.quantity,
        };
        return updated;
      }
      return [...prev, newSupply];
    });
  }, []);

  const updateSupplyQuantity = useCallback(
    (itemId: string, quantity: number) => {
      setSelectedSupplies(prev =>
        prev.map(supply =>
          supply.itemId === itemId ? { ...supply, quantity } : supply,
        ),
      );
    },
    [],
  );

  const removeSupply = useCallback((itemId: string) => {
    setSelectedSupplies(prev =>
      prev.filter(supply => supply.itemId !== itemId),
    );
  }, []);

  const clearClient = useCallback(() => {
    setSelectedClient(null);
  }, []);

  const clearForm = useCallback(() => {
    setHours('');
    setMinutes('');
    setSelectedClient(null);
    setSelectedSupplies([]);
    setEstimate(null);
    if (status !== 'needsPricingSetup') {
      setStatus('idle');
    }
  }, [status]);

  const saveSimulation = useCallback(async (): Promise<boolean> => {
    if (!durationValidation.isValid || !estimate || status !== 'success') {
      return false;
    }
    await savedProcedureEstimateService.save(userId, {
      hours,
      minutes,
      client: selectedClient,
      supplies: selectedSupplies,
      estimate,
      savedAt: new Date().toISOString(),
    });
    return true;
  }, [
    durationValidation.isValid,
    estimate,
    status,
    userId,
    hours,
    minutes,
    selectedClient,
    selectedSupplies,
  ]);

  const retry = useCallback(() => {
    setRetryTrigger(prev => prev + 1);
  }, []);

  const reload = useCallback(() => {
    setRetryTrigger(prev => prev + 1);
  }, []);

  const canSave =
    durationValidation.isValid &&
    estimate !== null &&
    status === 'success';

  return {
    hours,
    minutes,
    selectedClient,
    selectedSupplies,
    durationValidation,
    status,
    estimate,
    canSave,
    setHours,
    setMinutes,
    selectClient: setSelectedClient,
    clearClient,
    addSupply,
    updateSupplyQuantity,
    removeSupply,
    clearForm,
    saveSimulation,
    retry,
    reload,
  };
}
