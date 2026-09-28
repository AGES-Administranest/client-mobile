import {
  cancelAppointment,
  completeAppointment,
} from 'features/procedures/services/procedureService';
import { ApiError } from 'shared/services/apiClient';

// Contrato real do PATCH /appointments/:id/complete (backend, módulo
// appointments):
//   - o id vai na URL; o corpo só aceita os dados do procedimento, e
//     cliente, horários ou status nele são 400 (forbidNonWhitelisted)
//   - 200 devolve o agendamento concluído com a financialEntry lançada
//   - 409 APPOINTMENT_NOT_SCHEDULED traz o status atual em details
const ID_TOKEN = 'id-token';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ id: 'appointment-1', status: 'COMPLETED' }),
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

function lastRequest() {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return {
    url: new URL(url),
    init,
    headers: init.headers as Record<string, string>,
    body: JSON.parse(init.body as string) as Record<string, unknown>,
  };
}

describe('completeAppointment', () => {
  test('conclui em PATCH /appointments/:id/complete, com o id só na URL', async () => {
    await completeAppointment(ID_TOKEN, 'appointment-1', { amount: 250 });

    const { url, init, body } = lastRequest();
    expect(init.method).toBe('PATCH');
    expect(url.pathname).toBe('/appointments/appointment-1/complete');
    expect(body).toEqual({ amount: 250 });
  });

  test('manda o id token como bearer, como as outras chamadas', async () => {
    await completeAppointment(ID_TOKEN, 'appointment-1', {});

    expect(lastRequest().headers.Authorization).toBe(`Bearer ${ID_TOKEN}`);
  });

  test('devolve o agendamento concluído com a receita lançada', async () => {
    const completed = {
      id: 'appointment-1',
      status: 'COMPLETED',
      amount: '250',
      financialEntry: {
        id: 'entry-1',
        amount: '250',
        source: 'APPOINTMENT',
      },
    };
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => completed,
    });

    await expect(
      completeAppointment(ID_TOKEN, 'appointment-1', { amount: 250 }),
    ).resolves.toEqual(completed);
  });

  test('um 409 chega como ApiError com o status atual em details', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        statusCode: 409,
        code: 'APPOINTMENT_NOT_SCHEDULED',
        message: 'Only a scheduled appointment can be completed',
        details: { status: 'CANCELED' },
      }),
    });

    await expect(
      completeAppointment(ID_TOKEN, 'appointment-1', { amount: 250 }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'APPOINTMENT_NOT_SCHEDULED',
      details: { status: 'CANCELED' },
    } satisfies Partial<ApiError>);
  });
});

describe('cancelAppointment', () => {
  test('cancela em PATCH /appointments/:id/cancel, só com o motivo no corpo', async () => {
    await cancelAppointment(
      ID_TOKEN,
      'appointment-1',
      'Paciente não compareceu',
    );

    const { url, init, headers, body } = lastRequest();
    expect(init.method).toBe('PATCH');
    expect(url.pathname).toBe('/appointments/appointment-1/cancel');
    expect(headers.Authorization).toBe(`Bearer ${ID_TOKEN}`);
    expect(body).toEqual({ reason: 'Paciente não compareceu' });
  });

  test('um 409 chega com o status atual em details', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        statusCode: 409,
        code: 'APPOINTMENT_NOT_SCHEDULED',
        details: { status: 'COMPLETED' },
      }),
    });

    await expect(
      cancelAppointment(ID_TOKEN, 'appointment-1', 'motivo'),
    ).rejects.toMatchObject({
      status: 409,
      details: { status: 'COMPLETED' },
    } satisfies Partial<ApiError>);
  });
});
