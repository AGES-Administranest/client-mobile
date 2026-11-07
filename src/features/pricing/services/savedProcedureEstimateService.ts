import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ClientOption } from 'features/clients';

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

export const savedProcedureEstimateService = {
  async save(simulation: SavedProcedureEstimate): Promise<void> {
    await AsyncStorage.setItem(
      SAVED_PROCEDURE_ESTIMATE_STORAGE_KEY,
      JSON.stringify(simulation),
    );
  },

  async load(): Promise<SavedProcedureEstimate | null> {
    const raw = await AsyncStorage.getItem(
      SAVED_PROCEDURE_ESTIMATE_STORAGE_KEY,
    );
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SavedProcedureEstimate;
    } catch {
      return null;
    }
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(SAVED_PROCEDURE_ESTIMATE_STORAGE_KEY);
  },
};

