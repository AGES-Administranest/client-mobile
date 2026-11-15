import { apiClient } from 'shared/services/apiClient';

import type { Profile } from '../domain/profile';
import type { ProfileUpdate } from '../domain/validateProfileForm';

// The screen falls back to the saved profile, so a hanging request should not
// keep the person on a spinner.
const FETCH_TIMEOUT_MS = 10_000;

export function fetchProfile(idToken: string): Promise<Profile> {
  return apiClient.get<Profile>('/users/me', {
    token: idToken,
    timeoutMs: FETCH_TIMEOUT_MS,
  });
}

export function updateProfile(
  idToken: string,
  update: ProfileUpdate,
): Promise<Profile> {
  return apiClient.patch<Profile>('/users/me', update, { token: idToken });
}
