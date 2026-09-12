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

function findCategoryPillByLabel(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  return getCategoryPills(renderer).find(
    pill =>
      JSON.stringify(
        pill.findAllByType('Text' as never).map(node => node.props.children),
      ) === JSON.stringify([label]),
  )!;
}

test('defaults to the supplies segment, "Todos" category and the full supplies list', async () => {
  const renderer = await renderScreen();
  const texts = getTexts(renderer);

  expect(texts).toContain('Propofol 10mg/ml 20ml');
  expect(texts).toContain('Isoflurano 250ml');
  expect(texts).toContain('Midazolam 5mg/ml 3ml');
  expect(texts).toContain('Fentanil 0,05mg/ml 10ml');
  expect(texts).toContain('Seringa 60ml');
  expect(texts).toContain('Item abaixo da quantidade mínima');

  const segmentTabs = getSegmentTabs(renderer);
  expect(segmentTabs[0].props.accessibilityState).toEqual({ selected: true });

  const categoryPills = getCategoryPills(renderer);
  expect(categoryPills[0].props.accessibilityState).toEqual({
    selected: true,
  });
});

test('narrows the list to the tapped category and marks it as selected', async () => {
  const renderer = await renderScreen();

  const medicamentoPill = findCategoryPillByLabel(renderer, 'Medicamento');

  await act(async () => {
    medicamentoPill.props.onPress();
  });

  const texts = getTexts(renderer);
  expect(texts).toContain('Propofol 10mg/ml 20ml');
  expect(texts).toContain('Midazolam 5mg/ml 3ml');
  expect(texts).toContain('Fentanil 0,05mg/ml 10ml');
  expect(texts).not.toContain('Isoflurano 250ml');
  expect(texts).not.toContain('Seringa 60ml');
});

test('"Todos" restores the full segment list after a category was selected', async () => {
  const renderer = await renderScreen();

  const medicamentoPill = findCategoryPillByLabel(renderer, 'Medicamento');

  await act(async () => {
    medicamentoPill.props.onPress();
  });

  const categoryPills = getCategoryPills(renderer);
  await act(async () => {
    categoryPills[0].props.onPress();
  });

  const texts = getTexts(renderer);
  expect(texts).toContain('Isoflurano 250ml');
  expect(texts).toContain('Seringa 60ml');
});

test('switching segment resets the category filter and swaps the list', async () => {
  const renderer = await renderScreen();

  const segmentTabs = getSegmentTabs(renderer);
  await act(async () => {
    segmentTabs[1].props.onPress();
  });

  const texts = getTexts(renderer);
  expect(texts).toContain('Bisturi elétrico');
  expect(texts).toContain('Monitor multiparamétrico');
  expect(texts).not.toContain('Propofol 10mg/ml 20ml');

  const categoryPills = getCategoryPills(renderer);
  expect(categoryPills[0].props.accessibilityState).toEqual({
    selected: true,
  });
});
