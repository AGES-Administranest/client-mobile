import {
  acceptedMovementIds,
  MAX_SYNC_BATCH_SIZE,
  mergePendingMovements,
  toSyncBatches,
  type PendingMovement,
} from './pendingMovement';
import type { StockMovement } from './stockMovement';

function pending(id: string): PendingMovement {
  return {
    id,
    itemId: 'item-1',
    itemName: 'Gaze estéril',
    unit: 'box',
    type: 'outbound',
    source: 'manualAdjustment',
    adjustmentReason: 'loss',
    quantity: 1,
    unitCost: 10,
    occurredAt: '2026-09-10T08:00:00.000Z',
    notes: null,
  };
}

function many(count: number): PendingMovement[] {
  return Array.from({ length: count }, (_value, index) =>
    pending(`movement-${index}`),
  );
}

describe('toSyncBatches', () => {
  it('sends nothing when the queue is empty', () => {
    expect(toSyncBatches([])).toEqual([]);
  });

  it('keeps a queue within the limit in a single batch', () => {
    expect(toSyncBatches(many(MAX_SYNC_BATCH_SIZE))).toHaveLength(1);
  });

  it('splits a queue larger than the limit the backend accepts', () => {
    const batches = toSyncBatches(many(MAX_SYNC_BATCH_SIZE + 1));

    expect(batches).toHaveLength(2);
    expect(batches[0]).toHaveLength(MAX_SYNC_BATCH_SIZE);
    expect(batches[1]).toHaveLength(1);
  });

  it('splits a long queue into full batches plus the remainder', () => {
    const batches = toSyncBatches(many(450));

    expect(batches.map(batch => batch.length)).toEqual([200, 200, 50]);
  });

  it('keeps every movement exactly once, in order', () => {
    const movements = many(450);
    const flattened = toSyncBatches(movements).flat();

    expect(flattened.map(movement => movement.id)).toEqual(
      movements.map(movement => movement.id),
    );
  });
});

describe('acceptedMovementIds', () => {
  it('clears what the server applied', () => {
    expect(
      acceptedMovementIds({
        applied: [{ id: 'a' }, { id: 'b' }],
        duplicated: [],
      }),
    ).toEqual(['a', 'b']);
  });

  it('clears what the server reported as already there', () => {
    expect(acceptedMovementIds({ applied: [], duplicated: ['a'] })).toEqual([
      'a',
    ]);
  });

  it('clears applied and duplicated together, without repeating an id', () => {
    expect(
      acceptedMovementIds({
        applied: [{ id: 'a' }, { id: 'b' }],
        duplicated: ['b', 'c'],
      }),
    ).toEqual(['a', 'b', 'c']);
  });

  it('clears nothing when the server accepted nothing', () => {
    expect(acceptedMovementIds({ applied: [], duplicated: [] })).toEqual([]);
  });
});

describe('mergePendingMovements', () => {
  const confirmed: StockMovement = {
    id: 'server-1',
    itemId: 'item-1',
    itemName: 'Gaze estéril',
    unit: 'box',
    type: 'outbound',
    source: 'manualAdjustment',
    quantity: 1,
    unitCost: 10,
    occurredAt: '2026-09-09T08:00:00.000Z',
  };

  it('shows what is queued next to what the server confirmed', () => {
    const merged = mergePendingMovements([confirmed], [pending('local-1')]);

    expect(merged.movements.map(m => m.id)).toEqual(['server-1', 'local-1']);
    expect(merged.pendingIds).toEqual(['local-1']);
  });

  it('drops the local copy once the same id comes back from the server', () => {
    const merged = mergePendingMovements(
      [{ ...confirmed, id: 'local-1' }],
      [pending('local-1')],
    );

    expect(merged.movements).toHaveLength(1);
    expect(merged.pendingIds).toEqual([]);
  });

  it('hides a queued row that the active filter excludes', () => {
    const merged = mergePendingMovements([], [pending('local-1')], {
      itemName: 'propofol',
      range: { from: null, to: null },
    });

    expect(merged.movements).toEqual([]);
    expect(merged.pendingIds).toEqual([]);
  });

  it('keeps a queued row the filter does match', () => {
    const merged = mergePendingMovements([], [pending('local-1')], {
      itemName: 'gaze',
      range: { from: null, to: null },
    });

    expect(merged.pendingIds).toEqual(['local-1']);
  });
});
