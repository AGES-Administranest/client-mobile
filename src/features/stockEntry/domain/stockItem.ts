// Framework-free domain model for an item of a stock entry, as the backend's
// extraction returns it.
export type ScannedItem = {
  id: string;
  /** Item name including its dosage, e.g. "PROPOFOL 10MG/ML F/A 20ML". */
  name: string;
  quantity: number;
  /** Unit-of-measure code from the invoice, e.g. "FA", "AM", "UN". */
  unit: string;
};

const MIN_NAME_LENGTH = 3;

// Flags an item the user should look at before confirming: extraction is
// best-effort, so an empty-ish name or a non-positive quantity means the
// recognition probably went wrong on that line.
export function needsAttention(item: ScannedItem): boolean {
  return item.name.trim().length < MIN_NAME_LENGTH || item.quantity <= 0;
}
