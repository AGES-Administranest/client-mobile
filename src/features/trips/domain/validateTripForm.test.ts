import {
  isTripFormValid,
  PLACE_MAX_LENGTH,
  validateTripForm,
  type TripFormValues,
} from './validateTripForm';

const VALID_OWN_VEHICLE_FORM: TripFormValues = {
  occurredOn: '2026-10-18',
  origin: 'Casa',
  destination: 'Clínica Veterinária São Francisco',
  mode: 'OWN_VEHICLE',
  vehicleId: 'veh-123',
  distanceKm: '30',
  cost: '',
};

const VALID_RIDE_FORM: TripFormValues = {
  occurredOn: '2026-10-18',
  origin: 'Clínica',
  destination: 'Casa',
  mode: 'RIDE',
  vehicleId: '',
  distanceKm: '',
  cost: '32.90',
};

describe('validateTripForm', () => {
  it('validates a valid OWN_VEHICLE form', () => {
    const errors = validateTripForm(VALID_OWN_VEHICLE_FORM);
    expect(errors).toEqual({});
    expect(isTripFormValid(errors)).toBe(true);
  });

  it('validates a valid RIDE form', () => {
    const errors = validateTripForm(VALID_RIDE_FORM);
    expect(errors).toEqual({});
    expect(isTripFormValid(errors)).toBe(true);
  });

  it('validates required fields: occurredOn, origin, destination', () => {
    const errors = validateTripForm({
      ...VALID_OWN_VEHICLE_FORM,
      occurredOn: '',
      origin: '   ',
      destination: '',
    });

    expect(errors.occurredOn).toBe('occurredOnRequired');
    expect(errors.origin).toBe('originRequired');
    expect(errors.destination).toBe('destinationRequired');
    expect(isTripFormValid(errors)).toBe(false);
  });

  it('validates invalid date format for occurredOn', () => {
    const errors = validateTripForm({
      ...VALID_OWN_VEHICLE_FORM,
      occurredOn: '18/10/2026',
    });
    expect(errors.occurredOn).toBe('occurredOnInvalid');
  });

  it('validates max length for origin and destination', () => {
    const errors = validateTripForm({
      ...VALID_OWN_VEHICLE_FORM,
      origin: 'A'.repeat(PLACE_MAX_LENGTH + 1),
      destination: 'B'.repeat(PLACE_MAX_LENGTH + 1),
    });
    expect(errors.origin).toBe('originMaxLength');
    expect(errors.destination).toBe('destinationMaxLength');
  });

  it('validates OWN_VEHICLE vehicleId and distanceKm requirements', () => {
    const missingVehicle = validateTripForm({
      ...VALID_OWN_VEHICLE_FORM,
      vehicleId: '',
    });
    expect(missingVehicle.vehicleId).toBe('vehicleRequired');

    const missingDistance = validateTripForm({
      ...VALID_OWN_VEHICLE_FORM,
      distanceKm: '',
    });
    expect(missingDistance.distanceKm).toBe('distanceRequired');

    const zeroDistance = validateTripForm({
      ...VALID_OWN_VEHICLE_FORM,
      distanceKm: '0',
    });
    expect(zeroDistance.distanceKm).toBe('distanceInvalid');

    const negativeDistance = validateTripForm({
      ...VALID_OWN_VEHICLE_FORM,
      distanceKm: '-5',
    });
    expect(negativeDistance.distanceKm).toBe('distanceInvalid');
  });

  it('validates RIDE cost requirements and optional distanceKm', () => {
    const missingCost = validateTripForm({
      ...VALID_RIDE_FORM,
      cost: '',
    });
    expect(missingCost.cost).toBe('costRequired');

    const invalidCost = validateTripForm({
      ...VALID_RIDE_FORM,
      cost: '-10',
    });
    expect(invalidCost.cost).toBe('costInvalid');

    const validWithDistance = validateTripForm({
      ...VALID_RIDE_FORM,
      distanceKm: '15.5',
    });
    expect(isTripFormValid(validWithDistance)).toBe(true);

    const invalidDistance = validateTripForm({
      ...VALID_RIDE_FORM,
      distanceKm: '-1',
    });
    expect(invalidDistance.distanceKm).toBe('distanceInvalid');
  });
});
