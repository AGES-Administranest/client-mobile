import ReactTestRenderer, { act } from 'react-test-renderer';

import { ConfirmDialog } from 'app/components/ui/confirm-dialog';
import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import { AppointmentFormScreen } from 'features/appointments';
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
