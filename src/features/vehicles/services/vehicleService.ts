import { apiClient } from 'shared/services/apiClient';

import type {
  CreateVehicleDto,
  UpdateVehicleDto,
  Vehicle,
} from '../domain/vehicle.types';

export function fetchVehicles(token: string): Promise<Vehicle[]> {
  return apiClient.get<Vehicle[]>('/vehicles', { token });
}

export function createVehicle(
  token: string,
  dto: CreateVehicleDto,
): Promise<Vehicle> {
  return apiClient.post<Vehicle>('/vehicles', dto, { token });
}

export function updateVehicle(
  token: string,
  id: string,
  dto: UpdateVehicleDto,
): Promise<Vehicle> {
  return apiClient.patch<Vehicle>(`/vehicles/${id}`, dto, { token });
}

export function inactivateVehicle(token: string, id: string): Promise<Vehicle> {
  return apiClient.delete<Vehicle>(`/vehicles/${id}`, { token });
}

export const vehicleService = {
  fetchAll: fetchVehicles,
  create: createVehicle,
  update: updateVehicle,
  inactivate: inactivateVehicle,
};
