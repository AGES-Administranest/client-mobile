import { digitsOnly } from 'shared/utils/inputMasks';

export const BRAZILIAN_STATES = [
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
] as const;

const CRMV_MAX_DIGITS = 6;
// UF, hyphen and up to six digits: "RS-123456".
export const CRMV_MAX_LENGTH = 2 + 1 + CRMV_MAX_DIGITS;

const CRMV_PATTERN = new RegExp(
  `^(${BRAZILIAN_STATES.join('|')})-\\d{1,${CRMV_MAX_DIGITS}}$`,
);

export function isValidCrmv(crmv: string): boolean {
  return CRMV_PATTERN.test(crmv.trim().toUpperCase());
}

export function formatCrmvInput(text: string): string {
  const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const uf = /^[A-Z]{0,2}/.exec(clean)?.[0] ?? '';
  const digits = digitsOnly(clean.slice(uf.length)).slice(0, CRMV_MAX_DIGITS);

  return uf && digits ? `${uf}-${digits}` : uf || digits;
}
