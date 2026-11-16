import { useApplySignUpProfile } from '../hooks/useApplySignUpProfile';
import { useForgetProfileOnSignOut } from '../hooks/useForgetProfileOnSignOut';
import { useProfileSync } from '../hooks/useProfileSync';

export function ProfileCacheObserver() {
  useForgetProfileOnSignOut();
  useProfileSync();
  useApplySignUpProfile();
  return null;
}
