import { Account, needsTermsAcceptance, TERMS_VERSION } from './account';

const account = (overrides: Partial<Account> = {}): Account => ({
  id: 'user-1',
  name: 'Bruna',
  email: 'bruna@example.com',
  termsAcceptedAt: '2026-09-13T12:00:00.000Z',
  termsVersion: TERMS_VERSION,
  ...overrides,
});

describe('needsTermsAcceptance', () => {
  it('is false once the current version was accepted', () => {
    expect(needsTermsAcceptance(account())).toBe(false);
  });

  it('is true for an account that never accepted', () => {
    expect(
      needsTermsAcceptance(
        account({ termsAcceptedAt: null, termsVersion: null }),
      ),
    ).toBe(true);
  });

  it('is true when the accepted version is an older one', () => {
    expect(needsTermsAcceptance(account({ termsVersion: '2025-01-01' }))).toBe(
      true,
    );
  });
});
