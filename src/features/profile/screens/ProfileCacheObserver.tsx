import { useForgetProfileOnSignOut } from '../hooks/useForgetProfileOnSignOut';
import { useProfileSync } from '../hooks/useProfileSync';

export function ProfileCacheObserver() {
  useForgetProfileOnSignOut();
  useProfileSync();
  return null;
}
