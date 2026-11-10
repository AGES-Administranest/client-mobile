import { ApiError } from 'shared/services/apiClient';

import {
  clearPendingProfileEdit,
  loadPendingProfileEdit,
  notifyProfileChanged,
  saveCachedProfile,
  saveProfileRejected,
} from './profileCache';
import { updateProfile } from './profileService';

export type ProfileSyncResult = 'idle' | 'synced' | 'rejected' | 'pending';

function isPermanentRejection(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    ![401, 403, 408, 429].includes(error.status)
  );
}

async function isStillPending(userId: string, sent: unknown) {
  const pending = await loadPendingProfileEdit(userId);
  return JSON.stringify(pending) === JSON.stringify(sent);
}

async function run(
  idToken: string,
  userId: string,
): Promise<ProfileSyncResult> {
  const pending = await loadPendingProfileEdit(userId);
  if (!pending) return 'idle';

  try {
    const saved = await updateProfile(idToken, pending.update);
    if (await isStillPending(userId, pending)) {
      await saveCachedProfile(userId, saved);
      await clearPendingProfileEdit(userId);
    }
    notifyProfileChanged();
    return 'synced';
  } catch (error) {
    if (!isPermanentRejection(error)) return 'pending';
    await saveCachedProfile(userId, pending.confirmed);
    await clearPendingProfileEdit(userId);
    await saveProfileRejected(userId, true);
    notifyProfileChanged();
    return 'rejected';
  }
}

let running: Promise<ProfileSyncResult> | null = null;

export function syncPendingProfile(
  idToken: string,
  userId: string,
): Promise<ProfileSyncResult> {
  if (!running) {
    running = run(idToken, userId).finally(() => {
      running = null;
    });
  }
  return running;
}
