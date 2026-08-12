import enUS from './en-US.json';
import ptBR from './pt-BR.json';

export const locales = {
  'pt-BR': ptBR,
  'en-US': enUS,
} as const;

export type Locale = keyof typeof locales;

export const defaultLocale: Locale = 'pt-BR';
