/**
 * Calcula o custo estimado por km dividindo o preço do combustível pelo consumo médio:
 * costPerKm = fuelPrice ÷ avgConsumptionKmL
 *
 * Retorna null se qualquer um dos valores não for um número positivo finito.
 */
export function calculateCostPerKm(
  fuelPrice: number | string | null | undefined,
  avgConsumptionKmL: number | string | null | undefined,
): number | null {
  if (
    fuelPrice === null ||
    fuelPrice === undefined ||
    avgConsumptionKmL === null ||
    avgConsumptionKmL === undefined
  ) {
    return null;
  }

  const price =
    typeof fuelPrice === 'number'
      ? fuelPrice
      : parseFloat(fuelPrice.trim().replace(',', '.'));

  const consumption =
    typeof avgConsumptionKmL === 'number'
      ? avgConsumptionKmL
      : parseFloat(avgConsumptionKmL.trim().replace(',', '.'));

  if (!Number.isFinite(price) || !Number.isFinite(consumption)) {
    return null;
  }

  if (price <= 0 || consumption <= 0) {
    return null;
  }

  return price / consumption;
}
