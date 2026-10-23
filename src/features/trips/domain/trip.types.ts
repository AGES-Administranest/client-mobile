export type TripMode = 'OWN_VEHICLE' | 'RIDE';

export type Trip = {
  id: string;
  mode: TripMode;
  vehicleId: string | null;
  appointmentId: string | null;
  clientId: string | null;
  occurredOn: string;
  origin: string;
  destination: string;
  distanceKm: string | number | null;
  costPerKm?: string | number | null;
  cost: string | number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  pendingSync?: boolean;
};

export type CreateTripDto = {
  id?: string;
  mode: TripMode;
  vehicleId?: string | null;
  appointmentId?: string | null;
  clientId?: string | null;
  occurredOn: string;
  origin: string;
  destination: string;
  distanceKm?: number | null;
  cost?: number | null;
};

export type UpdateTripDto = Partial<CreateTripDto>;

export type QueryTripParams = {
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  appointmentId?: string;
  clientId?: string;
};

export type TripListResponse = {
  items: Trip[];
  total: number;
  page: number;
  pageSize: number;
  totalKm: string;
  totalCost: string;
};
