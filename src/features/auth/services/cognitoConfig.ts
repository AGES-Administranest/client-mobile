export type CognitoConfig = {
  endpoint: string;
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

  const endpoint =
    process.env.EXPO_PUBLIC_COGNITO_ENDPOINT ??
    `https://cognito-idp.${region}.amazonaws.com`;

  return { endpoint, clientId };
}
