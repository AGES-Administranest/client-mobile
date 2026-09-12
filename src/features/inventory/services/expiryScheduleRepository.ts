import AsyncStorage from '@react-native-async-storage/async-storage';

import { inventoryStorageKey } from './inventoryStorage';

const STORAGE_KEY = '@administranest:inventory:expiry-schedule';

/**
 * Mapa `chave do agendamento -> id da notificação no SO`.
 *
 * Precisa ser persistido porque o id devolvido pelo `scheduleNotificationAt`
 * é a única forma de cancelar depois, e o agendamento vive por meses — muito
 * além da sessão do app que o criou.
 */
export type ExpirySchedule = Record<string, string>;

export async function loadExpirySchedule(
  userId: string,
): Promise<ExpirySchedule> {
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
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  } catch {
    // Storage ilegível: melhor reagendar do zero do que quebrar a tela.
    return {};
  }
}

export async function saveExpirySchedule(
  userId: string,
  schedule: ExpirySchedule,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      inventoryStorageKey(STORAGE_KEY, userId),
      JSON.stringify(schedule),
    );
  } catch {
    // Perder o mapa custa agendamentos duplicados, não a funcionalidade.
  }
}
