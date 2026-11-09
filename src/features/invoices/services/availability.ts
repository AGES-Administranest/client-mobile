import { isProductionBuild } from 'shared/utils/appEnv';

// The list still comes from invoiceStub.ts: in production it would show made-up
// invoices on a real account. Once fetchInvoices calls the API, this becomes
// `true`.
export function isInvoiceListAvailable(): boolean {
  return !isProductionBuild();
}
