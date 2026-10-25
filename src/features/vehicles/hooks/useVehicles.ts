import { useCallback, useEffect, useState } from 'react';

import { useAuth } from 'features/auth';

import type {
  CreateVehicleDto,
  UpdateVehicleDto,
  Vehicle,
} from '../domain/vehicle.types';
import {
  createVehicle as createVehicleApi,
  fetchVehicles,
  inactivateVehicle as inactivateVehicleApi,
  updateVehicle as updateVehicleApi,
} from '../services/vehicleService';

export type UseVehiclesOptions = {
  token?: string;
  autoFetch?: boolean;
};

export type UseVehiclesResult = {
  vehicles: Vehicle[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<Vehicle[]>;
  createVehicle: (dto: CreateVehicleDto) => Promise<Vehicle>;
  updateVehicle: (id: string, dto: UpdateVehicleDto) => Promise<Vehicle>;
  inactivateVehicle: (id: string) => Promise<boolean>;
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
};

export function useVehicles(
  options: UseVehiclesOptions = {},
): UseVehiclesResult {
  const { token: optionsToken, autoFetch = true } = options;

  let authSessionToken: string | undefined;
  try {
    const auth = useAuth();
    authSessionToken = auth.session?.idToken;
  } catch {
    authSessionToken = undefined;
  }

  const token = optionsToken ?? authSessionToken ?? '';

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async (): Promise<Vehicle[]> => {
    if (!token) return [];
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchVehicles(token);
      const activeList = data.filter(v => v.active !== false);
      setVehicles(activeList);
      return activeList;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (autoFetch && token) {
      refetch().catch(() => {
        // Erro exposto no estado error, mantém a lista atual
      });
    }
  }, [autoFetch, token, refetch]);

  const createVehicle = useCallback(
    async (dto: CreateVehicleDto): Promise<Vehicle> => {
      setError(null);
      const created = await createVehicleApi(token, dto);
      setVehicles(prev => [created, ...prev]);
      return created;
    },
    [token],
  );

  const updateVehicle = useCallback(
    async (id: string, dto: UpdateVehicleDto): Promise<Vehicle> => {
      setError(null);
      const updated = await updateVehicleApi(token, id, dto);
      if (updated.active === false) {
        setVehicles(prev => prev.filter(v => v.id !== id));
      } else {
        setVehicles(prev => prev.map(v => (v.id === id ? updated : v)));
      }
      return updated;
    },
    [token],
  );

  const inactivateVehicle = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      await inactivateVehicleApi(token, id);
      setVehicles(prev => prev.filter(v => v.id !== id));
      return true;
    },
    [token],
  );

  return {
    vehicles,
    isLoading,
    error,
    refetch,
    createVehicle,
    updateVehicle,
    inactivateVehicle,
    setVehicles,
  };
}
