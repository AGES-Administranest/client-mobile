/* eslint-env node */

// Runs a command against the production stack: `node scripts/with-production-env.js
// expo export --platform web`. Every other script stays on the local `.env`.
//
// The values live in `.env.prod`, not `.env.production`: Expo loads
// `.env.production` by itself on any production-mode build, which would turn
// the plain `web:build` into a production build without anyone asking.
// Variables already in the environment win over every `.env` file, so setting
// them here is enough to keep `.env` out of the bundle.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', '.env.prod');

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
  console.error(`\n✖ ${message}\n  See .env.prod.example.\n`);
  process.exit(1);
}

const command = process.argv.slice(2);
if (command.length === 0) {
  fail('Usage: node scripts/with-production-env.js <command...>');
}

if (!fs.existsSync(FILE)) {
  fail('.env.prod not found.');
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
  fail(`.env.prod is missing: ${missing.join(', ')}.`);
}

if (values.EXPO_PUBLIC_APP_ENV !== 'production') {
  fail('EXPO_PUBLIC_APP_ENV must be "production" in .env.prod.');
}

const local = REQUIRED.filter(key => LOCAL_ADDRESS.test(values[key]));
if (local.length > 0) {
  fail(`.env.prod points at a local address: ${local.join(', ')}.`);
}

const result = spawnSync(command.join(' '), {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, ...values },
});
process.exit(result.status ?? 1);
