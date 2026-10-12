import { TextInput } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  PricingSettingsForm,
  type PricingSettingsFormProps,
} from 'features/pricing';

const TEXTS: PricingSettingsFormProps['texts'] = {
  title: 'Metas',
  labels: {
    monthlyIncomeGoal: 'Meta de renda líquida mensal (R$)',
    weeklyHours: 'Horas disponíveis por semana',
    safetyMarginPct: 'Margem de segurança (%)',
  },
  weeklyHoursHint: 'Inclua os períodos ociosos.',
  saveLabel: 'Salvar metas',
  savingLabel: 'Salvando…',
};

async function render(overrides: Partial<PricingSettingsFormProps> = {}) {
  const spies = { onChangeField: jest.fn(), onSubmit: jest.fn() };
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <PricingSettingsForm
        draft={{
          monthlyIncomeGoal: '8000',
          weeklyHours: '30',
          safetyMarginPct: '20',
        }}
        fieldErrors={{}}
        failureMessage={null}
        isSaving={false}
        texts={TEXTS}
        {...spies}
        {...overrides}
      />,
    );
  });

  const texts = () =>
    renderer.root
      .findAll(node => typeof node.props.children === 'string')
      .map(node => node.props.children as string);
  const input = (label: string) =>
    renderer.root.find(
      node =>
        node.type === TextInput && node.props.accessibilityLabel === label,
    );
  const saveButton = () =>
    renderer.root.find(
      node =>
        typeof node.props.onPress === 'function' &&
        node.props.disabled !== undefined,
    );

  return { spies, texts, input, saveButton };
}

test('shows the Metas section with each field, its value and the idle-time hint', async () => {
  const { texts, input } = await render();

  expect(texts()).toEqual(
    expect.arrayContaining([
      'Metas',
      'Meta de renda líquida mensal (R$)',
      'Horas disponíveis por semana',
      'Margem de segurança (%)',
      'Inclua os períodos ociosos.',
      'Salvar metas',
    ]),
  );
  expect(input('Horas disponíveis por semana').props.value).toBe('30');
});

test('reports which field changed', async () => {
  const { spies, input } = await render();

  await act(async () => {
    input('Margem de segurança (%)').props.onChangeText('35');
  });

  expect(spies.onChangeField).toHaveBeenCalledWith('safetyMarginPct', '35');
});

test('shows the validation messages under their fields', async () => {
  const { texts, input } = await render({
    fieldErrors: {
      weeklyHours: 'O valor deve ser maior que zero',
      safetyMarginPct: 'A margem deve ficar entre 0% e 100%',
    },
  });

  expect(texts()).toEqual(
    expect.arrayContaining([
      'O valor deve ser maior que zero',
      'A margem deve ficar entre 0% e 100%',
    ]),
  );
  expect(input('Horas disponíveis por semana').props.className).toContain(
    'border-alert-primary',
  );
  expect(
    input('Meta de renda líquida mensal (R$)').props.className,
  ).not.toContain('border-alert-primary');
});

test('submits on save', async () => {
  const { spies, saveButton } = await render();

  await act(async () => {
    saveButton().props.onPress();
  });

  expect(spies.onSubmit).toHaveBeenCalledTimes(1);
});

test('locks the form while saving and shows the failure message', async () => {
  const { texts, input, saveButton } = await render({
    isSaving: true,
    failureMessage: 'Não foi possível salvar as metas.',
  });

  expect(texts()).toEqual(
    expect.arrayContaining(['Salvando…', 'Não foi possível salvar as metas.']),
  );
  expect(saveButton().props.disabled).toBe(true);
  expect(input('Margem de segurança (%)').props.editable).toBe(false);
});
