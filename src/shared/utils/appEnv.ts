// Only the `:production` scripts set EXPO_PUBLIC_APP_ENV=production (see the
// README's "Production build"); every other build, tests included, is not one.
export function isProductionBuild(): boolean {
  return process.env.EXPO_PUBLIC_APP_ENV === 'production';
}
