import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import type {
  Equipment,
  EquipmentFormTarget,
} from 'features/equipment/domain/equipment.types';
import { useEquipmentForm } from 'features/equipment/hooks/useEquipmentForm';
import { equipmentService } from 'features/equipment/services/equipmentService';
import { ApiError } from 'shared/services/apiClient';

jest.mock('features/equipment/services/equipmentService', () => ({
  equipmentService: { create: jest.fn(), update: jest.fn() },
}));
// A sessão entra pronta pelo AuthProvider; nada de auth pode ir à rede.
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const createMock = equipmentService.create as jest.Mock;
const updateMock = equipmentService.update as jest.Mock;

const SESSION = {
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

const EQUIPMENT: Equipment = {
  id: 'eq-1',
  supplierId: null,
  name: 'Vaporizador Matrx VIP 3000',
  purchaseValue: 8500,
  salvageValue: 0,
  acquisitionDate: '2022-03-01T00:00:00.000Z',
  usefulLifeMonths: 120,
  notes: 'Calibração anual',
  active: true,
  monthlyDepreciation: 70.83,
  currentValue: 4604.17,
  usefulLifeUsedPct: 45.8,
  endOfLife: false,
};

const TODAY = '2026-10-11';
const CREATE: EquipmentFormTarget = { mode: 'create' };

type HookState = ReturnType<typeof useEquipmentForm>;

// Os testes de edição abrem em `view` e tocam em "Editar", como a pessoa faz;
// `startInView` deixa o hook onde o card o abre.
async function renderForm({
  target = CREATE,
  session = SESSION as typeof SESSION | null,
  onSaved = jest.fn(),
  startInView = false,
} = {}) {
  const latest = { current: null as unknown as HookState };
  const props = { target, visible: true };
  function Probe() {
    latest.current = useEquipmentForm({
      target: props.target,
      visible: props.visible,
      onSaved,
      today: () => TODAY,
    });
    return null;
  }
  const tree = () => (
    <AuthProvider
      initialSession={session ?? undefined}
      initialAccount={ACCOUNT}
    >
      <Probe />
    </AuthProvider>
  );
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(tree());
  });
  if (target.mode === 'view' && !startInView) {
    await act(async () => {
      latest.current.startEdit();
    });
  }
  async function reopen(next: { target: EquipmentFormTarget }) {
    props.visible = false;
    await act(async () => renderer.update(tree()));
    props.target = next.target;
    props.visible = true;
    await act(async () => renderer.update(tree()));
  }
  return { state: latest, onSaved, reopen };
}

async function fill(
  state: { current: HookState },
  values: Partial<Record<keyof HookState['values'], string>>,
) {
  for (const [field, text] of Object.entries(values)) {
    await act(async () => {
      state.current.onChangeText(field as keyof HookState['values'], text);
    });
  }
}

const VALID = {
  name: '  Bomba de infusão  ',
  purchaseValue: '600000',
  acquisitionDate: '01032022',
  usefulLifeYears: '5',
  notes: '  garantia  ',
};

beforeEach(() => {
  createMock.mockReset();
  updateMock.mockReset();
  createMock.mockResolvedValue(EQUIPMENT);
  updateMock.mockResolvedValue(EQUIPMENT);
});

describe('create', () => {
  it('starts empty and masks what is typed', async () => {
    const { state } = await renderForm();
    expect(state.current.values).toEqual({
      name: '',
      purchaseValue: '',
      acquisitionDate: '',
      usefulLifeYears: '',
      notes: '',
    });

    await fill(state, VALID);

    expect(state.current.values).toMatchObject({
      purchaseValue: '6.000,00',
      acquisitionDate: '01/03/2022',
      usefulLifeYears: '5',
    });
  });

  it('sends the trimmed values, years as months, with the session token', async () => {
    const { state, onSaved } = await renderForm();
    await fill(state, VALID);

    await act(async () => {
      await state.current.submit();
    });

    expect(createMock).toHaveBeenCalledWith('id-token', {
      name: 'Bomba de infusão',
      purchaseValue: 6000,
      acquisitionDate: '2022-03-01',
      usefulLifeMonths: 60,
      notes: 'garantia',
    });
    expect(updateMock).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('sends 120 months without a useful life and omits empty notes', async () => {
    const { state } = await renderForm();
    await fill(state, { ...VALID, usefulLifeYears: '', notes: '' });

    await act(async () => {
      await state.current.submit();
    });

    const dto = createMock.mock.calls[0][1];
    expect(dto.usefulLifeMonths).toBe(120);
    expect(dto).not.toHaveProperty('notes');
    expect(dto).not.toHaveProperty('salvageValue');
  });

  it('does not submit an invalid form and shows every error', async () => {
    const { state, onSaved } = await renderForm();
    expect(state.current.errors).toEqual({});

    await act(async () => {
      await state.current.submit();
    });

    expect(createMock).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(state.current.errors).toEqual({
      name: 'required',
      purchaseValue: 'required',
      acquisitionDate: 'required',
    });
  });

  it('shows a field error only after it was left', async () => {
    const { state } = await renderForm();
    await fill(state, { acquisitionDate: '12102026' });
    expect(state.current.errors.acquisitionDate).toBeUndefined();

    await act(async () => {
      state.current.onBlur('acquisitionDate');
    });

    expect(state.current.errors.acquisitionDate).toBe('futureDate');
  });

  it('accepts today as the acquisition date', async () => {
    const { state } = await renderForm();
    await fill(state, { ...VALID, acquisitionDate: '11102026' });

    await act(async () => {
      await state.current.submit();
    });

    expect(createMock).toHaveBeenCalledTimes(1);
  });
});

describe('preview', () => {
  it('is unavailable until the value is valid, then follows the typing', async () => {
    const { state } = await renderForm();
    expect(state.current.preview).toBeNull();

    await fill(state, { purchaseValue: '850000' });
    expect(state.current.preview).toEqual({
      monthlyDepreciation: 70.83,
      lifeEnded: false,
    });

    await fill(state, { usefulLifeYears: '5' });
    expect(state.current.preview?.monthlyDepreciation).toBe(141.67);
  });

  it('shows zero and flags the ended life for an old acquisition', async () => {
    const { state } = await renderForm();
    await fill(state, {
      purchaseValue: '600000',
      acquisitionDate: '20012015',
      usefulLifeYears: '10',
    });

    expect(state.current.preview).toEqual({
      monthlyDepreciation: 0,
      lifeEnded: true,
    });
  });

  it('still previews while other fields are invalid', async () => {
    const { state } = await renderForm();
    await fill(state, {
      purchaseValue: '120000',
      usefulLifeYears: '1',
      name: '',
    });

    expect(state.current.preview?.monthlyDepreciation).toBe(100);
  });
});

describe('edit', () => {
  const EDIT: EquipmentFormTarget = { mode: 'view', equipment: EQUIPMENT };

  it('fills the fields from the equipment, months as years', async () => {
    const { state } = await renderForm({ target: EDIT });

    expect(state.current.mode).toBe('edit');
    expect(state.current.values).toEqual({
      name: 'Vaporizador Matrx VIP 3000',
      purchaseValue: '8.500,00',
      acquisitionDate: '01/03/2022',
      usefulLifeYears: '10',
      notes: 'Calibração anual',
    });
    expect(state.current.legacyLifeMonths).toBeNull();
  });

  it('updates by id with the edited values and calls onSaved', async () => {
    const { state, onSaved } = await renderForm({ target: EDIT });
    await fill(state, { purchaseValue: '900000', usefulLifeYears: '8' });

    await act(async () => {
      await state.current.submit();
    });

    expect(updateMock).toHaveBeenCalledWith('id-token', 'eq-1', {
      name: 'Vaporizador Matrx VIP 3000',
      purchaseValue: 9000,
      acquisitionDate: '2022-03-01',
      usefulLifeMonths: 96,
      notes: 'Calibração anual',
    });
    expect(createMock).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('sends 120 months explicitly when the useful life is cleared', async () => {
    const { state } = await renderForm({ target: EDIT });
    await fill(state, { usefulLifeYears: '' });

    await act(async () => {
      await state.current.submit();
    });

    expect(updateMock.mock.calls[0][2].usefulLifeMonths).toBe(120);
  });

  it('sends null notes when they are cleared', async () => {
    const { state } = await renderForm({ target: EDIT });
    await fill(state, { notes: '' });

    await act(async () => {
      await state.current.submit();
    });

    expect(updateMock.mock.calls[0][2].notes).toBeNull();
  });

  describe('useful life that is not a whole number of years', () => {
    const LEGACY: EquipmentFormTarget = {
      mode: 'view',
      equipment: {
        ...EQUIPMENT,
        purchaseValue: 1800,
        acquisitionDate: '2026-06-01T00:00:00.000Z',
        usefulLifeMonths: 18,
      },
    };

    it('leaves the field empty and keeps the months for the notice', async () => {
      const { state } = await renderForm({ target: LEGACY });

      expect(state.current.values.usefulLifeYears).toBe('');
      expect(state.current.legacyLifeMonths).toBe(18);
    });

    it('untouched: omits the useful life from the PATCH and previews with the current months', async () => {
      const { state } = await renderForm({ target: LEGACY });
      expect(state.current.preview?.monthlyDepreciation).toBe(100);

      await act(async () => {
        await state.current.submit();
      });

      expect(updateMock.mock.calls[0][2]).not.toHaveProperty(
        'usefulLifeMonths',
      );
    });

    it('changed: sends the typed years as months', async () => {
      const { state } = await renderForm({ target: LEGACY });
      await fill(state, { usefulLifeYears: '2' });
      expect(state.current.legacyLifeMonths).toBeNull();

      await act(async () => {
        await state.current.submit();
      });

      expect(updateMock.mock.calls[0][2].usefulLifeMonths).toBe(24);
    });

    it('typed and then erased is the same as untouched', async () => {
      const { state } = await renderForm({ target: LEGACY });
      await fill(state, { usefulLifeYears: '2' });
      await fill(state, { usefulLifeYears: '' });

      await act(async () => {
        await state.current.submit();
      });

      expect(updateMock.mock.calls[0][2]).not.toHaveProperty(
        'usefulLifeMonths',
      );
    });
  });

  it('uses the equipment salvage value in the preview', async () => {
    const { state } = await renderForm({
      target: {
        mode: 'view',
        equipment: { ...EQUIPMENT, salvageValue: 1000 },
      },
    });

    expect(state.current.preview?.monthlyDepreciation).toBe(62.5);
  });
});

describe('view', () => {
  const VIEW: EquipmentFormTarget = { mode: 'view', equipment: EQUIPMENT };

  it('opens read-only with the equipment values and the monthly depreciation of the card', async () => {
    const { state } = await renderForm({ target: VIEW, startInView: true });

    expect(state.current.mode).toBe('view');
    expect(state.current.values).toMatchObject({
      name: 'Vaporizador Matrx VIP 3000',
      purchaseValue: '8.500,00',
      acquisitionDate: '01/03/2022',
      notes: 'Calibração anual',
    });
    expect(state.current.preview).toEqual({
      monthlyDepreciation: 70.83,
      lifeEnded: false,
    });
    expect(state.current.legacyLifeMonths).toBeNull();
  });

  it('shows the useful life in years, or in months when it is not a whole number of years', async () => {
    const years = await renderForm({ target: VIEW, startInView: true });
    expect(years.state.current.viewUsefulLife).toEqual({
      unit: 'years',
      value: 10,
    });

    const months = await renderForm({
      target: {
        mode: 'view',
        equipment: { ...EQUIPMENT, usefulLifeMonths: 18 },
      },
      startInView: true,
    });
    expect(months.state.current.viewUsefulLife).toEqual({
      unit: 'months',
      value: 18,
    });
    expect(months.state.current.legacyLifeMonths).toBeNull();
  });

  it('shows the ended life of the equipment', async () => {
    const { state } = await renderForm({
      target: {
        mode: 'view',
        equipment: { ...EQUIPMENT, monthlyDepreciation: 0, endOfLife: true },
      },
      startInView: true,
    });

    expect(state.current.preview).toEqual({
      monthlyDepreciation: 0,
      lifeEnded: true,
    });
  });

  it('ignores typing and submit while only viewing', async () => {
    const { state, onSaved } = await renderForm({
      target: VIEW,
      startInView: true,
    });

    await fill(state, { name: 'Outro nome' });
    await act(async () => {
      await state.current.submit();
    });

    expect(state.current.values.name).toBe('Vaporizador Matrx VIP 3000');
    expect(updateMock).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('startEdit keeps the values, releases the fields and brings back the useful life notice', async () => {
    const legacy: EquipmentFormTarget = {
      mode: 'view',
      equipment: { ...EQUIPMENT, usefulLifeMonths: 18 },
    };
    const { state } = await renderForm({ target: legacy, startInView: true });
    expect(state.current.legacyLifeMonths).toBeNull();

    await act(async () => {
      state.current.startEdit();
    });

    expect(state.current.mode).toBe('edit');
    expect(state.current.legacyLifeMonths).toBe(18);
    expect(state.current.viewUsefulLife).toBeNull();
    expect(state.current.values.name).toBe('Vaporizador Matrx VIP 3000');
    await fill(state, { name: 'Novo nome' });
    expect(state.current.values.name).toBe('Novo nome');
  });

  it('closing the sheet drops the edits, and reopening starts in view again', async () => {
    const { state, reopen } = await renderForm({ target: VIEW });
    await fill(state, { name: 'Novo nome', notes: '' });
    expect(state.current.mode).toBe('edit');

    await reopen({ target: { mode: 'view', equipment: EQUIPMENT } });

    expect(state.current.mode).toBe('view');
    expect(state.current.values.name).toBe('Vaporizador Matrx VIP 3000');
    expect(state.current.values.notes).toBe('Calibração anual');
  });

  it('saves after the edit and calls onSaved once', async () => {
    const { state, onSaved } = await renderForm({ target: VIEW });
    await fill(state, { name: 'Novo nome' });

    await act(async () => {
      await state.current.submit();
    });

    expect(updateMock).toHaveBeenCalledWith(
      'id-token',
      'eq-1',
      expect.objectContaining({ name: 'Novo nome' }),
    );
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('a failed save keeps the edit mode, the data and the message', async () => {
    updateMock.mockRejectedValue(new Error('network'));
    const { state } = await renderForm({ target: VIEW });
    await fill(state, { name: 'Novo nome' });

    await act(async () => {
      await state.current.submit();
    });

    expect(state.current.mode).toBe('edit');
    expect(state.current.values.name).toBe('Novo nome');
    expect(state.current.submitError).toBe('generic');
  });
});

describe('failures', () => {
  it('keeps the data and the sheet open when saving fails', async () => {
    createMock.mockRejectedValue(new Error('network'));
    const { state, onSaved } = await renderForm();
    await fill(state, VALID);

    await act(async () => {
      await state.current.submit();
    });

    expect(onSaved).not.toHaveBeenCalled();
    expect(state.current.submitError).toBe('generic');
    expect(state.current.isSubmitting).toBe(false);
    expect(state.current.values.name).toBe(VALID.name);
  });

  it('reports a rejected session on a 401', async () => {
    createMock.mockRejectedValue(
      new ApiError('Token expired', 'TOKEN_EXPIRED', 401),
    );
    const { state } = await renderForm();
    await fill(state, VALID);

    await act(async () => {
      await state.current.submit();
    });

    expect(state.current.submitError).toBe('session');
  });

  it('reports the session error without a token, without calling the service', async () => {
    const { state, onSaved } = await renderForm({ session: null });
    await fill(state, VALID);

    await act(async () => {
      await state.current.submit();
    });

    expect(createMock).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(state.current.submitError).toBe('session');
  });

  it('can be submitted again after a failure', async () => {
    createMock.mockRejectedValueOnce(new Error('network'));
    const { state, onSaved } = await renderForm();
    await fill(state, VALID);

    await act(async () => {
      await state.current.submit();
    });
    await act(async () => {
      await state.current.submit();
    });

    expect(createMock).toHaveBeenCalledTimes(2);
    expect(state.current.submitError).toBeNull();
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('ignores a second submit while the first is running', async () => {
    let resolveCreate: (value: Equipment) => void = () => {};
    createMock.mockReturnValue(
      new Promise<Equipment>(resolve => {
        resolveCreate = resolve;
      }),
    );
    const { state, onSaved } = await renderForm();
    await fill(state, VALID);

    let first: Promise<void>;
    await act(async () => {
      first = state.current.submit();
      state.current.submit();
    });
    expect(state.current.isSubmitting).toBe(true);
    expect(createMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCreate(EQUIPMENT);
      await first;
    });

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(state.current.isSubmitting).toBe(false);
  });
});
