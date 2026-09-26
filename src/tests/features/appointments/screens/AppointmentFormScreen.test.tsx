import ReactTestRenderer, { act } from 'react-test-renderer';

import { ConfirmDialog } from 'app/components/ui/confirm-dialog';
import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import {
  AppointmentFormScreen,
  ConflictAlertSheet,
} from 'features/appointments';
import { AuthProvider } from 'features/auth';
import { I18nProvider } from 'shared/i18n';

// A sessão não importa aqui; nada de auth pode ir à rede.
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

afterEach(async () => {
  await act(async () => {
    mounted.splice(0).forEach(renderer => renderer.unmount());
  });
});

async function renderScreen(onClose = jest.fn()) {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <I18nProvider>
        <AuthProvider>
          <AppointmentFormScreen
            visible
            selectedDate="2026-09-21"
            onClose={onClose}
          />
        </AuthProvider>
      </I18nProvider>,
    );
  });

  mounted.push(renderer!);
  return renderer!;
}

function cancelLink(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.find(
    node =>
      node.props.accessibilityLabel === 'Cancelar' &&
      node.props.accessibilityRole === 'button',
  );
}

function discardDialog(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findByType(ConfirmDialog);
}

test('sem nada preenchido, cancelar fecha direto', async () => {
  const onClose = jest.fn();
  const renderer = await renderScreen(onClose);

  await act(async () => {
    cancelLink(renderer).props.onPress();
  });

  expect(onClose).toHaveBeenCalledTimes(1);
  expect(discardDialog(renderer).props.visible).toBe(false);
});

test('com algo preenchido, cancelar pede confirmação num diálogo, não noutra folha', async () => {
  const onClose = jest.fn();
  const renderer = await renderScreen(onClose);

  const patient = renderer.root.find(
    node =>
      node.props.accessibilityLabel === 'Paciente' &&
      typeof node.props.onChangeText === 'function',
  );

  await act(async () => {
    patient.props.onChangeText('Mel');
  });
  await act(async () => {
    cancelLink(renderer).props.onPress();
  });

  expect(onClose).not.toHaveBeenCalled();
  expect(discardDialog(renderer).props.visible).toBe(true);
  expect(renderer.root.findAllByType(ConfirmSheet)).toHaveLength(0);

  await act(async () => {
    discardDialog(renderer).props.onCancel();
  });
  expect(discardDialog(renderer).props.visible).toBe(false);
  expect(onClose).not.toHaveBeenCalled();

  await act(async () => {
    cancelLink(renderer).props.onPress();
  });
  await act(async () => {
    discardDialog(renderer).props.onConfirm();
  });
  expect(onClose).toHaveBeenCalledTimes(1);
});

function field(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.find(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onChangeText === 'function',
  );
}

function button(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.find(
    node =>
      node.props.accessibilityLabel === label &&
      (node.props.accessibilityRole === 'button' ||
        node.props.role === 'button') &&
      typeof node.props.onPress === 'function',
  );
}

async function fill(
  renderer: ReactTestRenderer.ReactTestRenderer,
  procedure: string,
  start: string,
  end: string,
) {
  await act(async () => {
    button(renderer, 'Clínica').props.onPress();
  });
  await act(async () => {
    button(renderer, 'Clínica Vida Animal').props.onPress();
  });
  for (const [label, value] of [
    ['Paciente', 'Mel'],
    ['Procedimento', procedure],
    ['Hora de início', start],
    ['Hora do fim', end],
    ['Valor do atendimento', '10000'],
  ]) {
    await act(async () => {
      field(renderer, label).props.onChangeText(value);
    });
  }
}

test('horário sobreposto abre o alerta de conflito; ajustar volta, confirmar salva', async () => {
  const onClose = jest.fn();
  const onSaved = jest.fn();
  const screen = (visible: boolean) => (
    <I18nProvider>
      <AuthProvider>
        <AppointmentFormScreen
          visible={visible}
          selectedDate="2026-10-05"
          onClose={onClose}
          onSaved={onSaved}
        />
      </AuthProvider>
    </I18nProvider>
  );

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(screen(true));
  });
  mounted.push(renderer);

  await fill(renderer, 'Castração', '0900', '1100');
  await act(async () => {
    button(renderer, 'Confirmar').props.onPress();
  });
  expect(onSaved).toHaveBeenCalledTimes(1);

  await act(async () => {
    renderer.update(screen(false));
  });
  await act(async () => {
    renderer.update(screen(true));
  });

  await fill(renderer, 'Orquiectomia', '1000', '1200');
  await act(async () => {
    button(renderer, 'Confirmar').props.onPress();
  });

  const alert = () => renderer.root.findByType(ConflictAlertSheet);
  expect(alert().props.visible).toBe(true);
  expect(alert().findByType(ConfirmDialog).props.message).toContain(
    'Castração',
  );
  expect(alert().findByType(ConfirmDialog).props.message).toContain('09:00');
  expect(renderer.root.findAllByType(ConfirmSheet)).toHaveLength(0);

  await act(async () => {
    alert().props.onAdjust();
  });
  expect(alert().props.visible).toBe(false);
  expect(onSaved).toHaveBeenCalledTimes(1);

  await act(async () => {
    button(renderer, 'Confirmar').props.onPress();
  });
  await act(async () => {
    alert().props.onConfirm();
  });
  expect(onSaved).toHaveBeenCalledTimes(2);
  expect(onSaved).toHaveBeenLastCalledWith(
    expect.objectContaining({ procedureName: 'Orquiectomia' }),
  );
});

test('não apaga o que foi digitado se quem abriu recriar o agendamento a cada render', async () => {
  const editing = (patientName: string) => ({
    id: 'appointment-9',
    clientId: '6f1c2a9e-1b7d-4c3e-9a51-0d2f8e7b6c41',
    patientName,
    procedureName: 'Castração',
    startsAt: new Date(2026, 10, 3, 9, 0).toISOString(),
    endsAt: new Date(2026, 10, 3, 10, 0).toISOString(),
    amount: '100.00',
    species: 'CANINE' as const,
    patientAgeYears: null,
    weightKg: null,
    asaClass: null,
    notes: null,
  });
  const screen = () => (
    <I18nProvider>
      <AuthProvider>
        <AppointmentFormScreen
          visible
          appointment={editing('Mel')}
          onClose={jest.fn()}
        />
      </AuthProvider>
    </I18nProvider>
  );

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(screen());
  });
  mounted.push(renderer);

  expect(field(renderer, 'Paciente').props.value).toBe('Mel');

  await act(async () => {
    field(renderer, 'Paciente').props.onChangeText('Mel e Thor');
  });
  await act(async () => {
    renderer.update(screen());
  });

  expect(field(renderer, 'Paciente').props.value).toBe('Mel e Thor');
});
