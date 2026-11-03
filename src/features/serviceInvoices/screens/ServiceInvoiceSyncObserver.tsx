import { useServiceInvoiceSync } from '../hooks/useServiceInvoiceSync';

/**
 * Sends the notes typed without a connection as soon as it can, whichever tab
 * is open: mounted by the app next to the appointment sync.
 */
export function ServiceInvoiceSyncObserver() {
  useServiceInvoiceSync();
  return null;
}
