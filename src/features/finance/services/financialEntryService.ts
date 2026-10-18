import { ApiError, apiClient } from 'shared/services/apiClient';

import {
  toFinancialEntry,
  type CreateFinancialCategoryPayload,
  type CreateFinancialEntryPayload,
  type FinancialCategory,
  type FinancialEntry,
  type FinancialEntryResponse,
} from '../domain/financialEntry';
import { toStatementQuery, type StatementFilters } from '../domain/statement';

const SAVE_TIMEOUT_MS = 20000;

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
    timeoutMs: SAVE_TIMEOUT_MS,
  });
}

/** Uma página do extrato do mês, da data mais recente para a mais antiga. */
export async function fetchFinancialEntries(
  idToken: string,
  filters: StatementFilters,
  page: number,
): Promise<FinancialEntry[]> {
  const response = await apiClient.get<FinancialEntryResponse[]>(
    `/financial-entries?${toStatementQuery(filters, page)}`,
    { token: idToken },
  );
  return response.map(toFinancialEntry);
}

/** Reenviar o mesmo id com os mesmos dados devolve o lançamento já criado. */
export async function createFinancialEntry(
  idToken: string,
  payload: CreateFinancialEntryPayload,
): Promise<FinancialEntry> {
  try {
    const response = await apiClient.post<FinancialEntryResponse>(
      '/financial-entries',
      payload,
      { token: idToken, timeoutMs: SAVE_TIMEOUT_MS },
    );
    return toFinancialEntry(response);
  } catch (error) {
    if (!isIdConflict(error)) {
      throw error;
    }
    // Com outros dados, o mesmo id dá 409: uma tentativa anterior foi salva,
    // a resposta se perdeu e o rascunho mudou depois. O PATCH grava o que está
    // na tela agora, e responde FINANCIAL_ENTRY_NOT_FOUND se o id não for de um
    // lançamento ativo desta conta.
    return saveOverEarlierAttempt(idToken, payload);
  }
}

function isIdConflict(error: unknown): boolean {
  return (
    error instanceof ApiError && error.code === 'FINANCIAL_ENTRY_ID_CONFLICT'
  );
}

async function saveOverEarlierAttempt(
  idToken: string,
  { id, ...draft }: CreateFinancialEntryPayload,
): Promise<FinancialEntry> {
  const response = await apiClient.patch<FinancialEntryResponse>(
    `/financial-entries/${id}`,
    draft,
    { token: idToken, timeoutMs: SAVE_TIMEOUT_MS },
  );
  return toFinancialEntry(response);
}
