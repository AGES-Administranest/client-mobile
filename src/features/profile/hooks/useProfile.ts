import { useCallback, useEffect, useState } from 'react';

import { useAuth } from 'features/auth';
import { ApiError } from 'shared/services/apiClient';
import { isOnline } from 'shared/services/network';

import type { Profile } from '../domain/profile';
import { loadCachedProfile, saveCachedProfile } from '../services/profileCache';
import { fetchProfile } from '../services/profileService';

export type ProfileState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'sessionExpired' }
  | { status: 'ready'; profile: Profile; isStale: boolean };

export type UseProfileResult = {
  state: ProfileState;
  reload: () => void;
  replace: (profile: Profile) => void;
};

export function useProfile(): UseProfileResult {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;
  const [state, setState] = useState<ProfileState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!idToken || !userId) {
      return;
    }

    let isMounted = true;

    async function load(token: string, owner: string) {
      setState({ status: 'loading' });

      const [online, cached] = await Promise.all([
        isOnline(),
        loadCachedProfile(owner),
      ]);
      if (!isMounted) return;

      const fromCache: ProfileState = cached
        ? { status: 'ready', profile: cached, isStale: true }
        : { status: 'error' };

      if (!online) {
        setState(fromCache);
        return;
      }

      // The saved profile stays on screen while the fresh one is on its way.
      if (cached) {
        setState({ status: 'ready', profile: cached, isStale: false });
      }

      try {
        const profile = await fetchProfile(token);
        // Saving after the screen closed could outlive a sign out.
        if (!isMounted) return;
        await saveCachedProfile(owner, profile);
        setState({ status: 'ready', profile, isStale: false });
      } catch (error) {
        if (!isMounted) return;
        // A rejected token is not something to wait out: showing the saved
        // profile would hide that the person has to sign in again. The id
        // token is not refreshed while the app runs, so this follows the
        // other screens' 401 handling.
        setState(
          error instanceof ApiError && error.status === 401
            ? { status: 'sessionExpired' }
            : fromCache,
        );
      }
    }

    load(idToken, userId);

    return () => {
      isMounted = false;
    };
  }, [idToken, userId, attempt]);

  const reload = useCallback(() => setAttempt(current => current + 1), []);
  const replace = useCallback(
    (profile: Profile) =>
      setState({ status: 'ready', profile, isStale: false }),
    [],
  );

  return { state, reload, replace };
}
