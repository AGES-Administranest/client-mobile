import type { EntrySource, FinancialEntry } from './financialEntry';
import { isAutomaticEntry } from './statement';

export type LockedEntryField = 'nature' | 'amount' | 'date';

export type OriginKey =
  | 'appointment'
  | 'serviceInvoice'
  | 'purchaseInvoice'
  | 'trip';

// O backend recusa mudar tipo, valor e data de um automático
// (FINANCIAL_ENTRY_CONTROLLED_BY_ORIGIN): a correção é feita na origem.
const CONTROLLED_BY_ORIGIN: readonly LockedEntryField[] = [
  'nature',
  'amount',
  'date',
];

const ORIGIN_KEYS: Record<Exclude<EntrySource, 'MANUAL'>, OriginKey> = {
  APPOINTMENT: 'appointment',
  SERVICE_INVOICE: 'serviceInvoice',
  PURCHASE_INVOICE: 'purchaseInvoice',
  TRIP: 'trip',
};

export function lockedFieldsOf(
  entry: Pick<FinancialEntry, 'source'>,
): readonly LockedEntryField[] {
  return isAutomaticEntry(entry) ? CONTROLLED_BY_ORIGIN : [];
}

export function originKeyOf(
  entry: Pick<FinancialEntry, 'source'>,
): OriginKey | null {
  return entry.source === 'MANUAL' ? null : ORIGIN_KEYS[entry.source];
}

/**
 * O atendimento é a única origem com tela no app: nota fiscal (US01), pedido
 * de compra (US10) e deslocamento (US13) ainda não têm onde abrir.
 */
export function openableAppointmentId(
  entry: Pick<FinancialEntry, 'origin'>,
): string | null {
  return entry.origin.type === 'APPOINTMENT' ? entry.origin.id : null;
}
