import { apiClient } from 'shared/services/apiClient';

// Um insumo salvo é um movimento de saída do estoque (ADR-10): o `id` é o do
// movimento, e é ele que se usa para remover.
export type AppointmentSupplyResult = {
  id: string;
  itemId: string;
  quantity: string;
  unitCost: string;
  item: { name: string; unit: string };
};

export async function fetchAppointmentSupplies(
  idToken: string,
  appointmentId: string,
): Promise<AppointmentSupplyResult[]> {
  const result = await apiClient.get<{
    supplies: AppointmentSupplyResult[];
  }>(`/appointments/${appointmentId}/items`, { token: idToken });
  return result.supplies;
}

// A baixa não é bloqueada por saldo insuficiente: o backend registra e só
// avisa. O aviso já apareceu no seletor antes de confirmar.
export async function registerAppointmentSupplies(
  idToken: string,
  appointmentId: string,
  items: { itemId: string; quantity: number }[],
): Promise<void> {
  await apiClient.post(
    `/appointments/${appointmentId}/items`,
    { items },
    { token: idToken },
  );
}

export async function removeAppointmentSupply(
  idToken: string,
  appointmentId: string,
  movementId: string,
): Promise<void> {
  await apiClient.delete(`/appointments/${appointmentId}/items/${movementId}`, {
    token: idToken,
  });
}
