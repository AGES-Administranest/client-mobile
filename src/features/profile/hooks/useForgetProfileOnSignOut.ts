import { useEffect, useRef } from 'react';

import { useAuth } from 'features/auth';

import { clearCachedProfile } from '../services/profileCache';

// Watches the account instead of a sign-out button: the Home menu and the
// terms screen both sign out, and so will account deletion (US25). It must
// stay mounted across sign out to see the id go away.
export function useForgetProfileOnSignOut(): void {
  const { account } = useAuth();
  const userId = account?.id ?? null;
  const previousUserId = useRef(userId);

  useEffect(() => {
    const leaving = previousUserId.current;
    previousUserId.current = userId;
    if (leaving && leaving !== userId) {
      clearCachedProfile(leaving);
    }
  }, [userId]);
}
