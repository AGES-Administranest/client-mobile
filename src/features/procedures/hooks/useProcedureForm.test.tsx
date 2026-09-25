import ReactTestRenderer, { act } from 'react-test-renderer';

import { useProcedureForm } from './useProcedureForm';
import { validProcedureForm } from '../domain/validProcedureForm.fixture';
import { createAppointment } from '../services/procedureService';

jest.mock('features/auth', () => ({
  useAuth: () => ({ session: { idToken: 'id-token' } }),
}));
jest.mock('../services/procedureService', () => ({
  createAppointment: jest.fn(),
}));

const createMock = createAppointment as jest.MockedFunction<
  typeof createAppointment
>;

const onSuccess = jest.fn();

let current: ReturnType<typeof useProcedureForm>;

function Probe() {
  current = useProcedureForm(onSuccess);
  return null;
}

async function mountWithFilledForm() {
  await act(async () => {
    ReactTestRenderer.create(<Probe />);
  });
  await act(async () => {
    (
      Object.entries(validProcedureForm) as [
        keyof typeof validProcedureForm,
        string,
      ][]
    ).forEach(([key, value]) => current.setField(key, value));
  });
}

async function submitSuccessfully() {
  await mountWithFilledForm();
  await act(async () => current.submit());
}

beforeEach(() => {
  onSuccess.mockReset();
  createMock.mockReset().mockResolvedValue({ id: 'appointment-1' } as never);
});

test('asks about supplies with the new appointment id instead of closing right away', async () => {
  await submitSuccessfully();

  expect(current.supplyPrompt).toEqual({
    appointmentId: 'appointment-1',
    step: 'confirm',
  });
  expect(onSuccess).not.toHaveBeenCalled();
});

test('moves to the supply selector when the user accepts, keeping the appointment id', async () => {
  await submitSuccessfully();

  await act(async () => current.acceptSupplyPrompt());

  expect(current.supplyPrompt).toEqual({
    appointmentId: 'appointment-1',
    step: 'selector',
  });
  expect(onSuccess).not.toHaveBeenCalled();
});

test('closes the form and clears it when the user declines, leaving the appointment saved', async () => {
  await submitSuccessfully();

  await act(async () => current.finishSupplyPrompt());

  expect(current.supplyPrompt).toBeNull();
  expect(current.values.patientName).toBe('');
  expect(onSuccess).toHaveBeenCalledTimes(1);
  expect(createMock).toHaveBeenCalledTimes(1);
});

test('does not ask about supplies when the appointment fails to save', async () => {
  createMock.mockRejectedValue(new Error('network'));
  await mountWithFilledForm();

  await act(async () => current.submit());

  expect(current.supplyPrompt).toBeNull();
  expect(current.submitFailed).toBe(true);
  expect(onSuccess).not.toHaveBeenCalled();
});
