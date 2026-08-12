import { TranslationDictionary, TranslationKey } from './dictionary';

export function translate(
  dictionary: TranslationDictionary,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const value = key
    .split('.')
    .reduce<TranslationDictionary | string | undefined>(
      (node, segment) =>
        typeof node === 'object' && node !== null ? node[segment] : undefined,
      dictionary,
    );

  // Missing key: surface it instead of silently rendering nothing, so a
  // gap in a locale file is obvious in the UI rather than hidden.
  if (typeof value !== 'string') {
    return key;
  }

  if (!params) {
    return value;
  }

  return Object.entries(params).reduce(
    (result, [paramKey, paramValue]) =>
      result.replaceAll(`{{${paramKey}}}`, String(paramValue)),
    value,
  );
}
