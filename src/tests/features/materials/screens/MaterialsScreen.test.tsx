import ReactTestRenderer, { act } from 'react-test-renderer';

import { MaterialsScreen } from 'features/materials';
import { I18nProvider } from 'shared/i18n';

async function renderScreen() {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <I18nProvider>
        <MaterialsScreen />
      </I18nProvider>,
    );
  });

  return renderer!;
}

function getTexts(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children)
    .flat()
    .join(' | ');
}

function getCategoryPills(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findAll(
    node =>
      node.props.accessibilityRole === 'button' &&
      typeof node.props.onPress === 'function',
  );
}

function getSegmentTabs(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findAll(
    node =>
      node.props.accessibilityRole === 'tab' &&
      typeof node.props.onPress === 'function',
  );
}

test('defaults to the supplies segment with only the "Todos" category and an empty list', async () => {
  const renderer = await renderScreen();

  const segmentTabs = getSegmentTabs(renderer);
  expect(segmentTabs[0].props.accessibilityState).toEqual({ selected: true });

  const categoryPills = getCategoryPills(renderer);
  expect(categoryPills).toHaveLength(1);
  expect(categoryPills[0].props.accessibilityState).toEqual({
    selected: true,
  });

  expect(getTexts(renderer)).toContain('Nenhum item encontrado');
});

test('switching segment keeps the empty state', async () => {
  const renderer = await renderScreen();

  const segmentTabs = getSegmentTabs(renderer);
  await act(async () => {
    segmentTabs[1].props.onPress();
  });

  const categoryPills = getCategoryPills(renderer);
  expect(categoryPills).toHaveLength(1);
  expect(categoryPills[0].props.accessibilityState).toEqual({
    selected: true,
  });

  expect(getTexts(renderer)).toContain('Nenhum item encontrado');
});
