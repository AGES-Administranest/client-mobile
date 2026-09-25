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
        asaClassification: 'ASA I',
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
});
