import { ApiError, RequestTimeoutError } from 'shared/services/apiClient';

import {
  isDeleteViaOriginError,
  toDeleteFailureKey,
  toEditFailureKey,
} from './entryFailure';

const apiError = (code: string, status = 400) =>
  new ApiError('refused', code, status);

describe('editing a saved entry', () => {
  it.each([
    ['FINANCIAL_ENTRY_NOT_FOUND', 'financialEntries.detail.failures.notFound'],
    [
      'FINANCIAL_ENTRY_CONTROLLED_BY_ORIGIN',
      'financialEntries.detail.failures.controlledByOrigin',
    ],
    [
      'FINANCIAL_CATEGORY_INVALID',
      'financialEntries.form.failures.categoryInvalid',
    ],
    ['ANYTHING_ELSE', 'financialEntries.form.failures.unknown'],
  ])('explains %s', (code, key) => {
    expect(toEditFailureKey(apiError(code))).toBe(key);
  });

  it('tells a lost connection apart', () => {
    expect(
      toEditFailureKey(
        new RequestTimeoutError('DELETE', '/financial-entries/entry-1', 20000),
      ),
    ).toBe('financialEntries.form.failures.network');
  });
});

describe('deleting a saved entry', () => {
  it.each([
    [
      apiError('FINANCIAL_ENTRY_NOT_FOUND', 404),
      'financialEntries.detail.failures.notFound',
    ],
    [
      apiError('UNAUTHENTICATED', 401),
      'financialEntries.form.failures.session',
    ],
    [
      new RequestTimeoutError('DELETE', '/financial-entries/entry-1', 20000),
      'financialEntries.form.failures.network',
    ],
    [apiError('INTERNAL', 500), 'financialEntries.detail.failures.delete'],
  ])('explains %p', (error, key) => {
    expect(toDeleteFailureKey(error)).toBe(key);
  });

  it('recognises the refusal to delete an automatic entry', () => {
    expect(
      isDeleteViaOriginError(
        apiError('FINANCIAL_ENTRY_DELETE_VIA_ORIGIN', 409),
      ),
    ).toBe(true);
    expect(
      isDeleteViaOriginError(apiError('FINANCIAL_ENTRY_NOT_FOUND', 404)),
    ).toBe(false);
  });
});
