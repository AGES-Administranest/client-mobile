import type { Trip } from './trip.types';
import { buildInitialTripValues } from './tripFormValues';

const TODAY = new Date(2026, 9, 24, 22, 30);

const RIDE: Trip = {
  id: 'trip-1',
  mode: 'RIDE',
  vehicleId: null,
  appointmentId: null,
  clientId: 'client-1',
  occurredOn: '2026-10-20',
  origin: 'Clínica VetNova',
  destination: 'Casa',
  distanceKm: '12.5',
  costPerKm: null,
  cost: '32.9',
};

describe('buildInitialTripValues', () => {
  it('starts a new trip empty, dated today in local time', () => {
    expect(buildInitialTripValues({}, TODAY)).toEqual({
      occurredOn: '2026-10-24',
      origin: '',
      destination: '',
      mode: 'OWN_VEHICLE',
      vehicleId: '',
      distanceKm: '',
      cost: '',
      clientId: null,
      appointmentId: null,
    });
  });

  it('takes the defaults it is given for a new trip', () => {
    const values = buildInitialTripValues(
      {
        defaultOccurredOn: '2026-09-01',
        defaultOrigin: 'Casa',
        defaultDestination: 'Hospital',
        appointmentId: 'appointment-1',
        clientId: 'client-1',
      },
      TODAY,
    );

    expect(values).toMatchObject({
      occurredOn: '2026-09-01',
      origin: 'Casa',
      destination: 'Hospital',
      appointmentId: 'appointment-1',
      clientId: 'client-1',
    });
  });

  it('shows the decimals of a stored trip with a comma', () => {
    expect(buildInitialTripValues({ trip: RIDE }, TODAY)).toMatchObject({
      mode: 'RIDE',
      distanceKm: '12,5',
      cost: '32,9',
      clientId: 'client-1',
    });
  });

  it.each([
    ['OWN_VEHICLE', '', '300'],
    ['RIDE', '32,9', '12,5'],
  ] as const)(
    'fills the fields a %s trip has',
    (mode, expectedCost, expectedDistance) => {
      const trip: Trip =
        mode === 'RIDE'
          ? RIDE
          : {
              ...RIDE,
              mode,
              vehicleId: 'vehicle-1',
              distanceKm: '300',
              costPerKm: '0.4719',
              cost: '141.57',
            };

      expect(buildInitialTripValues({ trip }, TODAY)).toMatchObject({
        cost: expectedCost,
        distanceKm: expectedDistance,
      });
    },
  );
});
