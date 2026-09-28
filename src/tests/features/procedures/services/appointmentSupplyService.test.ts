import {
  fetchAppointmentSupplies,
  registerAppointmentSupplies,
  removeAppointmentSupply,
} from 'features/procedures/services/appointmentSupplyService';
import {
  fetchAppointments,
  updateAppointmentAmount,
} from 'features/procedures/services/procedureService';

// Contrato real (backend, módulo appointments):
//   - GET  /appointments/:id/items devolve { appointmentId, supplies }
//   - POST /appointments/:id/items recebe { items: [{ itemId, quantity }] }
//   - DELETE /appointments/:id/items/:movementId estorna o insumo
//   - GET  /appointments filtra um status por vez, por startsAt em [from, to]
const ID_TOKEN = 'id-token';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ appointmentId: 'appointment-1', supplies: [] }),
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

function lastRequest() {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return {
    url: new URL(url),
    method: init.method,
    headers: init.headers as Record<string, string>,
    body: init.body ? JSON.parse(init.body as string) : undefined,
  };
}

test('fetchAppointmentSupplies reads the supplies in effect', async () => {
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      appointmentId: 'appointment-1',
      supplies: [{ id: 'movement-1' }],
    }),
  });

  const supplies = await fetchAppointmentSupplies(ID_TOKEN, 'appointment-1');

  const request = lastRequest();
  expect(request.url.pathname).toBe('/appointments/appointment-1/items');
  expect(request.method).toBe('GET');
  expect(request.headers.Authorization).toBe(`Bearer ${ID_TOKEN}`);
  expect(supplies).toEqual([{ id: 'movement-1' }]);
});

test('registerAppointmentSupplies posts the lines, never a userId', async () => {
  await registerAppointmentSupplies(ID_TOKEN, 'appointment-1', [
    { itemId: 'item-1', quantity: 2 },
  ]);

  const request = lastRequest();
  expect(request.url.pathname).toBe('/appointments/appointment-1/items');
  expect(request.method).toBe('POST');
  expect(request.body).toEqual({ items: [{ itemId: 'item-1', quantity: 2 }] });
});

test('removeAppointmentSupply deletes the supply by its movement id', async () => {
  await removeAppointmentSupply(ID_TOKEN, 'appointment-1', 'movement-1');

  const request = lastRequest();
  expect(request.url.pathname).toBe(
    '/appointments/appointment-1/items/movement-1',
  );
  expect(request.method).toBe('DELETE');
});

test('fetchAppointments asks for one status within the day', async () => {
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => [] });

  await fetchAppointments(ID_TOKEN, {
    status: 'SCHEDULED',
    from: '2026-09-28T03:00:00.000Z',
    to: '2026-09-29T02:59:59.999Z',
  });

  const { url } = lastRequest();
  expect(url.pathname).toBe('/appointments');
  expect(Object.fromEntries(url.searchParams)).toEqual({
    status: 'SCHEDULED',
    from: '2026-09-28T03:00:00.000Z',
    to: '2026-09-29T02:59:59.999Z',
    pageSize: '100',
  });
});

test('updateAppointmentAmount patches only the amount', async () => {
  await updateAppointmentAmount(ID_TOKEN, 'appointment-1', 350);

  const request = lastRequest();
  expect(request.url.pathname).toBe('/appointments/appointment-1');
  expect(request.method).toBe('PATCH');
  expect(request.body).toEqual({ amount: 350 });
});
