import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { act } from 'react-test-renderer';

import type { PendingAppointmentOperation } from 'features/appointments/domain/offlineAppointments';
import { AppointmentSyncObserver } from 'features/appointments/screens/AppointmentSyncObserver';
import { syncPendingAppointments } from 'features/appointments/services/appointmentSyncService';
import {
  loadRejections,
  notifyOfflineAppointmentsChanged,
  saveOutbox,
  saveRejections,
} from 'features/appointments/services/offlineAppointmentStore';
import {
  loadClientRejections,
  saveClientRejections,
  syncPendingClinics,
  type ClientSyncRejection,
} from 'features/clients';
import { syncPendingSuppliers } from 'features/suppliers';

import { renderScreen } from '../../support/screen';

const mockAuth = {
  session: { idToken: 'token' } as { idToken: string } | null,
  account: { id: 'user-1' },
};

jest.mock('features/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('features/appointments/services/appointmentSyncService', () => ({
  syncPendingAppointments: jest.fn(),
}));
jest.mock('features/clients', () => ({
  ...jest.requireActual('features/clients/services/offlineClientStore'),
  syncPendingClinics: jest.fn(),
}));
jest.mock('features/suppliers', () => ({
  ...jest.requireActual('features/suppliers/services/offlineSupplierStore'),
  syncPendingSuppliers: jest.fn(),
}));

const syncClinics = jest.mocked(syncPendingClinics);
const syncSuppliers = jest.mocked(syncPendingSuppliers);
const syncAppointments = jest.mocked(syncPendingAppointments);

const CREATE: PendingAppointmentOperation = {
  kind: 'create',
  clientGeneratedId: 'cg-1',
  payload: {
    startsAt: new Date(2026, 9, 20, 13, 30).toISOString(),
    status: 'SCHEDULED',
    patientName: 'Maya',
  },
};
const clinic = (
  operation: ClientSyncRejection['operation'],
  code: string | null,
): ClientSyncRejection => ({ operation, code });

let onAppState: (state: string) => void;

const open = () => renderScreen(<AppointmentSyncObserver />);

beforeEach(async () => {
  syncClinics.mockReset();
  syncSuppliers.mockReset();
  syncAppointments.mockReset();
  mockAuth.session = { idToken: 'token' };
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, listener) => {
      onAppState = listener as (state: string) => void;
      return { remove: jest.fn() } as never;
    });
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('sending what is pending', () => {
  it('sends the clinics before the appointments that point at them', async () => {
    const order: string[] = [];
    syncClinics.mockImplementation(async () => {
      order.push('clinics');
      return undefined as never;
    });
    syncSuppliers.mockImplementation(async () => {
      order.push('suppliers');
      return undefined as never;
    });
    syncAppointments.mockImplementation(async () => {
      order.push('appointments');
      return undefined as never;
    });

    await open();

    expect(order).toEqual(['clinics', 'suppliers', 'appointments']);
    expect(syncAppointments).toHaveBeenCalledWith('token', 'user-1');
  });

  it('waits for a session', async () => {
    mockAuth.session = null;

    await open();

    expect(syncClinics).not.toHaveBeenCalled();
  });

  it('tries again when the app comes back or the queue changes', async () => {
    await open();

    await act(async () => onAppState('background'));
    expect(syncClinics).toHaveBeenCalledTimes(1);
    await act(async () => onAppState('active'));
    expect(syncClinics).toHaveBeenCalledTimes(2);
    await act(async () => notifyOfflineAppointmentsChanged());
    expect(syncClinics).toHaveBeenCalledTimes(3);
  });

  it('retries every 30 seconds only while something is pending', async () => {
    jest.useFakeTimers();
    await open();
    const halfMinute = async () => {
      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });
      await act(async () => {});
    };

    await halfMinute();
    expect(syncClinics).toHaveBeenCalledTimes(1);

    await saveOutbox('user-1', [CREATE]);
    await halfMinute();
    expect(syncClinics).toHaveBeenCalledTimes(2);
  });

  it('stops listening once it is gone', async () => {
    const screen = await open();

    screen.unmount();
    notifyOfflineAppointmentsChanged();

    expect(syncClinics).toHaveBeenCalledTimes(1);
  });
});

describe('telling about what was refused', () => {
  it('stays quiet when nothing was', async () => {
    const screen = await open();

    expect(screen.has('não sincronizad')).toBe(false);
  });

  it.each([
    ['APPOINTMENT_TIME_CONFLICT', 'o horário conflita com outro agendamento.'],
    ['APPOINTMENT_NOT_FOUND', 'o agendamento não existe mais.'],
    ['CLIENT_NOT_SYNCED', 'a clínica dele não pôde ser cadastrada.'],
    [null, 'os dados foram recusados pelo servidor.'],
  ])('explains a refused appointment (%s)', async (code, reason) => {
    await saveRejections('user-1', [{ operation: CREATE, code }]);

    const screen = await open();

    expect(screen.has('Agendamento não sincronizado')).toBe(true);
    expect(screen.has(`de Maya em 20/10 às 13:30: ${reason}`)).toBe(true);
  });

  it('names a patient that has no name', async () => {
    await saveRejections('user-1', [
      {
        operation: {
          ...CREATE,
          payload: { ...CREATE.payload, patientName: undefined },
        },
        code: null,
      },
    ]);

    expect((await open()).has('de paciente sem nome em')).toBe(true);
  });

  it('explains a refused edit that does not move the appointment', async () => {
    await saveRejections('user-1', [
      {
        operation: {
          kind: 'update',
          appointmentId: 'appointment-1',
          changes: { notes: 'x' },
        },
        code: 'APPOINTMENT_NOT_FOUND',
      },
    ]);

    expect(
      (await open()).has('uma edição de agendamento: o agendamento não existe'),
    ).toBe(true);
  });

  it.each([
    ['DUPLICATED_CLIENT_TAX_ID', 'já existe outra clínica com esse CNPJ.'],
    ['DUPLICATED_CLIENT_NAME', 'já existe outra clínica com esse nome.'],
    ['CLIENT_NOT_FOUND', 'a clínica não existe mais.'],
    [null, 'os dados foram recusados pelo servidor.'],
  ])('explains a refused clinic (%s)', async (code, reason) => {
    await saveClientRejections('user-1', [
      clinic(
        {
          kind: 'create',
          localId: 'local:1',
          payload: { name: 'VetSul' },
        } as never,
        code,
      ),
    ]);

    const screen = await open();

    expect(screen.has('Clínica não sincronizada')).toBe(true);
    expect(screen.has(`a clínica VetSul: ${reason}`)).toBe(true);
  });

  it('shows the clinics first, then the appointments, until none is left', async () => {
    await saveClientRejections('user-1', [
      clinic(
        { kind: 'update', clientId: 'client-1', changes: {} } as never,
        'CLIENT_NOT_FOUND',
      ),
    ]);
    await saveRejections('user-1', [{ operation: CREATE, code: null }]);
    const screen = await open();
    expect(screen.has('uma edição de clínica')).toBe(true);

    await screen.press('Entendi');
    expect(screen.has('de Maya em')).toBe(true);
    await expect(loadClientRejections('user-1')).resolves.toEqual([]);

    await screen.press('Entendi');
    expect(screen.has('de Maya em')).toBe(false);
    await expect(loadRejections('user-1')).resolves.toEqual([]);
  });

  it('still tells when the sync itself fails', async () => {
    syncClinics.mockRejectedValue(new Error('unexpected'));
    await saveRejections('user-1', [{ operation: CREATE, code: null }]);

    expect((await open()).has('de Maya em')).toBe(true);
  });
});
