module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|@rn-primitives|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation))',
  ],
  moduleNameMapper: {
    '\\.css$': '<rootDir>/jest/cssMock.js',
  },
};
