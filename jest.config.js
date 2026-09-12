module.exports = {
  preset: 'jest-expo',
  // CI runners render these component trees ~5x slower than local; the 5000ms
  // default trips flaky timeouts under load.
  testTimeout: 15000,
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|@rn-primitives|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation))',
  ],
  moduleNameMapper: {
    '\\.css$': '<rootDir>/jest/cssMock.js',
    '^lucide-react-native$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
};
