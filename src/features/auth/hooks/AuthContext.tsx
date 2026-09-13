import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { AuthSession } from '../domain/session';
import { SocialProvider } from '../domain/socialSignIn';
import * as authService from '../services/authService';
import * as socialAuthService from '../services/socialAuthService';

type AuthContextValue = {
  session: AuthSession | null;
  signIn: (email: string, password: string) => Promise<void>;
  // Resolves to false when the user backed out of the provider's screen.
  signInWithProvider: (provider: SocialProvider) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
  initialSession?: AuthSession | null;
};

// The session lives only in memory for now: persisting it across launches
// needs a storage dependency, which is a separate card (see README).
export function AuthProvider({
  children,
  initialSession = null,
}: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(initialSession);

  const signIn = useCallback(async (email: string, password: string) => {
    setSession(await authService.signIn(email.trim(), password));
  }, []);

  // A social account ends in the same session as a password one: same tokens,
  // same refresh and sign out (backend ADR-13).
  const signInWithProvider = useCallback(async (provider: SocialProvider) => {
    const signedIn = await socialAuthService.signInWithProvider(provider);
    if (!signedIn) {
      return false;
    }

    setSession(signedIn);
    return true;
  }, []);

  const signOut = useCallback(async () => {
    const current = session;
    setSession(null);

    if (current) {
      // Revoking is best effort: the user is signed out locally either way.
      await authService.signOut(current).catch(() => undefined);
    }
  }, [session]);

  const value = useMemo(
    () => ({ session, signIn, signInWithProvider, signOut }),
    [session, signIn, signInWithProvider, signOut],
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
