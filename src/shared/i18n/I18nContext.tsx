import {
  createContext,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from 'react';

import { TranslationKey } from './dictionary';
import { defaultLocale, Locale, locales } from './locales';
import { translate } from './translate';

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
};

export const I18nContext = createContext<I18nContextValue | undefined>(
  undefined,
);

type I18nProviderProps = {
  children: ReactNode;
  initialLocale?: Locale;
};

export function I18nProvider({
  children,
  initialLocale = defaultLocale,
}: I18nProviderProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  const t = useCallback<I18nContextValue['t']>(
    (key, params) => translate(locales[locale], key, params),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
