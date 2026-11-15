import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ClientOption } from 'features/clients';
import { inventoryStorageKey } from 'features/inventory';

import type {
  ProcedureEstimate,
  ProcedureSelectedSupply,
} from '../domain/pricing.types';

export const SAVED_PROCEDURE_ESTIMATE_STORAGE_KEY =
  '@administranest:pricing:saved_procedure_estimate';

export type SavedProcedureEstimate = {
  hours: string;
  minutes: string;
  client: ClientOption | null;
  supplies: ProcedureSelectedSupply[];
  estimate: ProcedureEstimate | null;
  savedAt: string;
};

let legacyCleaned = false;

export function resetLegacyCleanedForTesting(): void {
  legacyCleaned = false;
}

export const savedProcedureEstimateService = {
  async save(
    userId: string | null | undefined,
    simulation: SavedProcedureEstimate,
  ): Promise<void> {
    if (!userId) return;
    try {
      const key = inventoryStorageKey(
        SAVED_PROCEDURE_ESTIMATE_STORAGE_KEY,
        userId,
      );
      await AsyncStorage.setItem(key, JSON.stringify(simulation));
    } catch {
      // Falha ao gravar localmente não interrompe o app
    }
  },

  async load(
    userId: string | null | undefined,
  ): Promise<SavedProcedureEstimate | null> {
    if (!legacyCleaned) {
      legacyCleaned = true;
      try {
        await AsyncStorage.removeItem(SAVED_PROCEDURE_ESTIMATE_STORAGE_KEY);
      } catch {
        // Ignora falha de limpeza da chave legada
      }
    }

    if (!userId) return null;

    try {
      const key = inventoryStorageKey(
        SAVED_PROCEDURE_ESTIMATE_STORAGE_KEY,
        userId,
      );
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as SavedProcedureEstimate;
    } catch {
      return null;
    }
  },

  async clear(userId: string | null | undefined): Promise<void> {
    if (!userId) return;
    try {
      const key = inventoryStorageKey(
        SAVED_PROCEDURE_ESTIMATE_STORAGE_KEY,
        userId,
      );
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignora falha de remoção
    }
  },
};
