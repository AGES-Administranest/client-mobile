export type EntryNature = 'INCOME' | 'EXPENSE';

export type EntryScope = 'PROFESSIONAL' | 'PERSONAL';

export type EntrySource =
  | 'MANUAL'
  | 'APPOINTMENT'
  | 'SERVICE_INVOICE'
  | 'PURCHASE_INVOICE'
  | 'TRIP';

export type FinancialCategory = {
  id: string;
  name: string;
  nature: EntryNature;
  defaultScope: EntryScope;
};

export type FinancialEntry = {
  id: string;
  nature: EntryNature;
  description: string;
  category: { id: string; name: string; scope: EntryScope };
  scope: EntryScope;
  amount: number;
  accrualDate: string;
  source: EntrySource;
  origin: { type: EntrySource; id: string | null };
};

/** O backend serializa o `amount` (Decimal) como texto, sem zeros no fim: "250". */
export type FinancialEntryResponse = Omit<FinancialEntry, 'amount'> & {
  amount: string | number;
};

export type CreateFinancialEntryPayload = {
  id: string;
  nature: EntryNature;
  description: string;
  amount: number;
  accrualDate: string;
  categoryId: string;
  scope: EntryScope;
};

export function toFinancialEntry(
  response: FinancialEntryResponse,
): FinancialEntry {
  return { ...response, amount: Number(response.amount) };
}
