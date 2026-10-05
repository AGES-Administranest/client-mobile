export type CognitoConfig = {
  endpoint: string;
  clientId: string;
};

const DEFAULT_REGION = 'us-east-1';

export function getCognitoConfig(): CognitoConfig {
  const clientId = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID;
  const region = process.env.EXPO_PUBLIC_AWS_REGION || DEFAULT_REGION;

  if (!clientId) {
    throw new Error(
      'EXPO_PUBLIC_COGNITO_CLIENT_ID is not set. Run `npm run dev:bootstrap` ' +
        'in the backend repo and copy the COGNITO_CLIENT_ID it writes to ' +
        '.aws-local.env into your .env (see .env.example).',
    );
  }

  // `||`, not `??`: .env.prod clears the emulator address with an empty value,
  // which means "the real AWS address", not an endpoint of "".
  const endpoint =
    process.env.EXPO_PUBLIC_COGNITO_ENDPOINT ||
    `https://cognito-idp.${region}.amazonaws.com`;

  return { endpoint, clientId };
}

export type CognitoOAuthConfig = {
  // Where /oauth2/authorize and /oauth2/token live: the user pool domain in
  // production, the emulator itself locally.
  oauthUrl: string;
  clientId: string;
};

export function getCognitoOAuthConfig(): CognitoOAuthConfig {
  const { clientId } = getCognitoConfig();
  const oauthUrl = process.env.EXPO_PUBLIC_COGNITO_OAUTH_URL;

  if (!oauthUrl) {
    throw new Error(
      'EXPO_PUBLIC_COGNITO_OAUTH_URL is not set. Run `npm run dev:bootstrap` ' +
        'in the backend repo and copy the COGNITO_OAUTH_URL it writes to ' +
        '.aws-local.env into your .env (see .env.example).',
    );
  }

  return { oauthUrl: oauthUrl.replace(/\/+$/, ''), clientId };
}

// Locally the team signs in with e-mail and password; "Continue with Google"
// is only offered by a production build (EXPO_PUBLIC_APP_ENV=production).
export function isSocialSignInEnabled(): boolean {
  return process.env.EXPO_PUBLIC_APP_ENV === 'production';
}
