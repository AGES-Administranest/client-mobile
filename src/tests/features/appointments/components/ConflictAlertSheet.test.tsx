import ReactTestRenderer, { act } from 'react-test-renderer';

import { ConflictAlertSheet } from 'features/appointments';
import { I18nProvider } from 'shared/i18n';

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

// O ConfirmDialog anima por timers (useSheetAnimation); desmontar a para antes
// de o Jest derrubar o ambiente.
afterEach(async () => {
  await act(async () => {
    mounted.splice(0).forEach(renderer => renderer.unmount());
  });
});

async function renderSheet(
  onConfirm = () => {},
  onAdjust = () => {},
  procedureName: string | null = 'Orquiectomia',
) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <I18nProvider>
        <ConflictAlertSheet
          visible
          conflictingAppointment={{ procedureName, time: '14:00' }}
          onConfirm={onConfirm}
          onAdjust={onAdjust}
        />
      </I18nProvider>,
    );
  });
  mounted.push(renderer!);
  return renderer!;
}

function textContents(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => JSON.stringify(node.props.children));
}

test('shows the conflict title and the interpolated message', async () => {
  const renderer = await renderSheet();

  const contents = textContents(renderer).join(' ');

  expect(contents).toContain('Conflito de horário');
  expect(contents).toContain('Orquiectomia');
  expect(contents).toContain('14:00');
});

test('falls back to a generic label when the conflicting appointment has no procedure name', async () => {
  const renderer = await renderSheet(
    () => {},
    () => {},
    null,
  );

  const contents = textContents(renderer).join(' ');

  expect(contents).toContain('outro atendimento');
});

test('confirming and adjusting call the right handler', async () => {
  const onConfirm = jest.fn();
  const onAdjust = jest.fn();
  const renderer = await renderSheet(onConfirm, onAdjust);

  const pressables = renderer.root.findAll(
    node => typeof node.props?.onPress === 'function',
  );
  const byLabel = (label: string) =>
    pressables
      .filter(node =>
        JSON.stringify(
          node.findAllByType('Text' as never).map(t => t.props.children),
        ).includes(label),
      )
      .pop()!;

  await act(async () => {
    byLabel('Confirmar').props.onPress();
  });
  expect(onConfirm).toHaveBeenCalledTimes(1);

  await act(async () => {
    byLabel('Ajustar horário').props.onPress();
  });
  expect(onAdjust).toHaveBeenCalledTimes(1);
});
