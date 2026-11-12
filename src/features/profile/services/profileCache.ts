import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Profile } from '../domain/profile';

// Per user, like the offline clinics: whoever signs in next on the same device
// does not see the previous person's data.
const keyOf = (userId: string) => `@administranest:profile:${userId}`;

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
