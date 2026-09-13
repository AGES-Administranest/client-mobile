import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import {
  Account,
  needsTermsAcceptance,
  TERMS_VERSION,
} from '../domain/account';
import { AuthSession } from '../domain/session';
import { SocialProvider } from '../domain/socialSignIn';
import * as accountApi from '../services/accountApi';
import * as authService from '../services/authService';
import * as socialAuthService from '../services/socialAuthService';

type SignInOptions = {
  // Set by the sign-up flow, where the person already ticked the terms box.
  acceptTerms?: boolean;
};

type AuthContextValue = {
  session: AuthSession | null;
  // The user's record in the Administranest API. Present whenever `session` is.
  account: Account | null;
  signIn: (
    email: string,
    password: string,
    options?: SignInOptions,
  ) => Promise<void>;
  // Resolves to false when the user backed out of the provider's screen.
  signInWithProvider: (provider: SocialProvider) => Promise<boolean>;
  acceptTerms: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
  initialSession?: AuthSession | null;
  initialAccount?: Account | null;
};

// The session lives only in memory for now: persisting it across launches
// needs a storage dependency, which is a separate card (see README).
export function AuthProvider({
  children,
  initialSession = null,
  initialAccount = null,
}: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(initialSession);
  const [account, setAccount] = useState<Account | null>(initialAccount);

  // Cognito authenticated the person; the app is only usable once the API has
  // their record too (backend POST /auth/session), since every other route
  // answers USER_NOT_PROVISIONED without it. Both are set together, so no
  // screen ever sees a session without an account.
  const openAccount = useCallback(
    async (tokens: AuthSession, { acceptTerms = false }: SignInOptions) => {
      let opened: Account;
      try {
        opened = await accountApi.createSession(tokens.idToken);
      } catch (error) {
        // Without the record the tokens are useless: give them back.
        await authService.signOut(tokens).catch(() => undefined);
        throw error;
      }

      if (acceptTerms && needsTermsAcceptance(opened)) {
        // Best effort: if recording consent fails, the terms screen asks
        // again instead of throwing away a sign in that worked.
        opened = await accountApi
          .acceptTerms(tokens.idToken, TERMS_VERSION)
          .catch(() => opened);
      }

      setSession(tokens);
      setAccount(opened);
    },
    [],
  );

  const signIn = useCallback(
    async (email: string, password: string, options: SignInOptions = {}) => {
      const tokens = await authService.signIn(email.trim(), password);
      await openAccount(tokens, options);
    },
    [openAccount],
  );

  // A social account ends in the same session as a password one: same tokens,
  // same refresh and sign out (backend ADR-13).
  const signInWithProvider = useCallback(
    async (provider: SocialProvider) => {
      const tokens = await socialAuthService.signInWithProvider(provider);
      if (!tokens) {
        return false;
      }

      await openAccount(tokens, {});
      return true;
    },
    [openAccount],
  );

  const acceptTerms = useCallback(async () => {
    if (!session) {
      return;
    }

    setAccount(await accountApi.acceptTerms(session.idToken, TERMS_VERSION));
  }, [session]);

  const signOut = useCallback(async () => {
    const current = session;
    setSession(null);
    setAccount(null);

    if (current) {
      // Revoking is best effort: the user is signed out locally either way.
      await authService.signOut(current).catch(() => undefined);
    }
  }, [session]);

  const value = useMemo(
    () => ({
      session,
      account,
      signIn,
      signInWithProvider,
      acceptTerms,
      signOut,
    }),
    [session, account, signIn, signInWithProvider, acceptTerms, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
