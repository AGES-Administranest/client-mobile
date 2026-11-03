// O back aceita no máximo duas casas decimais; a máscara de entrada já garante,
// mas quem valida não confia nela.
const PT_BR_AMOUNT = /^-?(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$/;

export function isPtBrAmount(text: string): boolean {
  return PT_BR_AMOUNT.test(text);
}
