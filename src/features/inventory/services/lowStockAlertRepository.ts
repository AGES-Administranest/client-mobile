import AsyncStorage from '@react-native-async-storage/async-storage';

import { inventoryStorageKey } from './inventoryStorage';

const STORAGE_KEY = '@administranest:inventory:notified-alerts';

/**
 * Guarda quais itens já geraram alerta, para que uma nova baixa em um item
 * que já está crítico não notifique de novo. Precisa sobreviver ao
 * fechamento do app, por isso vai para o AsyncStorage e não para a memória.
 */
export async function loadNotifiedIds(userId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(
      inventoryStorageKey(STORAGE_KEY, userId),
    );

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : [];
  } catch {
    // Storage indisponível ou conteúdo corrompido. Voltar vazio faz o app
    // notificar de novo — barulhento, mas melhor do que quebrar a tela.
    return [];
  }
}

export async function saveNotifiedIds(
  userId: string,
  ids: readonly string[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      inventoryStorageKey(STORAGE_KEY, userId),
      JSON.stringify(ids),
    );
  } catch {
    // Falha ao persistir só custa um alerta repetido na próxima abertura.
  }
}
