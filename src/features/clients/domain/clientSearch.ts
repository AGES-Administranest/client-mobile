import type { Client } from './client';

// Uma busca por nome que devolve dezenas de linhas não cabe num campo de
// formulário: o usuário refina o termo em vez de rolar a lista.
export const MAX_VISIBLE_RESULTS = 5;

export type ClientSearchStatus =
  | 'idle'
  | 'loading'
  | 'error'
  | 'empty'
  | 'results';

export type ClientSearchSnapshot = {
  paused: boolean;
  isLoading: boolean;
  hasError: boolean;
  resultCount: number;
};

// "Clínica" e "clinica" precisam se encontrar: ninguém digita acento no
// meio de uma busca rápida.
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

// O GET /client não filtra por nome (só por type), então a lista inteira vem
// de uma vez e o filtro é local. Sem termo digitado (campo recém-aberto), o
// dropdown mostra a lista inteira: o filtro só entra para refinar. O backend
// também devolve os inativos: quem foi desativado não deve ser escolhível
// num atendimento novo.
export function filterClients(clients: Client[], term: string): Client[] {
  const needle = normalizeForSearch(term);
  return clients.filter(
    client => client.active && normalizeForSearch(client.name).includes(needle),
  );
}

export function getClientSearchStatus({
  paused,
  isLoading,
  hasError,
  resultCount,
}: ClientSearchSnapshot): ClientSearchStatus {
  if (paused) {
    return 'idle';
  }
  if (isLoading) {
    return 'loading';
  }
  if (hasError) {
    return 'error';
  }
  return resultCount === 0 ? 'empty' : 'results';
}
