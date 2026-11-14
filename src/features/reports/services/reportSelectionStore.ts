import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  knownCategories,
  REPORT_CATEGORIES,
  type ReportCategory,
} from '../domain/report.types';

// Per user, like the cached profile: whoever signs in next on the same device
// starts from their own last choice.
const keyOf = (userId: string) => `@administranest:report-sections:${userId}`;

/**
 * The sections of the last report generated (US29). Every section when there
 * is none yet, or when what was stored cannot be read.
 */
export async function loadLastSelection(
  userId: string,
): Promise<ReportCategory[]> {
  try {
    const raw = await AsyncStorage.getItem(keyOf(userId));
    const stored = raw ? knownCategories(JSON.parse(raw) as unknown[]) : [];
    return stored.length > 0 ? stored : [...REPORT_CATEGORIES];
  } catch {
    return [...REPORT_CATEGORIES];
  }
}

// Best effort: failing to remember must not fail the report that was made.
export async function saveLastSelection(
  userId: string,
  categories: readonly ReportCategory[],
): Promise<void> {
  await AsyncStorage.setItem(keyOf(userId), JSON.stringify(categories)).catch(
    () => undefined,
  );
}
