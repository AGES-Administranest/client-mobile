import ReactTestRenderer, { act } from 'react-test-renderer';

import { ConflictAlertSheet } from 'features/appointments';
import { I18nProvider } from 'shared/i18n';

async function renderSheet(
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
          onAdjust={onAdjust}
        />
      </I18nProvider>,
    );
  });
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
  const renderer = await renderSheet(() => {}, null);

  const contents = textContents(renderer).join(' ');

  expect(contents).toContain('outro atendimento');
});

test('offers a single button, to change the time, with no way to save anyway', async () => {
  const onAdjust = jest.fn();
  const renderer = await renderSheet(onAdjust);

  const contents = textContents(renderer).join(' ');
  expect(contents).toContain('Alterar horário');
  expect(contents).not.toContain('Confirmar');

  const button = renderer.root
    .findAll(node => typeof node.props?.onPress === 'function')
    .filter(node =>
      JSON.stringify(
        node.findAllByType('Text' as never).map(t => t.props.children),
      ).includes('Alterar horário'),
    )
    .pop()!;

  await act(async () => {
    button.props.onPress();
  });
  expect(onAdjust).toHaveBeenCalledTimes(1);
});
