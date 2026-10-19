import ReactTestRenderer, { act } from 'react-test-renderer';

import { AppointmentDayList } from './AppointmentDayList';
import type { Appointment } from '../domain/appointment';

describe('AppointmentDayList', () => {
  const mockOnAdd = jest.fn();
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when there are no appointments', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <AppointmentDayList
          date="2026-09-17"
          formattedDate="Quinta-feira, 17 de setembro"
          appointments={[]}
          emptyTitle="Nenhum agendamento para este dia"
          onAddAppointment={mockOnAdd}
        />,
      );
    });

    const json = JSON.stringify(renderer!.toJSON());
    expect(json).toContain('Nenhum agendamento para este dia');
  });

  it('renders appointments cards when appointments exist', async () => {
    const appointments: Appointment[] = [
      {
        id: 'app-1',
        patientName: 'Mel',
        species: 'FELINE',
        asa: 'I',
        procedureName: 'Orquiectomia',
        startsAt: '2026-09-17T09:00:00.000Z',
        endsAt: '2026-09-17T10:30:00.000Z',
        location: 'Clínica VetNova',
        amount: 620,
        status: 'SCHEDULED',
      },
    ];

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <AppointmentDayList
          date="2026-09-17"
          formattedDate="Quinta-feira, 17 de setembro"
          appointments={appointments}
          onAddAppointment={mockOnAdd}
          onSelectAppointment={mockOnSelect}
        />,
      );
    });

    const json = JSON.stringify(renderer!.toJSON());
    expect(json).toContain('Mel');
    expect(json).toContain('Orquiectomia');
    expect(json).toContain('Clínica VetNova');
    expect(json).toContain('ASA I');
    expect(json).toContain('R$');
  });

  const scheduled: Appointment = {
    id: 'app-2',
    patientName: 'Thomas',
    procedureName: 'Limpeza',
    startsAt: new Date(2026, 8, 30, 15, 0).toISOString(),
    endsAt: new Date(2026, 8, 30, 16, 0).toISOString(),
    status: 'SCHEDULED',
  };

  it('mostra o horário do agendamento no card, sem a data, na lista do dia', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <AppointmentDayList
          date="2026-09-30"
          formattedDate=""
          appointments={[scheduled]}
          locale="pt-BR"
        />,
      );
    });

    const json = JSON.stringify(renderer!.toJSON());
    expect(json).toContain('15:00 – 16:00');
    expect(json).not.toContain('30 set');
  });

  it('mostra a data junto do horário quando a lista cobre o mês', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <AppointmentDayList
          date="2026-09-30"
          formattedDate=""
          appointments={[scheduled]}
          locale="pt-BR"
          showDate
        />,
      );
    });

    const json = JSON.stringify(renderer!.toJSON());
    expect(json).toContain('30 set · 15:00 – 16:00');
  });
});
