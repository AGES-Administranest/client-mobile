/**
 * Registros que geram um lançamento financeiro automático (US03): apagar um
 * deles leva junto o que ele criou, e a pessoa precisa saber disso antes.
 */
export type DeletableOrigin =
  | 'appointment'
  | 'purchaseInvoice'
  | 'serviceInvoice';

export type OriginDeletionEffect =
  | 'financialEntry'
  | 'suppliesReturn'
  | 'stockRemoval'
  | 'documentRemoval'
  | 'historyRemoval';

export type OriginDeletionFacts = {
  /** Só um atendimento concluído tem lançamento; uma nota sempre tem. */
  hasFinancialEntry: boolean;
  /** Materiais lançados no atendimento, que voltam ao estoque. */
  hasSupplies?: boolean;
};

/** Na ordem em que a pessoa sente: o dinheiro, o estoque, o registro. */
export function originDeletionEffects(
  origin: DeletableOrigin,
  { hasFinancialEntry, hasSupplies = false }: OriginDeletionFacts,
): OriginDeletionEffect[] {
  const effects: OriginDeletionEffect[] = [];
  if (hasFinancialEntry) {
    effects.push('financialEntry');
  }
  switch (origin) {
    case 'appointment':
      if (hasSupplies) effects.push('suppliesReturn');
      effects.push('historyRemoval');
      break;
    case 'purchaseInvoice':
      effects.push('stockRemoval', 'documentRemoval');
      break;
    case 'serviceInvoice':
      effects.push('documentRemoval');
      break;
  }
  return effects;
}
