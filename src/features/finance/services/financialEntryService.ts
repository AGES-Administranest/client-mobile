import { apiClient } from 'shared/services/apiClient';

import {
  toFinancialEntry,
  type CreateFinancialCategoryPayload,
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

/** Reenviar o mesmo id com os mesmos dados devolve a categoria já criada. */
export async function createFinancialCategory(
  idToken: string,
  payload: CreateFinancialCategoryPayload,
): Promise<FinancialCategory> {
  return apiClient.post<FinancialCategory>('/financial-categories', payload, {
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
