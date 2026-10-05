const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/**
 * Metro configuration
 * https://docs.expo.dev/guides/customizing-metro
 *
 * @type {import('expo/metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

// EXPO_PUBLIC_* values are inlined while transforming, and Metro's cache key
// doesn't include them: without this, `npm run web:build` right after a
// `:production` build reuses the cached files and ships the production values.
const publicEnv = Object.keys(process.env)
  .filter(key => key.startsWith('EXPO_PUBLIC_'))
  .sort()
  .map(key => `${key}=${process.env[key]}`)
  .join('\n');
config.cacheVersion = `${config.cacheVersion ?? ''}|${publicEnv}`;

module.exports = withNativeWind(config, { input: './global.css' });
