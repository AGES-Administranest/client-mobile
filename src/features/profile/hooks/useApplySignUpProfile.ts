import { useEffect } from 'react';

import { clearSignUpProfile, loadSignUpProfile, useAuth } from 'features/auth';
import { ApiError } from 'shared/services/apiClient';

import {
  notifyProfileChanged,
  saveCachedProfile,
} from '../services/profileCache';
import { updateProfile } from '../services/profileService';
import { withProfileLock } from '../services/profileSyncService';

function isPermanentRejection(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    ![401, 403, 408, 429].includes(error.status)
  );
}

// Sends the CRMV and the sex typed at sign-up once the account exists. Kept
// when the request fails for a reason that may pass (offline, expired token),
// so the next launch tries again; dropped when the backend refuses it.
export function useApplySignUpProfile(): void {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;
  const email = account?.email ?? null;

  useEffect(() => {
    if (!idToken || !userId || !email) return;

    let cancelled = false;

    withProfileLock(async () => {
      const pending = await loadSignUpProfile(email);
      if (!pending || cancelled) return;

      try {
        const saved = await updateProfile(idToken, {
          ...(pending.crmv ? { crmv: pending.crmv } : {}),
          ...(pending.sex ? { sex: pending.sex } : {}),
        });
        await saveCachedProfile(userId, saved);
        await clearSignUpProfile(email);
        notifyProfileChanged();
      } catch (error) {
        if (isPermanentRejection(error)) await clearSignUpProfile(email);
      }
    }).catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [idToken, userId, email]);
}
