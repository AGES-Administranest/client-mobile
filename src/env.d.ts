// Types for the environment variables this app reads.
//
// The repo has no `@types/node`, and does not need it: the only thing we touch
// on `process` is `env`, and only these keys. Declaring them by hand instead of
// pulling the whole Node typings has a side benefit — a typo in a variable name
// is a compile error rather than a silent `undefined` at runtime.
//
// Expo substitutes `process.env.EXPO_PUBLIC_*` with literal values at build
// time, which is why every read must be written out in full. See
// src/features/auth/services/cognitoConfig.ts.

declare const process: {
  env: {
    EXPO_PUBLIC_COGNITO_CLIENT_ID?: string;
    EXPO_PUBLIC_COGNITO_ENDPOINT?: string;
    EXPO_PUBLIC_AWS_REGION?: string;
  };
};
