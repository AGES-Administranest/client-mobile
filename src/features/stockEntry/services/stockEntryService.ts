import { apiClient } from 'shared/services/apiClient';

import type {
  DraftDetail,
  DraftSummary,
  HeaderInput,
  LineInput,
} from '../domain/draft';

export function listDrafts(idToken: string): Promise<DraftSummary[]> {
  return apiClient.get<DraftSummary[]>('/stock-entries', { token: idToken });
}

export function getEntry(idToken: string, id: string): Promise<DraftDetail> {
  return apiClient.get<DraftDetail>(`/stock-entries/${id}`, {
    token: idToken,
  });
}

export function saveHeader(
  idToken: string,
  id: string,
  header: HeaderInput,
): Promise<void> {
  return apiClient.patch<void>(`/stock-entries/${id}`, header, {
    token: idToken,
  });
}

/** Replaces every line: what is not sent is removed. */
export function saveLines(
  idToken: string,
  id: string,
  lines: LineInput[],
): Promise<void> {
  return apiClient.put<void>(
    `/stock-entries/${id}/items`,
    { lines },
    { token: idToken },
  );
}

export function discardEntry(idToken: string, id: string): Promise<void> {
  return apiClient.delete<void>(`/stock-entries/${id}`, { token: idToken });
}
