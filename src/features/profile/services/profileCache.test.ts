import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearCachedProfile,
  loadCachedProfile,
  saveCachedProfile,
} from './profileCache';
import type { Profile } from '../domain/profile';

const PROFILE: Profile = {
  id: 'user-1',
  name: 'Ana Souza',
  email: 'ana@example.com',
  crmv: 'RS-12345',
  birthDate: '1990-04-15T00:00:00.000Z',
  sex: 'FEMALE',
  city: 'Porto Alegre',
  state: 'RS',
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

it('gives back what was saved', async () => {
  await saveCachedProfile('user-1', PROFILE);

  await expect(loadCachedProfile('user-1')).resolves.toEqual(PROFILE);
});

it('has nothing for a user who never saved', async () => {
  await expect(loadCachedProfile('user-1')).resolves.toBeNull();
});

it("does not hand one user's profile to another on the same device", async () => {
  await saveCachedProfile('user-1', PROFILE);

  await expect(loadCachedProfile('user-2')).resolves.toBeNull();
});

it('clears only the given user', async () => {
  await saveCachedProfile('user-1', PROFILE);
  await saveCachedProfile('user-2', { ...PROFILE, id: 'user-2' });

  await clearCachedProfile('user-1');

  await expect(loadCachedProfile('user-1')).resolves.toBeNull();
  await expect(loadCachedProfile('user-2')).resolves.toMatchObject({
    id: 'user-2',
  });
});

it('treats a corrupted entry as nothing saved', async () => {
  await AsyncStorage.setItem('@administranest:profile:user-1', '{not json');

  await expect(loadCachedProfile('user-1')).resolves.toBeNull();
});
