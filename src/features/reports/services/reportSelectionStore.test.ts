import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadLastSelection, saveLastSelection } from './reportSelectionStore';
import { REPORT_CATEGORIES } from '../domain/report.types';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('report selection store', () => {
  it('starts with every section selected', async () => {
    await expect(loadLastSelection('user-1')).resolves.toEqual([
      ...REPORT_CATEGORIES,
    ]);
  });

  it('remembers the last selection of each user', async () => {
    await saveLastSelection('user-1', ['financial', 'travel']);

    await expect(loadLastSelection('user-1')).resolves.toEqual([
      'financial',
      'travel',
    ]);
    await expect(loadLastSelection('user-2')).resolves.toEqual([
      ...REPORT_CATEGORIES,
    ]);
  });

  it('falls back to every section when what was stored is unreadable or empty', async () => {
    await AsyncStorage.setItem('@administranest:report-sections:user-1', '{');
    await expect(loadLastSelection('user-1')).resolves.toEqual([
      ...REPORT_CATEGORIES,
    ]);

    await saveLastSelection('user-1', []);
    await expect(loadLastSelection('user-1')).resolves.toEqual([
      ...REPORT_CATEGORIES,
    ]);
  });
});
