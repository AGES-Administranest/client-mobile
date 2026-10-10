import ReactTestRenderer, { act } from 'react-test-renderer';

import { I18nProvider } from 'shared/i18n';

import { NewEntryFlow } from './NewEntryFlow';

function textsOf(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children)
    .filter(child => typeof child === 'string');
}

function pressByText(
  renderer: ReactTestRenderer.ReactTestRenderer,
  text: string,
) {
  const button = renderer.root.find(
    node =>
      node.props.role === 'button' &&
      typeof node.props.onPress === 'function' &&
      node.findAllByType('Text' as never).some(t => t.props.children === text),
  );
  return act(() => {
    button.props.onPress();
  });
}

async function renderFlow() {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(() => {
    renderer = ReactTestRenderer.create(
      <I18nProvider>
        <NewEntryFlow />
      </I18nProvider>,
    );
  });
  return renderer!;
}

async function openOptions(renderer: ReactTestRenderer.ReactTestRenderer) {
  await act(() => {
    renderer.root
      .findByProps({ testID: 'finance-new-entry-button' })
      .props.onPress();
  });
}

test('shows only the new entry button until it is pressed', async () => {
  const renderer = await renderFlow();

  expect(textsOf(renderer)).toEqual(['Novo lançamento']);
});

test('opens the options sheet with the PDF and the manual choices', async () => {
  const renderer = await renderFlow();

  await openOptions(renderer);

  expect(textsOf(renderer)).toEqual(
    expect.arrayContaining([
      'Envie a nota ou o pedido em PDF para lançar automaticamente, ou preencha à mão.',
      'Enviar documento (PDF)',
      'Lançamento manual',
    ]),
  );
});

test('answers the PDF choice with a notice only after the options sheet is gone', async () => {
  const renderer = await renderFlow();
  await openOptions(renderer);

  await pressByText(renderer, 'Enviar documento (PDF)');

  const texts = textsOf(renderer);
  expect(texts).not.toContain(
    'Envie a nota ou o pedido em PDF para lançar automaticamente, ou preencha à mão.',
  );
  expect(texts).toEqual(
    expect.arrayContaining([
      'Envio de PDF em breve',
      'Por enquanto, registre a entrada ou a saída pelo lançamento manual.',
    ]),
  );

  await pressByText(renderer, 'Entendi');

  expect(textsOf(renderer)).toEqual(['Novo lançamento']);
});

test('closes the options sheet without opening anything else on the manual choice for now', async () => {
  const renderer = await renderFlow();
  await openOptions(renderer);

  await pressByText(renderer, 'Lançamento manual');

  expect(textsOf(renderer)).toEqual(['Novo lançamento']);
});
