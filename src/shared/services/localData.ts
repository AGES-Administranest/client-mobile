import AsyncStorage from '@react-native-async-storage/async-storage';

export const LOCAL_DATA_KEY_PREFIX = '@administranest:';

export type LocalDataCleaner = () => void | Promise<void>;

const cleaners = new Set<LocalDataCleaner>();

export function registerLocalDataCleaner(
  cleaner: LocalDataCleaner,
): () => void {
  cleaners.add(cleaner);
  return () => {
    cleaners.delete(cleaner);
  };
}

async function ownedKeys(): Promise<string[]> {
  try {
    const keys = (await AsyncStorage.getAllKeys()) ?? [];
    return keys.filter(key => key.startsWith(LOCAL_DATA_KEY_PREFIX));
  } catch {
    return [];
  }
}

export async function clearLocalUserData(): Promise<void> {
  const owned = await ownedKeys();

  await Promise.allSettled([
    owned.length > 0 ? AsyncStorage.multiRemove(owned) : undefined,
    ...[...cleaners].map(async cleaner => cleaner()),
  ]);
}
