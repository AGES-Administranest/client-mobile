import AsyncStorage from '@react-native-async-storage/async-storage';

import { inventoryStorageKey } from './inventoryStorage';
import { AlertTimestamps } from '../domain/inventoryNotifications';

const STORAGE_KEY = '@administranest:inventory:alert-timestamps';

/**
 * Guarda quando cada alerta apareceu, para o card conseguir dizer "há 10 min".
 * Sem isso o tempo seria contado a partir da abertura da tela e todo alerta
 * apareceria como "há 0 min".
 */
export async function loadAlertTimestamps(
  userId: string,
): Promise<AlertTimestamps> {
  try {
    const raw = await AsyncStorage.getItem(
      inventoryStorageKey(STORAGE_KEY, userId),
    );

    if (!raw) {
      return {};
    }

    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === 'number' && Number.isFinite(entry[1]),
      ),
    );
  } catch {
    // Perder os carimbos só reinicia a contagem do "há X min".
    return {};
  }
}

export async function saveAlertTimestamps(
  userId: string,
  timestamps: AlertTimestamps,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      inventoryStorageKey(STORAGE_KEY, userId),
      JSON.stringify(timestamps),
    );
  } catch {
    // Idem: não impede a lista de renderizar.
  }
}
