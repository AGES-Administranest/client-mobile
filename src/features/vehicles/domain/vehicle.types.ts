export type FuelType = 'GASOLINE' | 'ETHANOL' | 'FLEX' | 'DIESEL';

export type Vehicle = {
  id: string;
  brand: string;
  model: string;
  fuelType: FuelType;
  avgConsumptionKmL: string;
  fuelPrice: string;
  costPerKm: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};
