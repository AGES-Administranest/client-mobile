import { classifyDeletionFailure } from './deleteAccount';

it.each([
  ['INVALID_CREDENTIALS', 'wrongPassword'],
  ['NETWORK_UNAVAILABLE', 'offline'],
  ['TOO_MANY_ATTEMPTS', 'failed'],
  ['SESSION_EXPIRED', 'failed'],
  ['UNKNOWN', 'failed'],
])('treats %s as %s', (code, expected) => {
  expect(classifyDeletionFailure(code)).toBe(expected);
});
