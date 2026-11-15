export type DeletionFailure =
  | 'wrongPassword'
  | 'offline'
  | 'reauth'
  | 'incomplete'
  | 'failed';

export function classifyDeletionFailure(code: string): DeletionFailure {
  switch (code) {
    case 'INVALID_CREDENTIALS':
      return 'wrongPassword';
    case 'NETWORK_UNAVAILABLE':
      return 'offline';
    case 'REAUTH_REQUIRED':
      return 'reauth';
    case 'ACCOUNT_DELETION_INCOMPLETE':
      return 'incomplete';
    default:
      return 'failed';
  }
}
