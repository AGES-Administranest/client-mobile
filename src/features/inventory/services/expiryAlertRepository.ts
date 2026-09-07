import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@administranest:inventory:notified-expiry-alerts';

export async function loadExpiryNotifiedIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
}

export async function saveExpiryNotifiedIds(
  ids: readonly string[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // A storage failure must not prevent the inventory screen from rendering.
  }
}
