export const APPOINTMENTS_PAGE_SIZE = 20;

export function hasMorePages(receivedCount: number, pageSize: number): boolean {
  return receivedCount >= pageSize;
}

export function appendPage<T extends { id: string }>(
  current: readonly T[],
  next: readonly T[],
): T[] {
  const known = new Set(current.map(item => item.id));

  return [...current, ...next.filter(item => !known.has(item.id))];
}
