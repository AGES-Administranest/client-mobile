import ReactTestRenderer, { act } from 'react-test-renderer';

import { useSupplyList } from './useSupplyList';
import type { SupplyItem } from '../domain/supplyItem';

const PROPOFOL: SupplyItem = {
  id: 'propofol',
  name: 'Propofol 10mg/ml 20ml',
  quantity: 1,
  unitCost: 19.9,
  source: 'stock',
};

const SERINGA: SupplyItem = {
  id: 'seringa',
  name: 'Seringa 60ml',
  quantity: 2,
  unitCost: 5.6,
  source: 'standalone',
};

let current: ReturnType<typeof useSupplyList>;

function Probe({ initialItems }: { initialItems?: SupplyItem[] }) {
  current = useSupplyList(initialItems);
  return null;
}

async function mount(initialItems?: SupplyItem[]) {
  await act(() => {
    ReactTestRenderer.create(<Probe initialItems={initialItems} />);
  });
}

test('starts empty with a zero total', async () => {
  await mount();

  expect(current.items).toEqual([]);
  expect(current.totalCost).toBe(0);
});

test('computes the total from the initial items', async () => {
  await mount([PROPOFOL, SERINGA]);

  expect(current.totalCost).toBeCloseTo(31.1);
});

test('updates the total when an item is added', async () => {
  await mount([PROPOFOL]);

  await act(() => current.addItem(SERINGA));

  expect(current.items).toHaveLength(2);
  expect(current.totalCost).toBeCloseTo(31.1);
});

test('updates the total when an item is removed', async () => {
  await mount([PROPOFOL, SERINGA]);

  await act(() => current.removeItem('propofol'));

  expect(current.items.map(item => item.id)).toEqual(['seringa']);
  expect(current.totalCost).toBeCloseTo(11.2);
});

test('updates the total when a quantity is edited', async () => {
  await mount([PROPOFOL, SERINGA]);

  await act(() => current.updateQuantity('seringa', 5));

  expect(current.totalCost).toBeCloseTo(47.9);
});
