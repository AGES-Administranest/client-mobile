// fetch rejeita com TypeError quando não há rede; resposta HTTP de erro vira
// ApiError. Só o primeiro caso pode esperar a conexão voltar.
export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError;
}
