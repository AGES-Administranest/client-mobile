// Stand-in until the API serves the invoice file: keeps the signature the real
// call will have (the id token and the invoice id) and resolves without a file.
export function downloadInvoice(
  _idToken: string,
  _invoiceId: string,
): Promise<void> {
  return Promise.resolve();
}
