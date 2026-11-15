export type ClientAddress = {
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
};

const clean = (v?: string | null) => v?.trim() ?? '';

export function formatClientAddress(client: ClientAddress): string {
  const cityState = [clean(client.city), clean(client.state)]
    .filter(Boolean)
    .join(', ');
  return [clean(client.addressLine), cityState].filter(Boolean).join(', ');
}
