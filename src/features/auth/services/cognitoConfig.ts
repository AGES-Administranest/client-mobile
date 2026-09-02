// Where the Cognito endpoint and client id come from.
//
// Both come from `EXPO_PUBLIC_*` variables, which babel-preset-expo replaces
// with their literal value at build time. Two consequences:
//
// 1. They must be written out in full, as `process.env.EXPO_PUBLIC_THING`.
//    Dynamic access (`process.env[name]`) is NOT substituted and ends up
//    `undefined` in the bundle.
// 2. The value ships inside the JavaScript delivered to the device. Nothing
//    secret can live here — and nothing needs to: the Cognito app client is
//    public and was deliberately created without a secret (see
//    scripts/bootstrap-aws.sh in the backend repo).

export type CognitoConfig = {
  /** Root of the Cognito API. Local: MiniStack. Production: real AWS. */
  endpoint: string;
  /** Public app client of the user pool. */
  clientId: string;
};

const DEFAULT_REGION = 'us-east-1';

export function getCognitoConfig(): CognitoConfig {
  const clientId = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID;
  const region = process.env.EXPO_PUBLIC_AWS_REGION ?? DEFAULT_REGION;

  if (!clientId) {
    throw new Error(
      'EXPO_PUBLIC_COGNITO_CLIENT_ID is not set. Run `npm run dev:bootstrap` ' +
        'in the backend repo and copy the COGNITO_CLIENT_ID it writes to ' +
        '.aws-local.env into your .env (see .env.example).',
    );
  }

  // With no override, this points at real AWS for the region. The override
  // exists for the local emulator, which answers on http://localhost:4566
  // (ADR-12 in the backend repo).
  const endpoint =
    process.env.EXPO_PUBLIC_COGNITO_ENDPOINT ??
    `https://cognito-idp.${region}.amazonaws.com`;

  return { endpoint, clientId };
}
