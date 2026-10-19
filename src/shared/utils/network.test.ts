import { NetworkError } from 'shared/api';
import { ApiError } from 'shared/services/apiClient';

import { isNetworkError } from './network';

describe('isNetworkError', () => {
  it.each([
    [
      'a request that never reached the API',
      new NetworkError('GET /clients did not reach the API'),
      true,
    ],
    [
      'the web fetch failing to connect',
      new TypeError('Failed to fetch'),
      true,
    ],
    [
      'an answer from the API',
      new ApiError('Service unavailable', 'UNAVAILABLE', 503),
      false,
    ],
    ['a generic error', new Error('boom'), false],
    ['a non-error value', 'offline', false],
    ['nothing at all', undefined, false],
  ])('%s → %p', (_label, error, expected) => {
    expect(isNetworkError(error)).toBe(expected);
  });
});
