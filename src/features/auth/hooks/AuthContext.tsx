import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { AuthSession } from '../domain/session';
import * as authService from '../services/authService';

type AuthContextValue = {
  session: AuthSession | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setSession: (session: AuthSession | null) => void;
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

  const signOut = useCallback(async () => {
    const current = session;
    setSession(null);

    if (current) {
      // Revoking is best effort: the user is signed out locally either way.
      await authService.signOut(current).catch(() => undefined);
    }
  }, [session]);

  const value = useMemo(
    () => ({ session, signIn, signOut, setSession }),
    [session, signIn, signOut, setSession],
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
