export type DeletionFailure = 'wrongPassword' | 'offline' | 'failed';

export function classifyDeletionFailure(code: string): DeletionFailure {
  switch (code) {
    case 'INVALID_CREDENTIALS':
      return 'wrongPassword';
    case 'NETWORK_UNAVAILABLE':
      return 'offline';
    default:
      return 'failed';
  }
}
