import { apiClient } from 'shared/services/apiClient';

import {
  toFinancialEntry,
  type CreateFinancialEntryPayload,
  type FinancialCategory,
  type FinancialEntry,
  type FinancialEntryResponse,
} from '../domain/financialEntry';

/** Todas as ativas, dos dois tipos: o formulário troca de tipo sem buscar de novo. */
export async function fetchFinancialCategories(
  idToken: string,
): Promise<FinancialCategory[]> {
  return apiClient.get<FinancialCategory[]>('/financial-categories', {
    token: idToken,
  });
}

/** Reenviar o mesmo id com os mesmos dados devolve o lançamento já criado. */
export async function createFinancialEntry(
  idToken: string,
  payload: CreateFinancialEntryPayload,
): Promise<FinancialEntry> {
  const response = await apiClient.post<FinancialEntryResponse>(
    '/financial-entries',
    payload,
    { token: idToken },
  );
  return toFinancialEntry(response);
}
