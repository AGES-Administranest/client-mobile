import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@administranest:inventory:dismissed-alerts';

/**
 * Alertas que o usuário apagou da lista com o swipe.
 *
 * Guardado por chave de alerta, não por item: apagar o aviso de validade da
 * Dipirona não apaga o de estoque baixo dela.
 */
export async function loadDismissedAlerts(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter((key): key is string => typeof key === 'string')
      : [];
  } catch {
    // Perder a lista só faz alertas dispensados reaparecerem uma vez.
    return [];
  }
}

export async function saveDismissedAlerts(
  keys: readonly string[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // Idem: não impede a lista de renderizar.
  }
}
