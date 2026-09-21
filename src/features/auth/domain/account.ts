// The user's record in the Administranest API (ADR-02 in the backend): Cognito
// proves who someone is, this is what the app knows about them.
export type Account = {
  id: string;
  name: string;
  email: string;
  termsAcceptedAt: string | null;
  termsVersion: string | null;
};

// The version of the terms of use and privacy policy the app asks people to
// accept. Bump it when the texts change: everyone who accepted an older
// version is asked again.
export const TERMS_VERSION = '2026-09-01';

export function needsTermsAcceptance(account: Account): boolean {
  return !account.termsAcceptedAt || account.termsVersion !== TERMS_VERSION;
}
