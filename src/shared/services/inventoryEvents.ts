type InventoryChangeListener = () => void;

const listeners = new Set<InventoryChangeListener>();

export function publishInventoryChange(): void {
  listeners.forEach(listener => listener());
}

export function subscribeToInventoryChanges(
  listener: InventoryChangeListener,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
