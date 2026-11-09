import { fetchClientAppointments, fetchClientSummary } from './clientService';
import { HISTORY_PAGE_SIZE, monthPeriodOf } from '../domain/clientHistory';

const TODAY = new Date(2026, 10, 3, 10);
const CURRENT_MONTH = monthPeriodOf(TODAY);
const PREVIOUS_MONTH = monthPeriodOf(new Date(2026, 9, 15));

beforeEach(() => {
  jest.useFakeTimers({ now: TODAY });
});

afterEach(() => {
  jest.useRealTimers();
});

function settled<T>(promise: Promise<T>): Promise<T> {
  jest.runAllTimers();
  return promise;
}

test('lists the appointments of the period, newest first, with numeric amounts', async () => {
  const page = await settled(
    fetchClientAppointments('id-token', 'client-1', PREVIOUS_MONTH, 1),
  );

  expect(page.slice(0, 3).map(item => item.procedureName)).toEqual([
    'Orquiectomia',
    'Caudectomia',
    'Limpeza dentária',
  ]);
  expect(page[0].amount).toBe(620);
});

test('leaves out the days of the current month that have not come yet', async () => {
  const page = await settled(
    fetchClientAppointments('id-token', 'client-1', CURRENT_MONTH, 1),
  );

  expect(page.map(item => item.procedureName)).toEqual([
    'Exodontia',
    'Mastectomia',
    'Nodulectomia',
  ]);
});

test('splits a busy period into pages of the history page size', async () => {
  const first = await settled(
    fetchClientAppointments('id-token', 'client-1', PREVIOUS_MONTH, 1),
  );
  const second = await settled(
    fetchClientAppointments('id-token', 'client-1', PREVIOUS_MONTH, 2),
  );

  expect(first).toHaveLength(HISTORY_PAGE_SIZE);
  expect(second).toHaveLength(3);
  expect(new Set([...first, ...second].map(item => item.id)).size).toBe(13);
});

test('sums in the summary the same appointments the list shows', async () => {
  const summary = await settled(
    fetchClientSummary('id-token', 'client-1', CURRENT_MONTH),
  );
  const list = await settled(
    fetchClientAppointments('id-token', 'client-1', CURRENT_MONTH, 1),
  );

  expect(summary).toEqual({
    appointmentsCount: 3,
    billedTotal: 1570,
    tripCost: 48,
    tripCount: 3,
  });
  expect(list.reduce((total, item) => total + (item.amount ?? 0), 0)).toBe(
    summary.billedTotal,
  );
});

test('finds nothing in a period without appointments', async () => {
  const empty = { from: '2025-01-01', to: '2025-01-31' };

  await expect(
    settled(fetchClientAppointments('id-token', 'client-1', empty, 1)),
  ).resolves.toEqual([]);
  await expect(
    settled(fetchClientSummary('id-token', 'client-1', empty)),
  ).resolves.toEqual({
    appointmentsCount: 0,
    billedTotal: 0,
    tripCost: 0,
    tripCount: 0,
  });
});
