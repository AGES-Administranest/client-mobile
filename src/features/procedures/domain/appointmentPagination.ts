export const APPOINTMENTS_PAGE_SIZE = 20;

// O GET /appointments devolve um array puro, sem total nem "próxima página":
// uma página cheia é o único sinal de que pode haver mais.
export function hasMorePages(receivedCount: number, pageSize: number): boolean {
  return receivedCount >= pageSize;
}

// A paginação é por offset: um atendimento registrado entre duas páginas
// empurra o último item da anterior para o começo da seguinte.
export function appendPage<T extends { id: string }>(
  current: readonly T[],
  next: readonly T[],
): T[] {
  const known = new Set(current.map(item => item.id));

  return [...current, ...next.filter(item => !known.has(item.id))];
}
