import { isProductionBuild } from 'shared/utils/appEnv';

// fetchInvoices does not call the API yet, so in production the list would say
// "no invoice" on an account that has some. Once it does, this becomes `true`.
export function isInvoiceListAvailable(): boolean {
  return !isProductionBuild();
}
