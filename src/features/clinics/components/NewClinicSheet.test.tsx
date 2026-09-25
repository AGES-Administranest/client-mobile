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

test('shows the title and one labelled input per field', async () => {
  const { renderer } = await render();

  const texts = textsOf(renderer);

  expect(texts).toContain('Nova clínica');
  for (const { label, placeholder } of Object.values(FIELD_TEXTS)) {
    expect(texts).toContain(label);
    expect(inputOf(renderer, label).props.placeholder).toBe(placeholder);
  }
});

test('shows what is in the draft', async () => {
  const { renderer } = await render({
    draft: { name: 'Clínica VetNova', cnpj: '12.345.678/0001-90' },
  });

  expect(inputOf(renderer, 'Nome da clínica').props.value).toBe(
    'Clínica VetNova',
  );
  expect(inputOf(renderer, 'CNPJ').props.value).toBe('12.345.678/0001-90');
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

test('confirms through onSubmit', async () => {
  const { renderer, spies } = await render();

  await act(() => {
    confirmButton(renderer).props.onPress();
  });

  expect(spies.onSubmit).toHaveBeenCalledTimes(1);
});

test('locks the confirm button while saving', async () => {
  const { renderer } = await render({ isSaving: true });

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
