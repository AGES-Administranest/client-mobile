import type { TranslationKey } from 'shared/i18n';
import { ApiError } from 'shared/services/apiClient';

const ERROR_MESSAGE_KEYS: Record<string, TranslationKey> = {
  DUPLICATED_ITEM_PRESENTATION: 'materials.errorDuplicatedItem',
  DUPLICATED_SUPPLIER_NAME: 'materials.errorDuplicatedSupplier',
};

// O código do erro é o contrato estável com o backend (ADR-07). Sem isto, um
// 409 de nome repetido chegava na tela como "não foi possível salvar".
//
// Todo 401 (UNAUTHENTICATED, TOKEN_EXPIRED, TOKEN_INVALID,
// USER_NOT_PROVISIONED) vira a mesma mensagem de sessão: o id token ainda não
// é renovado antes das chamadas (README, Authentication), então o que resolve
// é entrar de novo — e uma falha de sessão não pode parecer lista vazia nem
// "não foi possível salvar".
export function materialsErrorKey(
  error: unknown,
  fallback: TranslationKey,
): TranslationKey {
  if (!(error instanceof ApiError)) {
    return fallback;
  }
  if (error.status === 401) {
    return 'materials.errorSession';
  }
  return (error.code && ERROR_MESSAGE_KEYS[error.code]) || fallback;
}
