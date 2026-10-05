/* eslint-env node */

// Runs before every production build. Expo falls back to `.env` for anything
// `.env.production` doesn't set, so a missing or half-filled file would ship a
// build pointing at the emulator on someone's laptop.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, '.env.production');

const REQUIRED = [
  'EXPO_PUBLIC_APP_ENV',
  'EXPO_PUBLIC_COGNITO_CLIENT_ID',
  'EXPO_PUBLIC_COGNITO_ENDPOINT',
  'EXPO_PUBLIC_AWS_REGION',
  'EXPO_PUBLIC_COGNITO_OAUTH_URL',
  'EXPO_PUBLIC_API_URL',
];
const MAY_BE_EMPTY = ['EXPO_PUBLIC_COGNITO_ENDPOINT'];
const LOCAL_ADDRESS = /localhost|127\.0\.0\.1|10\.0\.2\.2|:4566/;

function fail(message) {
  console.error(`\n✖ ${message}\n  See .env.production.example.\n`);
  process.exit(1);
}

if (!fs.existsSync(FILE)) {
  fail('.env.production not found.');
}

const values = Object.fromEntries(
  fs
    .readFileSync(FILE, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .map(line => {
      const index = line.indexOf('=');
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    }),
);

const missing = REQUIRED.filter(
  key => !(key in values) || (!values[key] && !MAY_BE_EMPTY.includes(key)),
);
if (missing.length > 0) {
  fail(`.env.production is missing: ${missing.join(', ')}.`);
}

if (values.EXPO_PUBLIC_APP_ENV !== 'production') {
  fail('EXPO_PUBLIC_APP_ENV must be "production" in .env.production.');
}

const local = REQUIRED.filter(key => LOCAL_ADDRESS.test(values[key]));
if (local.length > 0) {
  fail(`.env.production points at a local address: ${local.join(', ')}.`);
}

if (fs.existsSync(path.join(ROOT, '.env.local'))) {
  fail('.env.local overrides .env.production. Move it aside to build.');
}
