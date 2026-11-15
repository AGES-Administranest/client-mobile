import { apiClient } from 'shared/services/apiClient';

import type { Profile } from '../domain/profile';
import type { ProfileUpdate } from '../domain/validateProfileForm';

// The screen falls back to the saved profile, so a hanging request should not
// keep the person on a spinner.
const FETCH_TIMEOUT_MS = 10_000;
// Saves run one at a time, so a hanging one would hold every save behind it.
// On timeout the edit is queued and sent again later.
const UPDATE_TIMEOUT_MS = 15_000;

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
  return apiClient.patch<Profile>('/users/me', update, {
    token: idToken,
    timeoutMs: UPDATE_TIMEOUT_MS,
  });
}
