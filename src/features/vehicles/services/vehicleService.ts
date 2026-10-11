import { apiClient } from 'shared/services/apiClient';

import type { Vehicle } from '../domain/vehicle.types';

export function fetchVehicles(token: string): Promise<Vehicle[]> {
  return apiClient.get<Vehicle[]>('/vehicles', { token });
}
