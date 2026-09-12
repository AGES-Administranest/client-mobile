# Materials Screen — Category Filter Specification

## Problem Statement

The `materials` feature (`src/features/materials`) currently renders a placeholder screen. The team needs the real "Materiais" tab: a list of stock items (supplies/medications vs. equipment) that the user can filter by category, with a clear low-stock warning, matching the attached Figma-derived mock. This is the `US-12` filter-item story (branch `feat/us12-filter-item`).

## Goals

- [ ] User can switch between "Insumos e medicamentos" and "Equipamentos" via the existing `SegmentedControl`.
- [ ] User can filter the visible list by category using a horizontal pill filter ("Todos", "Medicamento", "Anestésico", "Descartável", …).
- [ ] Items below their minimum quantity are visually flagged (red border + warning text), matching the mock.
- [ ] Screen matches DESIGN.md tokens/components — no new colors invented, existing `MaterialCard`/`SegmentedControl`/`TabBar`/`Button` reused.

## Out of Scope

| Feature | Reason |
| --- | --- |
| "+ Adicionar material" flow (bottom sheet / form) | Button is rendered and reachable, but the add-material form/bottom-sheet is a separate story — button is a no-op placeholder for now |
| Real backend integration | No materials API exists yet; service layer stubs realistic mock data, matching `currentUserService.ts` convention |
| Equipment category set behind the "Equipamentos" segment | Only "Insumos e medicamentos" categories are in the reference mock; equipment categories are assumed identical shape, mock data provided, no dedicated design reference |
| Search/sort | Not present in the mock |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Low-stock flag source | A `belowMinimum: boolean` field on the mock data item, not a derived `quantity < minQuantity` client-side rule | In the reference mock, "Propofol" has qty 8 / min 10 (would trigger a `<` rule) but is NOT flagged, while "Isoflurano" (qty 2 / min 3) IS flagged — the rule isn't purely arithmetic on the visible fields, so the flag must come from the data source | n |
| Category filter values | Fixed list per segment, hardcoded in the mock service for now: `Todos, Medicamento, Anestésico, Descartável` for supplies, `Todos, Equipamento` for equipment | No backend/category-management story exists yet; matches only what's visible in the reference image | n |
| "Todos" behavior | Shows all items for the active segment, regardless of category | Standard "all" filter semantics, matches pill being pre-selected in the mock | n |
| Filter chip row scroll | Horizontal `ScrollView`, no wrapping | Mock shows chips cut off at the right edge of the screen, implying horizontal scroll rather than wrap | n |
| Empty filter result | Show existing i18n `common` pattern: a centered muted text row (no dedicated `EmptyState` component — out of scope per DESIGN.md's open-component list) | No empty state is visible in the mock; keeping it minimal avoids inventing a new primitive for a scenario the design doesn't specify | n |
| Segment categories persist across segment switch | No — switching segment resets category filter to "Todos" | Each segment's category list is a different set (see above), so a persisted value could be invalid for the newly active segment | n |

**Open questions:** none — all resolved as assumptions above (Medium scope: obvious ambiguities resolved, none required blocking user input since the mock and existing conventions were sufficient).

---

## User Stories

### P1: Filter materials by category ⭐ MVP

**User Story**: As a clinic staff member managing stock, I want to filter the materials list by category so that I can quickly find items of a given type.

**Why P1**: This is the entire scope of US-12 and the reason the screen is being built now.

**Acceptance Criteria**:

1. WHEN the Materials screen mounts THEN the system SHALL display the "Insumos e medicamentos" segment active by default with the "Todos" category filter selected and the full supplies list visible.
2. WHEN the user taps a category pill (e.g. "Medicamento") THEN the system SHALL show only items whose `category` matches that pill's label and SHALL mark that pill as the active selection.
3. WHEN the user taps "Todos" THEN the system SHALL show every item in the currently active segment, ignoring category.
4. WHEN the user switches the top segment (e.g. to "Equipamentos") THEN the system SHALL replace the category pill row with that segment's categories, reset the selection to "Todos", and show that segment's full item list.
5. The system SHALL render each visible item using the existing `MaterialCard` component (name, category, formatted price/unit, quantity, minimum quantity).
6. IF an item's data marks it below its minimum quantity THEN the system SHALL render that item's card with a red border and the warning text "Item abaixo da quantidade mínima" beneath the category/price line.
7. IF the active category filter matches zero items THEN the system SHALL render a centered muted message instead of an empty list, using an i18n key (no invented empty-state component).

**Independent Test**: Open the Materials tab, confirm the default list and "Todos" state, tap each category pill and confirm the list narrows to matching items only, tap "Todos" again and confirm the full list returns.

---

## Edge Cases

- WHEN the category pill row is wider than the screen THEN the system SHALL allow horizontal scrolling without wrapping to a second line.
- IF the mock service list is empty for a segment THEN the system SHALL show the same empty-state message as AC-7 above.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| MATF-01 | P1: Filter materials by category | Execute | Verified |
| MATF-02 | P1: Filter materials by category | Execute | Verified |
| MATF-03 | P1: Filter materials by category | Execute | Verified |
| MATF-04 | P1: Filter materials by category | Execute | Verified |
| MATF-05 | P1: Filter materials by category | Execute | Verified |
| MATF-06 | P1: Filter materials by category | Execute | Verified |
| MATF-07 | P1: Filter materials by category | Execute | Verified (spec-precision gap noted — empty state unreachable through normal UI given segment-switch reset; predicate covered by domain-level empty-result tests only) |

**ID format:** `MATF-NN`

**Status values:** Pending → Implementing → Verified

**Coverage:** 7 total, 7 mapped to tasks (implicit — Medium scope, no formal tasks.md), 0 unmapped

---

## Success Criteria

- [ ] Materials screen renders segment control, category filter, list (with low-stock flag), and add-material button matching DESIGN.md tokens.
- [ ] Category filter narrows the list correctly for every category in both segments, verified by domain-level unit tests.
- [ ] `npm run lint`, `npm run format:check`, and `npm test` all pass.
