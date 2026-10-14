import { NetworkError } from 'shared/api';

// Só a falha sem resposta pode esperar a conexão voltar; uma resposta HTTP de
// erro vira ApiError. O apiClient entrega essa falha como NetworkError; o
// TypeError é como o fetch da web a sinaliza.
export function isNetworkError(error: unknown): boolean {
  return error instanceof NetworkError || error instanceof TypeError;
}
