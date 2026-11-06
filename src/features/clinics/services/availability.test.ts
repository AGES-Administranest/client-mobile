import { isClientHistoryAvailable } from './availability';

type Env = typeof process.env;

const globals = globalThis as unknown as { __DEV__: boolean };

function setEnv<Name extends keyof Env>(name: Name, value: Env[Name]) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

describe('isClientHistoryAvailable', () => {
  const originalDev = globals.__DEV__;
  const originalAppEnv = process.env.EXPO_PUBLIC_APP_ENV;
  const originalStub = process.env.EXPO_PUBLIC_CLIENT_HISTORY_STUB;

  afterEach(() => {
    globals.__DEV__ = originalDev;
    setEnv('EXPO_PUBLIC_APP_ENV', originalAppEnv);
    setEnv('EXPO_PUBLIC_CLIENT_HISTORY_STUB', originalStub);
  });

  it.each([
    [true, 'development', undefined, true],
    [false, 'development', undefined, false],
    [false, undefined, undefined, false],
    [false, 'development', 'true', true],
    [false, 'development', 'false', false],
    [false, 'production', 'true', false],
    [true, 'production', undefined, false],
  ] as const)(
    'dev build %s, app env %s and stub flag %s → %s',
    (dev, appEnv, stub, expected) => {
      globals.__DEV__ = dev;
      setEnv('EXPO_PUBLIC_APP_ENV', appEnv);
      setEnv('EXPO_PUBLIC_CLIENT_HISTORY_STUB', stub);

      expect(isClientHistoryAvailable()).toBe(expected);
    },
  );
});
