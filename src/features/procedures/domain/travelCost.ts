type TravelCostSource = { cost: string | number };

export function calculateTravelTotalCost(
  trips: readonly TravelCostSource[],
): number {
  return trips.reduce((total, trip) => {
    const cost = Number(trip.cost);

    return Number.isFinite(cost) ? total + cost : total;
  }, 0);
}
