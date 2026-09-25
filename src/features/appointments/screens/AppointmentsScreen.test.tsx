import ReactTestRenderer, { act } from 'react-test-renderer';

import { I18nProvider } from 'shared/i18n';

import { AppointmentsScreen } from './AppointmentsScreen';

// Mock auth hook
jest.mock('features/auth', () => ({
  useAuth: () => ({
    session: { idToken: 'test-token' },
    account: { id: 'test-user', name: 'Dr. Vet' },
    signOut: jest.fn(),
  }),
}));

// Mock appointmentService to avoid network calls in test
jest.mock('../services/appointmentService', () => ({
  fetchAppointments: jest.fn().mockResolvedValue([
    {
      id: 'mock-1',
      patientName: 'Mel',
      species: 'FELINE',
      asaClassification: 'ASA I',
      procedureName: 'Orquiectomia',
      startsAt: '2026-08-17T09:00:00.000Z',
      amount: 620,
      status: 'SCHEDULED',
    },
  ]),
}));

describe('AppointmentsScreen', () => {
  it('renders without crashing and shows calendar components', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <I18nProvider>
          <AppointmentsScreen />
        </I18nProvider>,
      );
    });

    expect(renderer!.root).toBeDefined();

    // Verify day and weekdays are present in text nodes
    const textNodes = renderer!.root.findAll(
      node => typeof node.props.children === 'string',
    );
    const textContents = textNodes.map(node => String(node.props.children));

    expect(textContents.some(t => t.includes('Dom'))).toBe(true);
    expect(textContents.some(t => t.includes('Seg'))).toBe(true);
    expect(textContents.some(t => t.includes('PROCEDIMENTOS'))).toBe(true);
  });
});
