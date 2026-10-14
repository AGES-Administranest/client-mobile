// "Clínica" e "clinica" precisam se encontrar: ninguém digita acento no
// meio de uma busca rápida.
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}
