import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Profile } from '../domain/profile';
import type { ProfileUpdate } from '../domain/validateProfileForm';

// Per user, like the offline clinics: whoever signs in next on the same device
// does not see the previous person's data.
const keyOf = (userId: string) => `@administranest:profile:${userId}`;
const pendingKey = (userId: string) => `${keyOf(userId)}:pending`;
const rejectedKey = (userId: string) => `${keyOf(userId)}:rejected`;

export type PendingProfileEdit = {
  update: ProfileUpdate;
  confirmed: Profile;
};

const listeners = new Set<() => void>();

export function subscribeProfileChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyProfileChanged(): void {
  listeners.forEach(listener => listener());
}

export async function loadCachedProfile(
  userId: string,
): Promise<Profile | null> {
  try {
    const raw = await AsyncStorage.getItem(keyOf(userId));
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

// Best effort: failing to save must not cost the person the profile they just
// received.
export async function saveCachedProfile(
  userId: string,
  profile: Profile,
): Promise<void> {
  await AsyncStorage.setItem(keyOf(userId), JSON.stringify(profile)).catch(
    () => undefined,
  );
}

export async function clearCachedProfile(userId: string): Promise<void> {
  await AsyncStorage.removeItem(keyOf(userId)).catch(() => undefined);
}

export async function loadPendingProfileEdit(
  userId: string,
): Promise<PendingProfileEdit | null> {
  try {
    const raw = await AsyncStorage.getItem(pendingKey(userId));
    return raw ? (JSON.parse(raw) as PendingProfileEdit) : null;
  } catch {
    return null;
  }
}

export async function queueProfileEdit(
  userId: string,
  update: ProfileUpdate,
  current: Profile,
): Promise<Profile> {
  const pending = await loadPendingProfileEdit(userId);
  const edited = { ...current, ...update };
  await AsyncStorage.setItem(
    pendingKey(userId),
    JSON.stringify({ update, confirmed: pending?.confirmed ?? current }),
  );
  await saveCachedProfile(userId, edited);
  notifyProfileChanged();
  return edited;
}

export async function clearPendingProfileEdit(userId: string): Promise<void> {
  await AsyncStorage.removeItem(pendingKey(userId));
}

export async function loadProfileRejected(userId: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(rejectedKey(userId)).catch(() => null);
  return raw !== null;
}

export async function saveProfileRejected(
  userId: string,
  rejected: boolean,
): Promise<void> {
  await (rejected
    ? AsyncStorage.setItem(rejectedKey(userId), 'true')
    : AsyncStorage.removeItem(rejectedKey(userId))
  ).catch(() => undefined);
}
