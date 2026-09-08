/**
 * Tipo estrutural mínimo: só os campos de que a regra de alerta precisa.
 *
 * Deliberadamente NÃO importa o tipo do cadastro de itens (US09) — quando
 * aquele tipo existir ele será atribuível a este, porque terá estes campos
 * mais outros. Assim esta camada não conflita no merge nem depende de código
 * que ainda não foi escrito.
 */
export type MonitoredItem = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  minimumStock: number;
};

/**
 * Estritamente abaixo (`<`): um item com saldo exatamente igual ao mínimo
 * ainda está no nível de reposição e não alerta.
 *
 * Atenção: o CA2 da US11 diz "atingir ou ficar abaixo do mínimo", o que seria
 * `<=`. A regra aqui segue a decisão do time — o texto do critério precisa ser
 * atualizado para não divergir do comportamento.
 */
export function isBelowMinimum(item: MonitoredItem): boolean {
  return item.quantity < item.minimumStock;
}

export type AlertsResult = {
  /**
   * Itens que acabaram de *entrar* em estoque mínimo — só estes notificam.
   * Um item que já estava crítico e sofreu outra baixa não notifica de novo.
   */
  newAlerts: MonitoredItem[];
  /**
   * Conjunto a persistir: é a lista de críticos do momento. Um item que volta
   * a ficar acima do mínimo sai da lista e fica rearmado para a próxima vez.
   */
  notifiedIds: string[];
};

export function calculateAlerts(
  items: readonly MonitoredItem[],
  alreadyNotifiedIds: readonly string[],
): AlertsResult {
  const critical = items.filter(isBelowMinimum);
  const alreadyNotified = new Set(alreadyNotifiedIds);

  return {
    newAlerts: critical.filter(item => !alreadyNotified.has(item.id)),
    notifiedIds: critical.map(item => item.id),
  };
}
