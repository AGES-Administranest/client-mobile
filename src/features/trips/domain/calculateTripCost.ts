import type { TripMode } from './trip.types';

export type CalculateTripCostParams = {
  mode: TripMode;
  distanceKm?: number | string | null;
  costPerKm?: number | string | null;
  cost?: number | string | null;
};

export function calculateTripCost(params: CalculateTripCostParams): number {
  if (params.mode === 'RIDE') {
    const rawCost =
      typeof params.cost === 'string'
        ? parseFloat(params.cost.replace(',', '.'))
        : params.cost;
    return Number.isFinite(rawCost) && rawCost != null
      ? Math.max(0, rawCost)
      : 0;
  }

  const rawDistance =
    typeof params.distanceKm === 'string'
      ? parseFloat(params.distanceKm.replace(',', '.'))
      : params.distanceKm;
  const distance =
    Number.isFinite(rawDistance) && rawDistance != null
      ? Math.max(0, rawDistance)
      : 0;

  const rawCostPerKm =
    typeof params.costPerKm === 'string'
      ? parseFloat(params.costPerKm.replace(',', '.'))
      : params.costPerKm;
  const costPerKm =
    Number.isFinite(rawCostPerKm) && rawCostPerKm != null
      ? Math.max(0, rawCostPerKm)
      : 0;

  return Math.round(distance * costPerKm * 100) / 100;
}
