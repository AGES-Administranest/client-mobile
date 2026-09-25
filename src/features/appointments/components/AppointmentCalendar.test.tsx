import ReactTestRenderer, { act } from 'react-test-renderer';

import { AppointmentCalendar } from './AppointmentCalendar';

describe('AppointmentCalendar', () => {
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  const mockOnSelectDate = jest.fn();
  const mockOnPrev = jest.fn();
  const mockOnNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders month label and weekdays', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <AppointmentCalendar
          year={2026}
          monthIndex={8}
          selectedDate="2026-09-17"
          appointmentsByDate={{}}
          monthLabel="Setembro 2026"
          weekdays={weekdays}
          onSelectDate={mockOnSelectDate}
          onPreviousMonth={mockOnPrev}
          onNextMonth={mockOnNext}
        />,
      );
    });

    const json = JSON.stringify(renderer!.toJSON());
    expect(json).toContain('Setembro 2026');
    for (const w of weekdays) {
      expect(json).toContain(w);
    }
  });

  it('navigates to previous and next month', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <AppointmentCalendar
          year={2026}
          monthIndex={8}
          selectedDate="2026-09-17"
          appointmentsByDate={{}}
          monthLabel="Setembro 2026"
          weekdays={weekdays}
          previousMonthLabel="Mês anterior"
          nextMonthLabel="Próximo mês"
          onSelectDate={mockOnSelectDate}
          onPreviousMonth={mockOnPrev}
          onNextMonth={mockOnNext}
        />,
      );
    });

    const prevButton = renderer!.root.findAll(
      node => node.props.accessibilityLabel === 'Mês anterior',
    )[0];
    const nextButton = renderer!.root.findAll(
      node => node.props.accessibilityLabel === 'Próximo mês',
    )[0];

    await act(async () => {
      prevButton.props.onPress();
    });
    expect(mockOnPrev).toHaveBeenCalledTimes(1);

    await act(async () => {
      nextButton.props.onPress();
    });
    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });

  it('renders dot for days with appointments and calls onSelectDate', async () => {
    const appointmentsByDate = {
      '2026-09-17': [
        {
          id: '1',
          patientName: 'Mel',
          status: 'SCHEDULED' as const,
          startsAt: '2026-09-17T09:00:00.000Z',
        },
      ],
    };

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <AppointmentCalendar
          year={2026}
          monthIndex={8}
          selectedDate="2026-09-10"
          appointmentsByDate={appointmentsByDate}
          monthLabel="Setembro 2026"
          weekdays={weekdays}
          onSelectDate={mockOnSelectDate}
          onPreviousMonth={mockOnPrev}
          onNextMonth={mockOnNext}
        />,
      );
    });

    const dot = renderer!.root.findByProps({
      testID: 'appointment-dot-2026-09-17',
    });
    expect(dot).toBeDefined();

    const dayButton = renderer!.root.findByProps({
      testID: 'calendar-day-2026-09-17',
    });
    await act(async () => {
      dayButton.props.onPress();
    });
    expect(mockOnSelectDate).toHaveBeenCalledWith('2026-09-17');
  });
});
