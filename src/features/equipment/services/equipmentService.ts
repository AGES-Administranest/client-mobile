import { apiClient } from 'shared/services/apiClient';

import type {
  CreateEquipmentDto,
  Equipment,
  EquipmentSummary,
  UpdateEquipmentDto,
} from '../domain/equipment.types';

// O dono do equipamento vem do token: o backend lê o usuário do Authorization,
// então nenhum payload daqui carrega userId.
export async function list(idToken: string): Promise<Equipment[]> {
  return apiClient.get<Equipment[]>('/equipment', { token: idToken });
}

export async function summary(idToken: string): Promise<EquipmentSummary> {
  return apiClient.get<EquipmentSummary>('/equipment/summary', {
    token: idToken,
  });
}

export async function create(
  idToken: string,
  dto: CreateEquipmentDto,
): Promise<Equipment> {
  return apiClient.post<Equipment>('/equipment', dto, { token: idToken });
}

// Equipamento de outra conta responde 404: o backend não confirma que existe.
export async function update(
  idToken: string,
  id: string,
  dto: UpdateEquipmentDto,
): Promise<Equipment> {
  return apiClient.patch<Equipment>(`/equipment/${id}`, dto, {
    token: idToken,
  });
}

export const equipmentService = { list, summary, create, update };
