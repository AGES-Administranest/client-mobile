// The NFSe endpoints are still a stand-in (see serviceInvoiceService), so a
// production build must not offer an upload that confirms nothing.
export function isServiceInvoiceUploadEnabled(): boolean {
  return process.env.EXPO_PUBLIC_APP_ENV !== 'production';
}
