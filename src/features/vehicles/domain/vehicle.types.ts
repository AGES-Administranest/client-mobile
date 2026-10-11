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

export type CreateVehicleDto = {
  brand: string;
  model: string;
  fuelType: FuelType;
  avgConsumptionKmL: number;
  fuelPrice: number;
};

export type UpdateVehicleDto = Partial<CreateVehicleDto> & {
  active?: boolean;
};

export type VehicleFormMode = 'create' | 'view' | 'edit';
