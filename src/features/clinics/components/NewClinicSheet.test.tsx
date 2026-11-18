import { Dimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { NewClinicSheet, type NewClinicSheetProps } from './NewClinicSheet';
import {
  EMPTY_CLINIC_DRAFT,
  type ClinicDraft,
  type ClinicField,
} from '../domain/clinicForm';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const FIELD_TEXTS: NewClinicSheetProps['fieldTexts'] = {
  name: { label: 'Nome da clínica', placeholder: 'Digite o nome da clínica' },
  cnpj: { label: 'CNPJ', placeholder: '00.000.000/0000-00' },
  addressLine: {
    label: 'Endereço',
    placeholder: 'Digite a rua, número e bairro',
  },
  city: { label: 'Cidade', placeholder: 'Ex: São Paulo' },
  state: { label: 'UF', placeholder: 'SP' },
  phone: { label: 'Contato', placeholder: '(00) 00000-0000' },
  email: { label: 'E-mail', placeholder: 'contato@clinica.com.br' },
  contactName: {
    label: 'Responsável',
    placeholder: 'Nome do médico responsável',
  },
};

const STEP_TEXTS: NewClinicSheetProps['stepTexts'] = {
  next: 'Próximo',
  back: 'Voltar',
  labels: ['Passo 1 de 2', 'Passo 2 de 2'],
};

type Overrides = {
  draft?: Partial<ClinicDraft>;
  fieldErrors?: Partial<Record<ClinicField, string>>;
  failureMessage?: string | null;
  isSaving?: boolean;
};

async function render({
  draft = {},
  fieldErrors = {},
  failureMessage = null,
  isSaving = false,
}: Overrides = {}) {
  const spies = {
    onChangeField: jest.fn(),
    onSubmit: jest.fn(),
    onClose: jest.fn(),
  };

  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <NewClinicSheet
          visible
          draft={{ ...EMPTY_CLINIC_DRAFT, ...draft }}
          fieldErrors={fieldErrors}
          failureMessage={failureMessage}
          isSaving={isSaving}
          title="Nova clínica"
          fieldTexts={FIELD_TEXTS}
          confirmLabel="Confirmar"
          savingLabel="Salvando..."
          closeLabel="Fechar"
          stepTexts={STEP_TEXTS}
          {...spies}
        />
      </SafeAreaProvider>,
    );
  });

  return { renderer: renderer!, spies };
}

function textsOf(renderer: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(
    renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children),
  );
}

function inputOf(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.find(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onChangeText === 'function',
  );
}

function buttonLabelled(
  renderer: ReactTestRenderer.ReactTestRenderer,
  labels: string[],
) {
  return renderer.root
    .findAll(
      node =>
        node.props.role === 'button' &&
        typeof node.props.onPress === 'function',
    )
    .find(node =>
      node
        .findAllByType('Text' as never)
        .some(label => labels.includes(label.props.children)),
    )!;
}

async function goToContactStep(renderer: ReactTestRenderer.ReactTestRenderer) {
  await act(() => {
    buttonLabelled(renderer, ['Próximo']).props.onPress();
  });
}

function confirmButton(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAll(
      node =>
        node.props.role === 'button' &&
        typeof node.props.onPress === 'function',
    )
    .find(node =>
      node
        .findAllByType('Text' as never)
        .some(
          label =>
            label.props.children === 'Confirmar' ||
            label.props.children === 'Salvando...',
        ),
    )!;
}

const MAIN_STEP_FIELDS = [
  'name',
  'cnpj',
  'addressLine',
  'city',
  'state',
] as const;
const CONTACT_STEP_FIELDS = ['phone', 'email', 'contactName'] as const;

test('splits the fields in two steps', async () => {
  const { renderer } = await render();

  expect(textsOf(renderer)).toContain('Nova clínica');
  expect(textsOf(renderer)).toContain('Passo 1 de 2');
  for (const field of MAIN_STEP_FIELDS) {
    const { label, placeholder } = FIELD_TEXTS[field];
    expect(inputOf(renderer, label).props.placeholder).toBe(placeholder);
  }
  for (const field of CONTACT_STEP_FIELDS) {
    expect(() => inputOf(renderer, FIELD_TEXTS[field].label)).toThrow();
  }

  await goToContactStep(renderer);

  expect(textsOf(renderer)).toContain('Passo 2 de 2');
  for (const field of CONTACT_STEP_FIELDS) {
    const { label, placeholder } = FIELD_TEXTS[field];
    expect(inputOf(renderer, label).props.placeholder).toBe(placeholder);
  }
  for (const field of MAIN_STEP_FIELDS) {
    expect(() => inputOf(renderer, FIELD_TEXTS[field].label)).toThrow();
  }
});

test('goes back to the first step keeping what was typed', async () => {
  const { renderer } = await render({ draft: { name: 'Clínica VetNova' } });

  await goToContactStep(renderer);
  await act(() => {
    buttonLabelled(renderer, ['Voltar']).props.onPress();
  });

  expect(inputOf(renderer, 'Nome da clínica').props.value).toBe(
    'Clínica VetNova',
  );
});

test('shows what is in the draft', async () => {
  const { renderer } = await render({
    draft: { name: 'Clínica VetNova', cnpj: '11.222.333/0001-81' },
  });

  expect(inputOf(renderer, 'Nome da clínica').props.value).toBe(
    'Clínica VetNova',
  );
  expect(inputOf(renderer, 'CNPJ').props.value).toBe('11.222.333/0001-81');
});

test('reports each keystroke together with the field it belongs to', async () => {
  const { renderer, spies } = await render();

  await act(() => {
    inputOf(renderer, 'CNPJ').props.onChangeText('123');
    inputOf(renderer, 'UF').props.onChangeText('sp');
  });

  expect(spies.onChangeField).toHaveBeenCalledWith('cnpj', '123');
  expect(spies.onChangeField).toHaveBeenCalledWith('state', 'sp');
});

test('opens the right keyboard for the phone and the e-mail', async () => {
  const { renderer } = await render();
  await goToContactStep(renderer);

  expect(inputOf(renderer, 'Contato').props.keyboardType).toBe('phone-pad');
  expect(inputOf(renderer, 'E-mail').props.keyboardType).toBe('email-address');
  expect(inputOf(renderer, 'E-mail').props.autoCapitalize).toBe('none');
});

test('shows the error under the field that failed', async () => {
  const { renderer } = await render({
    fieldErrors: { name: 'Informe o nome da clínica.' },
  });

  expect(textsOf(renderer)).toContain('Informe o nome da clínica.');
});

test('shows the failure the API answered with', async () => {
  const { renderer } = await render({
    failureMessage: 'Já existe uma clínica com esse nome.',
  });

  expect(textsOf(renderer)).toContain('Já existe uma clínica com esse nome.');
});

test('only confirms on the last step', async () => {
  const { renderer, spies } = await render();

  expect(confirmButton(renderer)).toBeUndefined();
  await goToContactStep(renderer);

  await act(() => {
    confirmButton(renderer).props.onPress();
  });

  expect(spies.onSubmit).toHaveBeenCalledTimes(1);
});

test('locks the confirm button while saving', async () => {
  const { renderer } = await render({ isSaving: true });
  await goToContactStep(renderer);

  expect(textsOf(renderer)).toContain('Salvando...');
  expect(confirmButton(renderer).props.disabled).toBe(true);
});

test('closes when the backdrop is tapped', async () => {
  const { renderer, spies } = await render();

  await act(() => {
    renderer.root
      .find(
        node =>
          node.props.accessibilityLabel === 'Fechar' &&
          typeof node.props.onPress === 'function',
      )
      .props.onPress();
  });

  expect(spies.onClose).toHaveBeenCalledTimes(1);
});

test('grows past 90% of the screen but never under the status bar', async () => {
  const { renderer } = await render();
  const windowHeight = Dimensions.get('window').height;

  const [sheet] = renderer.root.findAll(
    node => typeof node.props.style?.maxHeight === 'number',
  );

  expect(sheet.props.style.maxHeight).toBeGreaterThan(windowHeight * 0.9);
  expect(sheet.props.style.maxHeight).toBeLessThanOrEqual(
    windowHeight - METRICS.insets.top,
  );
});
