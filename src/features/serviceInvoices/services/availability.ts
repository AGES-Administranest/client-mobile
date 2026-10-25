import { isProductionBuild } from 'shared/utils/appEnv';

// The upload, reading and confirmation still answer from the stand-in in
// serviceInvoiceService.ts: in production that would "save" notes that never
// reach the server. Once the real endpoints are wired, this becomes `true`.
export function isServiceInvoiceUploadAvailable(): boolean {
  return !isProductionBuild();
}
