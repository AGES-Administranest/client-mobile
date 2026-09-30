import { useCallback, useRef, useState } from 'react';

import {
  currencyToNumber,
  formatCurrency,
} from 'app/components/ui/item-modal/domain/itemModal';
import type {
  ItemDraft,
  ItemPrefill,
} from 'app/components/ui/item-modal/item-modal';
import { useAuth } from 'features/auth';
import {
  backendUnitLabel,
  CATEGORY_OPTIONS,
  createItem,
  toBackendUnit,
  type BackendItem,
} from 'features/materials';

import {
  acceptComputedTotal as acceptComputedTotalOf,
  addLine as addLineTo,
  linkLine as linkLineOf,
  parseDecimal,
  removeLine as removeLineFrom,
  splitLine as splitLineOf,
  updateHeader,
  updateLine,
  type HeaderChanges,
  type LineChanges,
  type LinkedItem,
  type Review,
  type ReviewLine,
} from '../domain/review';

export type ReviewState = {
  review: Review;
  onlyAttention: boolean;
  toggleOnlyAttention: () => void;
  editingLineId: string | null;
  editLine: (id: string | null) => void;
  changeLine: (id: string, changes: LineChanges) => void;
  acceptComputedTotal: (id: string) => void;
  splitLine: (id: string) => void;
  removeLine: (id: string) => void;
  addLine: () => void;
  changeHeader: (changes: HeaderChanges) => void;
  linkingLineId: string | null;
  openLinking: (id: string) => void;
  closeLinking: () => void;
  linkTo: (item: LinkedItem) => void;
  newItem: ItemPrefill | null;
  startNewItem: (name: string) => void;
  cancelNewItem: () => void;
  createAndLink: (draft: ItemDraft) => Promise<void>;
  isCreatingItem: boolean;
  newItemFailed: boolean;
};

export function useReview(initial: Review): ReviewState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [review, setReview] = useState(initial);
  const [onlyAttention, setOnlyAttention] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [linkingLineId, setLinkingLineId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<ItemPrefill | null>(null);
  const [newItemFailed, setNewItemFailed] = useState(false);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  // A second tap can land before the re-render, so the state alone is late.
  const isCreating = useRef(false);
  const nextId = useRef(0);

  const newLineId = useCallback((prefix: string) => {
    nextId.current += 1;
    return `${prefix}-${nextId.current}`;
  }, []);

  const editLines = useCallback(
    (edit: (lines: ReviewLine[]) => ReviewLine[]) =>
      setReview(current => ({ ...current, lines: edit(current.lines) })),
    [],
  );

  const splitLine = useCallback(
    (id: string) => {
      const partId = newLineId('split');
      editLines(lines => splitLineOf(lines, id, partId));
      setEditingLineId(partId);
    },
    [editLines, newLineId],
  );

  const addLine = useCallback(() => {
    const id = newLineId('added');
    editLines(lines => addLineTo(lines, id));
    setEditingLineId(id);
  }, [editLines, newLineId]);

  const linkTo = useCallback(
    (item: LinkedItem) => {
      if (!linkingLineId) return;
      editLines(lines => linkLineOf(lines, linkingLineId, item));
      setLinkingLineId(null);
    },
    [editLines, linkingLineId],
  );

  const startNewItem = useCallback(
    (name: string) => {
      const line = review.lines.find(({ id }) => id === linkingLineId);
      setNewItemFailed(false);
      setNewItem(prefillFor(line, name));
    },
    [review.lines, linkingLineId],
  );

  const createAndLink = useCallback(
    async (draft: ItemDraft) => {
      if (!idToken || !linkingLineId || isCreating.current) return;
      const lineId = linkingLineId;
      isCreating.current = true;
      setIsCreatingItem(true);
      try {
        const created = await createItem(idToken, newItemPayload(draft));
        editLines(lines => linkCreatedItem(lines, lineId, created, draft));
        setNewItem(null);
        setLinkingLineId(null);
      } catch {
        setNewItem(null);
        setNewItemFailed(true);
      } finally {
        isCreating.current = false;
        setIsCreatingItem(false);
      }
    },
    [editLines, idToken, linkingLineId],
  );

  return {
    review,
    onlyAttention,
    toggleOnlyAttention: useCallback(() => setOnlyAttention(on => !on), []),
    editingLineId,
    editLine: setEditingLineId,
    changeLine: useCallback(
      (id: string, changes: LineChanges) =>
        editLines(lines => updateLine(lines, id, changes)),
      [editLines],
    ),
    acceptComputedTotal: useCallback(
      (id: string) => editLines(lines => acceptComputedTotalOf(lines, id)),
      [editLines],
    ),
    splitLine,
    removeLine: useCallback(
      (id: string) => editLines(lines => removeLineFrom(lines, id)),
      [editLines],
    ),
    addLine,
    changeHeader: useCallback(
      (changes: HeaderChanges) =>
        setReview(current => ({
          ...current,
          header: updateHeader(current.header, changes),
        })),
      [],
    ),
    linkingLineId,
    openLinking: useCallback((id: string) => {
      setNewItemFailed(false);
      setLinkingLineId(id);
    }, []),
    closeLinking: useCallback(() => setLinkingLineId(null), []),
    linkTo,
    newItem,
    startNewItem,
    cancelNewItem: useCallback(() => setNewItem(null), []),
    createAndLink,
    isCreatingItem,
    newItemFailed,
  };
}

/** The item form opens with what the line already knows. */
function prefillFor(line: ReviewLine | undefined, name: string): ItemPrefill {
  // No quantity: the form keeps only digits, so 1.5 would come back as 15.
  // The line keeps its own unless one is typed there.
  return {
    name: name.trim() || line?.description || '',
    unitCost:
      line && line.unitValue !== null
        ? formatCurrency(String(Math.round(line.unitValue * 100)))
        : '',
    expiration: line?.expiry ?? '',
  };
}

function newItemPayload(draft: ItemDraft) {
  return {
    category: categoryOf(draft.category),
    unit: toBackendUnit(draft.unit),
    name: draft.name.trim(),
    defaultUnitCost: currencyToNumber(draft.unitCost) || undefined,
    minimumStock: draft.minQuantity
      ? parseDecimal(draft.minQuantity) ?? undefined
      : undefined,
  };
}

function categoryOf(value: string): BackendItem['category'] {
  return (
    CATEGORY_OPTIONS.find(option => option.value === value)?.value ?? 'OTHER'
  );
}

/** What was typed in the item form also fills the line it came from. */
function linkCreatedItem(
  lines: ReviewLine[],
  lineId: string,
  created: BackendItem,
  draft: ItemDraft,
): ReviewLine[] {
  const line = lines.find(({ id }) => id === lineId);
  const linked = linkLineOf(lines, lineId, {
    itemId: created.id,
    name: created.name,
    unit: backendUnitLabel(created.unit),
  });
  return updateLine(linked, lineId, {
    quantity: parseDecimal(draft.quantity) ?? line?.quantity ?? null,
    unitValue: currencyToNumber(draft.unitCost) || (line?.unitValue ?? null),
    expiry: draft.expiration || line?.expiry || '',
  });
}
