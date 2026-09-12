export function inventoryStorageKey(base: string, userId: string): string {
  return `${base}:${encodeURIComponent(userId)}`;
}
