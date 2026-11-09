import { useForgetProfileOnSignOut } from '../hooks/useForgetProfileOnSignOut';

export function ProfileCacheObserver() {
  useForgetProfileOnSignOut();
  return null;
}
