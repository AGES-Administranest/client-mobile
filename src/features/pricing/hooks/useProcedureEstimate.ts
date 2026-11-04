import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import type { ClientOption } from 'features/clients';
import { monthOf } from 'shared/utils/monthPeriod';

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

export const ESTIMATE_DEBOUNCE_MS = 500;

export type ProcedureEstimateStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'error'
  | 'needsPricingSetup';

export type UseProcedureEstimate = {
  // Estado do formulário
  hours: string;
  minutes: string;
  selectedClient: ClientOption | null;
  selectedSupplies: ProcedureSelectedSupply[];

  // Validação
  durationValidation: DurationValidationResult;

  // Estado da simulação
  status: ProcedureEstimateStatus;
  estimate: ProcedureEstimate | null;

  // Ações do formulário
  setHours: (hours: string) => void;
  setMinutes: (minutes: string) => void;
  selectClient: (client: ClientOption) => void;
  clearClient: () => void;
  addSupply: (supply: ProcedureSelectedSupply) => void;
  updateSupplyQuantity: (itemId: string, quantity: number) => void;
  removeSupply: (itemId: string) => void;

  // Controle de fluxo
  retry: () => void;
  reload: () => void;
};

export function useProcedureEstimate(
  debounceMs: number = ESTIMATE_DEBOUNCE_MS,
): UseProcedureEstimate {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;

  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(
    null,
  );
  const [selectedSupplies, setSelectedSupplies] = useState<
    ProcedureSelectedSupply[]
  >([]);

  const [status, setStatus] = useState<ProcedureEstimateStatus>('loading');
  const [estimate, setEstimate] = useState<ProcedureEstimate | null>(null);

  // Versão de reload para forçar nova verificação inicial de honorários e recálculo
  const [checkVersion, setCheckVersion] = useState(0);
  const reload = useCallback(() => {
    setCheckVersion(v => v + 1);
  }, []);

  // Tentativa de recálculo (retry) sem rechecar honorários do zero
  const [retryAttempt, setRetryAttempt] = useState(0);
  const retry = useCallback(() => {
    setRetryAttempt(a => a + 1);
  }, []);

  const requestIdRef = useRef(0);
  const pricingCheckedRef = useRef(false);

  // Validação da duração
  const durationValidation = validateDuration(hours, minutes);

  // Subtask 2: Checagem inicial ao acessar a simulação
  // Faz a chamada real ao GET /pricing/hourly-rate (US20) para verificar se o usuário
  // tem honorários configurados (retorna null se receber 404/409).
  useEffect(() => {
    if (!idToken) {
      setStatus('error');
      return;
    }

    let isMounted = true;
    pricingCheckedRef.current = false;
    setStatus('loading');

    const currentMonth = monthOf(new Date());

    pricingService
      .getHourlyRate(idToken, currentMonth)
      .then(hourlyRate => {
        if (!isMounted) return;
        if (!hourlyRate) {
          pricingCheckedRef.current = false;
          setStatus('needsPricingSetup');
        } else {
          pricingCheckedRef.current = true;
          // Se a duração já estiver preenchida e válida, calcula; senão, fica ocioso
          if (durationValidation.isValid) {
            calculateEstimate();
          } else {
            setStatus('idle');
          }
        }
      })
      .catch(error => {
        if (!isMounted) return;
        if (isPricingUnconfiguredError(error)) {
          pricingCheckedRef.current = false;
          setStatus('needsPricingSetup');
        } else {
          setStatus('error');
        }
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idToken, checkVersion]);

  // Função interna de cálculo com descarte de requisições antigas
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

      // Descarte de resposta antiga: só a última chamada tem efeito
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
        pricingCheckedRef.current = false;
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

  // Recálculo automático com debounce a cada alteração de duração, cliente ou insumos
  useEffect(() => {
    // Se ainda não checou honorários ou está no estado de needsPricingSetup, não calcula
    if (!pricingCheckedRef.current || status === 'needsPricingSetup') {
      return;
    }

    // Se duração for inválida, volta para idle
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hours,
    minutes,
    selectedClient?.id,
    selectedSupplies,
    debounceMs,
    retryAttempt,
  ]);

  // Handlers para insumos
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

  return {
    hours,
    minutes,
    selectedClient,
    selectedSupplies,
    durationValidation,
    status,
    estimate,
    setHours,
    setMinutes,
    selectClient: setSelectedClient,
    clearClient,
    addSupply,
    updateSupplyQuantity,
    removeSupply,
    retry,
    reload,
  };
}
