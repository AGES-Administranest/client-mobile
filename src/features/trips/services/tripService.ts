import { apiClient } from 'shared/services/apiClient';

import type {
  CreateTripDto,
  QueryTripParams,
  Trip,
  TripListResponse,
  UpdateTripDto,
} from '../domain/trip.types';

export function fetchTrips(
  token: string,
  params: QueryTripParams = {},
): Promise<TripListResponse> {
  const query = new URLSearchParams();
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.page != null) query.set('page', String(params.page));
  if (params.pageSize != null) query.set('pageSize', String(params.pageSize));

  const queryStr = query.toString();
  return apiClient.get<TripListResponse>(
    `/trips${queryStr ? `?${queryStr}` : ''}`,
    { token },
  );
}

export function fetchTripById(token: string, id: string): Promise<Trip> {
  return apiClient.get<Trip>(`/trips/${id}`, { token });
}

export function createTrip(token: string, dto: CreateTripDto): Promise<Trip> {
  return apiClient.post<Trip>('/trips', dto, { token });
}

export function updateTrip(
  token: string,
  id: string,
  dto: UpdateTripDto,
): Promise<Trip> {
  return apiClient.patch<Trip>(`/trips/${id}`, dto, { token });
}

export function removeTrip(token: string, id: string): Promise<Trip> {
  return apiClient.delete<Trip>(`/trips/${id}`, { token });
}

export const tripService = {
  list: fetchTrips,
  getById: fetchTripById,
  create: createTrip,
  update: updateTrip,
  remove: removeTrip,
};
