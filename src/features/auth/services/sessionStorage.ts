import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AuthSession } from '../domain/session';

// AsyncStorage is localStorage on the web and the app's own storage on
// iOS/Android, so one key keeps the sign in across reloads on all three.
const STORAGE_KEY = '@administranest:auth:session';

export async function loadSession(): Promise<AuthSession | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    return isAuthSession(parsed) ? parsed : null;
  } catch {
    // Unreadable storage just means signing in again.
    return null;
  }
}

export async function saveSession(session: AuthSession): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // The session still works for this run; only the next launch loses it.
  }
}

export async function clearSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing else to do: the tokens are dropped from memory either way.
  }
}

function isAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const session = value as Record<string, unknown>;
  return (
    typeof session.idToken === 'string' &&
    typeof session.accessToken === 'string' &&
    typeof session.refreshToken === 'string' &&
    typeof session.expiresAt === 'number' &&
    Number.isFinite(session.expiresAt)
  );
}
