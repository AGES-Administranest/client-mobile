import type { Client } from './client';

export function formatClinicLocation({ city, state }: Client): string {
  return [city, state].filter(Boolean).join(', ');
}
