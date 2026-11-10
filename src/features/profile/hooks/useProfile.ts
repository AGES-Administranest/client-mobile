import { useCallback, useEffect, useState } from 'react';

import { useAuth } from 'features/auth';
import { ApiError } from 'shared/services/apiClient';
import { isOnline } from 'shared/services/network';

import type { Profile } from '../domain/profile';
import {
  loadCachedProfile,
  loadPendingProfileEdit,
  loadProfileRejected,
  saveCachedProfile,
  saveProfileRejected,
  subscribeProfileChanges,
} from '../services/profileCache';
import { fetchProfile } from '../services/profileService';

export type ProfileState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'sessionExpired' }
  | {
      status: 'ready';
      profile: Profile;
      isStale: boolean;
      hasPendingEdit: boolean;
    };

export type UseProfileResult = {
  state: ProfileState;
  reload: () => void;
  replace: (profile: Profile, hasPendingEdit: boolean) => void;
  wasRejected: boolean;
  dismissRejection: () => void;
};

export function useProfile(): UseProfileResult {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;
  const [state, setState] = useState<ProfileState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [wasRejected, setWasRejected] = useState(false);

  useEffect(() => {
    if (!idToken || !userId) {
      return;
    }

    let isMounted = true;

    async function load(token: string, owner: string) {
      setState({ status: 'loading' });

      const [online, cached, pending, rejected] = await Promise.all([
        isOnline(),
        loadCachedProfile(owner),
        loadPendingProfileEdit(owner),
        loadProfileRejected(owner),
      ]);
      if (!isMounted) return;
      setWasRejected(rejected);

      const hasPendingEdit = pending !== null;
      const fromCache: ProfileState = cached
        ? { status: 'ready', profile: cached, isStale: true, hasPendingEdit }
        : { status: 'error' };

      if (!online) {
        setState(fromCache);
        return;
      }

      // The saved profile stays on screen while the fresh one is on its way.
      if (cached) {
        setState({
          status: 'ready',
          profile: cached,
          isStale: false,
          hasPendingEdit,
        });
      }

      try {
        const fetched = await fetchProfile(token);
        // Saving after the screen closed could outlive a sign out.
        if (!isMounted) return;
        const profile = pending ? { ...fetched, ...pending.update } : fetched;
        await saveCachedProfile(owner, profile);
        setState({ status: 'ready', profile, isStale: false, hasPendingEdit });
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
  useEffect(() => {
    if (!userId) return;

    return subscribeProfileChanges(async () => {
      const [cached, pending, rejected] = await Promise.all([
        loadCachedProfile(userId),
        loadPendingProfileEdit(userId),
        loadProfileRejected(userId),
      ]);
      setWasRejected(rejected);
      if (!cached) return;
      setState(current =>
        current.status === 'ready'
          ? { ...current, profile: cached, hasPendingEdit: pending !== null }
          : current,
      );
    });
  }, [userId]);

  const replace = useCallback(
    (profile: Profile, hasPendingEdit: boolean) =>
      setState({ status: 'ready', profile, isStale: false, hasPendingEdit }),
    [],
  );

  const dismissRejection = useCallback(() => {
    setWasRejected(false);
    if (userId) saveProfileRejected(userId, false);
  }, [userId]);

  return { state, reload, replace, wasRejected, dismissRejection };
}
