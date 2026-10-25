import { isProductionBuild } from './appEnv';

describe('isProductionBuild', () => {
  const original = process.env.EXPO_PUBLIC_APP_ENV;

  afterEach(() => {
    process.env.EXPO_PUBLIC_APP_ENV = original;
  });

  it.each([
    ['production', true],
    ['development', false],
    [undefined, false],
  ] as const)('is %s → %s', (value, expected) => {
    if (value === undefined) {
      delete process.env.EXPO_PUBLIC_APP_ENV;
    } else {
      process.env.EXPO_PUBLIC_APP_ENV = value;
    }

    expect(isProductionBuild()).toBe(expected);
  });
});
