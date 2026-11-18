import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SignUpSex } from '../domain/validateAuthForm';

// What the person typed at sign-up beyond what Cognito stores. The account
// (and so the user id) only exists after the first sign in, which can come
// after confirming the e-mail or even a later launch, so it waits here keyed by
// e-mail until the profile feature sends it.
export type SignUpProfile = {
  crmv: string | null;
  sex: SignUpSex | null;
};

const keyOf = (email: string) =>
  `@administranest:signup-profile:${email.trim().toLowerCase()}`;

export async function saveSignUpProfile(
  email: string,
  profile: SignUpProfile,
): Promise<void> {
  if (!profile.crmv && !profile.sex) return;
  await AsyncStorage.setItem(keyOf(email), JSON.stringify(profile)).catch(
    () => undefined,
  );
}

export async function loadSignUpProfile(
  email: string,
): Promise<SignUpProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(keyOf(email));
    return raw ? (JSON.parse(raw) as SignUpProfile) : null;
  } catch {
    return null;
  }
}

export async function clearSignUpProfile(email: string): Promise<void> {
  await AsyncStorage.removeItem(keyOf(email)).catch(() => undefined);
}
