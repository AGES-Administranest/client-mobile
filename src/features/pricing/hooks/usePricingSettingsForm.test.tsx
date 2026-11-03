import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  AuthProvider,
  TERMS_VERSION,
  type Account,
  type AuthSession,
} from 'features/auth';

import { usePricingSettingsForm } from './usePricingSettingsForm';
import type { PricingSettings } from '../domain/pricing.types';
import { pricingService } from '../services/pricingService';

jest.mock('../services/pricingService', () => ({
  pricingService: { saveSettings: jest.fn() },
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const saveSettingsMock = pricingService.saveSettings as jest.MockedFunction<
  typeof pricingService.saveSettings
>;

const SESSION: AuthSession = {
  idToken: 'id-token',
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: 1,
};

const ACCOUNT: Account = {
  id: 'user-1',
  name: 'Bruna Senha',
  email: 'bruna@example.com',
  termsAcceptedAt: '2026-09-13T12:00:00.000Z',
  termsVersion: TERMS_VERSION,
};

const SAVED: PricingSettings = {
  monthlyIncomeGoal: 8000,
  weeklyHours: 30,
  safetyMarginPct: 20,
};

let current: ReturnType<typeof usePricingSettingsForm>;
let renderer: ReactTestRenderer.ReactTestRenderer;

type ProbeProps = Parameters<typeof usePricingSettingsForm>[0];

function Probe(props: ProbeProps) {
  current = usePricingSettingsForm(props);
  return null;
}

async function mount(
  props: ProbeProps = {},
  session: AuthSession | null = SESSION,
) {
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <AuthProvider
        initialSession={session}
        initialAccount={session ? ACCOUNT : null}
      >
        <Probe {...props} />
      </AuthProvider>,
    );
  });
}

async function fill(values: Partial<Record<keyof PricingSettings, string>>) {
  await act(async () => {
    for (const [field, value] of Object.entries(values)) {
      current.setField(field as keyof PricingSettings, value);
    }
  });
}

async function submit() {
  let result: PricingSettings | null = null;
  await act(async () => {
    result = await current.submit();
  });
  return result;
}

beforeEach(() => {
  saveSettingsMock.mockReset().mockResolvedValue(SAVED);
});

test('prefills the draft from the saved settings', async () => {
  await mount({
    initialSettings: { ...SAVED, weeklyHours: 37.5 },
  });

  expect(current.draft).toEqual({
    monthlyIncomeGoal: '8000',
    weeklyHours: '37,5',
    safetyMarginPct: '20',
  });
  expect(current.savedSettings).toEqual({ ...SAVED, weeklyHours: 37.5 });
});

test('does not call the API while a field is invalid', async () => {
  await mount();
  await fill({ monthlyIncomeGoal: '8000', weeklyHours: '0' });

  expect(await submit()).toBeNull();
  expect(current.errors).toEqual({
    weeklyHours: 'notPositive',
    safetyMarginPct: 'required',
  });
  expect(saveSettingsMock).not.toHaveBeenCalled();
});

test('clears a field error as soon as the field changes', async () => {
  await mount();
  await fill({ monthlyIncomeGoal: '8000', weeklyHours: '0' });
  await submit();

  await fill({ weeklyHours: '30' });

  expect(current.errors).toEqual({ safetyMarginPct: 'required' });
});

test('saves the parsed settings with the id token and exposes them right away', async () => {
  const onSaved = jest.fn();
  await mount({ onSaved });
  await fill({
    monthlyIncomeGoal: '8.000,00',
    weeklyHours: '30',
    safetyMarginPct: '20',
  });

  expect(await submit()).toEqual(SAVED);
  expect(saveSettingsMock).toHaveBeenCalledWith('id-token', SAVED);
  expect(current.savedSettings).toEqual(SAVED);
  expect(onSaved).toHaveBeenCalledWith(SAVED);
  expect(current.isSaving).toBe(false);
  expect(current.failure).toBeNull();
});

test('replaces the saved settings on each new save, without remounting', async () => {
  await mount({ initialSettings: SAVED });
  const updated = { ...SAVED, safetyMarginPct: 35 };
  saveSettingsMock.mockResolvedValueOnce(updated);

  await fill({ safetyMarginPct: '35' });
  await submit();

  expect(current.savedSettings).toEqual(updated);
});

test('keeps the draft and shows a failure when saving fails', async () => {
  saveSettingsMock.mockRejectedValueOnce(new Error('offline'));
  const onSaved = jest.fn();
  await mount({ initialSettings: SAVED, onSaved });
  await fill({ weeklyHours: '40' });

  expect(await submit()).toBeNull();
  expect(current.failure).toBe('pricing.goalForm.failures.save');
  expect(current.draft.weeklyHours).toBe('40');
  expect(current.savedSettings).toEqual(SAVED);
  expect(current.isSaving).toBe(false);
  expect(onSaved).not.toHaveBeenCalled();
});

test('does not save without a session', async () => {
  await mount({ initialSettings: SAVED }, null);
  await fill({ weeklyHours: '40' });

  expect(await submit()).toBeNull();
  expect(current.failure).toBe('pricing.goalForm.failures.save');
  expect(saveSettingsMock).not.toHaveBeenCalled();
});

test('ignores a save that resolves after unmounting', async () => {
  let resolve: (value: PricingSettings) => void = () => {};
  saveSettingsMock.mockReturnValueOnce(
    new Promise(resolvePromise => {
      resolve = resolvePromise;
    }),
  );
  const onSaved = jest.fn();
  await mount({ initialSettings: SAVED, onSaved });
  await fill({ weeklyHours: '40' });

  let pending: Promise<PricingSettings | null> = Promise.resolve(null);
  act(() => {
    pending = current.submit();
  });
  await act(async () => {
    renderer.unmount();
  });
  resolve(SAVED);

  expect(await pending).toBeNull();
  expect(onSaved).not.toHaveBeenCalled();
});

test('does not send the same goals again when nothing changed', async () => {
  const onSaved = jest.fn();
  await mount({ initialSettings: SAVED, onSaved });
  await fill({ monthlyIncomeGoal: '8.000' });

  expect(await submit()).toEqual(SAVED);
  expect(saveSettingsMock).not.toHaveBeenCalled();
  expect(onSaved).not.toHaveBeenCalled();
});
