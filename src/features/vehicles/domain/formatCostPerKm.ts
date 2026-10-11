/**
 * Formata o valor de custo por km (costPerKm vindo da API como texto decimal, ex.: "0.4719")
 * arredondando para centavos somente na exibição, no formato "R$ X,XX/km".
 *
 * Exemplo: "0.4719" -> "R$ 0,47/km"
 * Exemplo: "1.0000" -> "R$ 1,00/km"
 * Exemplo: "8.00"   -> "R$ 8,00/km"
 */
export function formatCostPerKm(
  costPerKm: string | number | null | undefined,
): string {
  if (costPerKm === null || costPerKm === undefined || costPerKm === '') {
    return 'R$ 0,00/km';
  }

  const numericValue =
    typeof costPerKm === 'number' ? costPerKm : parseFloat(costPerKm);

  if (Number.isNaN(numericValue)) {
    return 'R$ 0,00/km';
  }

  const formatted = numericValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `R$ ${formatted}/km`;
}

/**
 * Formata o consumo médio (avgConsumptionKmL, ex.: "12.5") para exibição no formato "12,5 km/L".
 */
export function formatConsumption(
  avgConsumptionKmL: string | number | null | undefined,
): string {
  if (
    avgConsumptionKmL === null ||
    avgConsumptionKmL === undefined ||
    avgConsumptionKmL === ''
  ) {
    return '';
  }

  const numericValue =
    typeof avgConsumptionKmL === 'number'
      ? avgConsumptionKmL
      : parseFloat(avgConsumptionKmL);

  if (Number.isNaN(numericValue)) {
    return '';
  }

  const formatted = numericValue.toLocaleString('pt-BR', {
    maximumFractionDigits: 2,
  });

  return `${formatted} km/L`;
}
