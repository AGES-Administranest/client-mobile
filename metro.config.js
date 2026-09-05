const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/**
 * Metro configuration
 * https://docs.expo.dev/guides/customizing-metro
 *
 * @type {import('expo/metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
