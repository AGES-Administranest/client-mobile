import ptBR from './locales/pt-BR.json';

export type TranslationDictionary = {
  [key: string]: string | TranslationDictionary;
};

type FlattenKeys<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : FlattenKeys<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

// pt-BR.json is the source of truth for which keys exist — every locale
// must provide the same keys, and `t()` only accepts paths found here.
export type TranslationKey = FlattenKeys<typeof ptBR>;
