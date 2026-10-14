# Design system reference

Source of truth: [Figma — Administranest](https://www.figma.com/design/yH72JpHpGl6GfZEw4eEhDS/Administranest?node-id=21-3), frame **"📱 High Fidelity" → "Atendimentos - Detalhe"** (Appointment Detail screen).

This document reverse-engineers the visual language from that screen and cross-references it against what's already implemented in [`src/theme/colors.ts`](./src/theme/colors.ts), [`global.css`](./global.css), and [`tailwind.config.js`](./tailwind.config.js), so it can guide new features (`clinics`, `finance`, `materials`, `reports`, …) toward a consistent look instead of each one inventing its own colors/spacing.

> **Scope note:** only one screen (in 5 states/variants) was available to inspect. Treat this as the pattern to extend, not a full spec — exact pixel values (radius, shadow blur, line-height) are estimated from the rendered screenshot, not read from Figma's raw node properties (that requires the Figma desktop app with a live selection, which wasn't available in this pass). Numbers below are expressed as the closest Tailwind/NativeWind utility, which is precise enough to implement from.

## 1. What the screen does

"Atendimentos - Detalhe" is the operational + financial detail view for a single clinic appointment: patient info, billed amount, hours worked, materials/equipment consumed during the procedure, optional travel cost, and a computed gross margin (billed amount minus material costs). This maps closely to the `finance` and `clinics` features in this codebase.

## 2. Color tokens

The good news: **the palette is already implemented** in this repo. Every color role visible in the design has a 1:1 match in `src/theme/colors.ts` (React Native side) and the corresponding CSS variable in `global.css` (NativeWind side) — no new colors should be needed for screens in this style family.

| Role in the design | Where it appears | Hex | Existing token | Tailwind class |
| --- | --- | --- | --- | --- |
| Screen background | Full-screen gradient (lavender → cream) | `#F3EFFF → #F7F3F0 → #FBF6E8` | `Colors.background.primary` | apply via `LinearGradient`, not a flat class |
| Primary button / FAB / active brand color | "Confirmar", "+ Adicionar", back button circle, calculator FAB | `#594236` | `Colors.button.primary` | `bg-button-primary` |
| Secondary accent | (not on this screen, reserved for destructive/alt actions elsewhere) | `#A33423` | `Colors.button.secondary` | `bg-button-secondary` |
| Card / sheet surface | White stat cards, bottom-sheet background | `#FEFBF5` | `Colors.background.modal` | `bg-background-modal` |
| Muted card fill | "Total insumos / Margem bruta" summary block | `#F0F0F7` | `Colors.details.primary` | `bg-details-primary` |
| Primary text | Pet name, big card values | `#000000` | `Colors.label.primary` | `text-label-primary` |
| Text on dark buttons | Button labels on `#594236` | `#FFFFFF` | `Colors.label.secondary` | `text-label-secondary` |
| Secondary / muted text | Eyebrow labels ("IDADE", "PESO"), subtitles, location row | `#777777` | `Colors.label.tertiary` | `text-label-tertiary` |
| Link-style text on brand color | "Editar", "Cancelar", "+ Registrar" | `#594236` | `Colors.label.quartenery` | `text-label-quartenery` |
| Borders / dividers | Input outlines, list-row separators | `#D4D4D4` | `Colors.border.primary` | `border-border-primary` |
| Negative / destructive value | `– R$ 33.90` (Total insumos row) | `#D95743` | `Colors.alert.primary` | `text-alert-primary` |
| Completed-status badge fill | "Concluído" chip next to ASA badge | `#C2E6CB` | `Colors.details.finish` | `bg-details-finish` |
| Blocking state | Stock entry review: line with no linked item or whose total disagrees (border, notice, missing value), failed reading | `#D95743` | `Colors.alert.primary` | `border-alert-primary`, `text-alert-primary` |
| Attention state | Stock entry review: line to check (quantity or unit price missing), partial-reading banner, attention counter | `#FADE84` | `Colors.details.tertiary` | `bg-details-tertiary`, `border-details-tertiary` |
| End of useful life | Equipment card: progress bar fill and the "Fim da vida útil" badge (black text on the yellow fill), signalling replacement planning — an attention state, not a blocking one | `#FADE84` | `Colors.details.tertiary` | `bg-details-tertiary`, `text-label-primary` |

Since `Colors.background.primary` is a 3-stop gradient object (not a hex string), it's meant to be consumed via a `LinearGradient` component, not a plain Tailwind background class — check how `src/app/App.tsx` or existing screens already render it before adding a second implementation.

## 3. Typography

No custom font is loaded in the project (no `expo-font` usage found) — the design uses the platform default sans-serif, so implement with the OS default font, just varying size/weight, matching what the codebase already does.

Observed scale (screen → smallest label):

| Style | Size (approx.) | Weight | Case | Color | Used for |
| --- | --- | --- | --- | --- | --- |
| Screen title | ~24px | Bold | Normal | primary | Pet name ("Mel") |
| Section title | ~17–18px | Semibold/Bold | Normal | primary | "Orquiectomia", bottom-sheet titles |
| Eyebrow / field label | ~11px | Bold | UPPERCASE, letter-spaced | tertiary | "IDADE", "PESO", "MATERIAIS USADOS", "DESLOCAMENTO" |
| Card value (emphasis) | ~20–22px | Bold | Normal | primary | "3 anos", "R$ 620", "1.5h" |
| Body / paragraph | ~14px | Regular | Normal | primary/tertiary | Item names, subtitles ("1 un. × R$ 19.90") |
| Price (inline emphasis) | ~15–16px | Bold | Normal | primary | Line-item prices, "Margem bruta" value |
| Button label | ~15px | Semibold | Normal | secondary (white) | Pill button text |
| Link action | ~13–14px | Semibold | Normal | quartenery (brand brown) | "Editar" / "Cancelar" / "+ Registrar" |
| Badge | ~11px | Semibold | Normal | primary on muted chip | "ASA I" |

## 4. Spacing & shape

- **Screen padding:** ~16px horizontal, consistent across all sections.
- **Vertical rhythm:** ~12–16px gap between sections/cards.
- **Card radius:** large, ~16–20px (`rounded-2xl`) on every white card and the bottom sheet's top corners.
- **Pill buttons:** fully rounded (`rounded-full`) — every primary action button ("Confirmar", "+ Adicionar", "Novo insumo") and the icon-only FAB use this, never a small/medium radius.
- **Inputs:** ~12px radius (`rounded-xl`), 1px `border-border-primary`, no fill (transparent/white), placeholder in `label-placeholder`.
- **List rows:** no card border between items, just a 1px bottom divider (`border-border-primary`) inside a single card container — not one card per row.
- **Bottom sheet:** rounded top corners only, small centered drag-handle bar at the top, thin divider under the title, primary CTA pinned full-width at the bottom.

## 5. Component inventory

Cross-referenced against what already exists in [`src/app/components/ui`](./src/app/components/ui) so new work reuses instead of re-inventing:

| Component | Design behavior | Status in codebase |
| --- | --- | --- |
| **Button** (primary pill, `bg-button-primary`) | Full-width or content-width, rounded-full, optional leading icon (`+`, `✓`) | Exists — `button.tsx`; confirm a variant covers icon-leading pill style |
| **Icon button (circular)** | Back button, FAB (calculator icon) — circular, brand-brown fill, white icon | Exists (`icon.tsx` + `button.tsx` composition) — check a circular/icon-only variant is available |
| **Card / StatCard** | White rounded box, eyebrow label + big value, used standalone or in a 2-column grid | Implemented as `DetailStatCard` in `features/procedures/components` (feature-local — not moved to `app/components/ui` since only this screen uses it so far) |
| **Badge / Chip** | Small pill, muted background, bold small caps text (e.g. "ASA I") | Implemented as `AsaBadge` in `features/appointments/components`; the status chip ("Concluído"/"Cancelado") is inline in `AppointmentDetailScreen` rather than a shared primitive |
| **SectionHeader** | Eyebrow label (left) + trailing text-link action (right) — "MATERIAIS USADOS" / "+ Adicionar", "DESLOCAMENTO" / "Cancelar" | Still ad hoc per-section rows in `AppointmentDetailScreen`/`TravelSection` — worth extracting if a third screen needs the same pattern |
| **ListRow (dismissible)** | Title + subtitle on the left, price + small `×` remove button on the right, divider below | Implemented as `SupplyList` in `features/procedures/components` |
| **EmptyState (inline)** | Dashed/soft box, centered muted text ("Nenhum deslocamento registrado") | Exists — `empty-state.tsx` (icon + centered muted message), used by Materials, Clinics, Partners, stock entry and notifications; `TravelSection` (`features/procedures/components`) still has its own inline box. The icon is optional and `align="start"` drops the centering: a left-aligned message in `text-label-primary`, used by `PricingOnboarding` (`features/pricing/components`) for the hourly calculator's initial state — a white `rounded-2xl` card with "Preencha os campos para que os valores sejam calculados", no icon and no button, at the bottom where the result will go |
| **BottomSheet / Modal** | Drag handle, title, divider, scrollable list, pinned CTA — used for 3 of the 5 screen variants seen | Check if `@rn-primitives` already ships a sheet primitive before building one from scratch |
| **Search-select field (combobox)** | Eyebrow label above a regular `rounded-xl` input (the client field's Figma also puts a "Novo tomador" text link at its right). While the input has focus, an inline white `rounded-xl` list sits right under it (hairline dividers, the chosen row on `bg-details-primary`), or a one-line muted status ("Buscando…", the empty message, red on error). Typing only filters — case- and accent-insensitive, with `normalizeForSearch` from `shared/utils/search.ts` — and the value is the row picked, never the typed text. An optional add row (`Plus` icon + label, e.g. "Adicionar Categoria") comes last and, when nothing matches, takes the place of the empty message. The list closes 150 ms after blur so a tap on a row still lands. Screen readers get a combobox with its expanded state and the chosen row as selected | Exists — `search-select.tsx` (`SearchSelect`; the caller filters and passes the rows, the status and the texts). `ClientAutocomplete` (`features/clients/components`) adapts it to clients for `ProcedureFormSheet`, max 5 rows |
| **Text** | Central place for the typography scale above (title/eyebrow/body/price variants) | Exists (`text.tsx`) — extend its variants to cover "eyebrow" and "price" if not already there |

**Stock entry (US10) compositions**, in `features/stockEntry/components` until a second feature needs them: `FullScreenModal` (slide-in `Modal` over the background gradient), `ScreenHeader` (back chevron + title), `NoticeBanner` (alert / warning / info, with an optional pill action), `FormField` (eyebrow label + `rounded-xl` input; read-only without `onChangeText`), `MenuOption` (icon circle, title, caption, chevron), `CatalogOption` (list row with hairline divider), `AttentionCounter`, `ReviewLineCard`, `EntryCard` (a pending entry: title, meta, total, a status pill — yellow (`details-tertiary`) when ready, lavender (`details-primary`) while processing, red outline when failed, gray outline otherwise — and text-link actions) and `SaveStatusBar` (the draft's autosave state, with a retry link when it fails).

**Finance header (US18)**: `FinanceHeader` in `features/finance/components` — screen title on the left and a circular icon button (`size-9`, `rounded-full`, `bg-button-primary`, white 20px `CalculatorIcon`, the Figma "Icon / calculator" SVG as `app/components/ui/calculator-icon.tsx`) on the right that opens `CalculatorScreen` (`features/calculator`), a full-screen `Modal` with a circular back button, title and subtitle over the background gradient, and a scroll area where the hourly-rate blocks go. The first block is `FixedCostsCard` (`features/calculator/components`): a white `rounded-2xl` card with an eyebrow title, rows of label + bold value (the three automatic ones carry an 11px muted "automático · do app" caption), a hairline divider, the "Transporte / Veículo (R$/mês)" currency-masked input (saves on blur; error text and border in `alert-primary`) with a hint underneath, another divider and the bold backend total.

**Hourly-rate calculator (US19) compositions**, in `features/pricing/components`: `PricingSettingsForm` is the "Metas" card from the "Finanças – calculadora de horas" frame — a `rounded-2xl` `Card` with a section title and stacked `rounded-xl` numeric inputs. Unlike the default eyebrow, the Figma draws the section title and field labels in **black** (`text-label-primary`, semibold, uppercase, letter-spaced); a field's helper text sits right under it in muted `text-xs`. The frame has no save action, so a full-width pill "Salvar metas" closes the card.

**Equipment list (US15)**: the "Equipamentos" segment of Materiais, in `features/equipment/components` (the `MaterialsPage` translates and formats, the components only receive strings). `EquipmentList` is a `flex-1 gap-4` column: a `ScrollView` (`flex-1`, content `flex-grow gap-3`, same as the supplies list) and the pill "+ Adicionar equipamento" button (`h-[49px] w-full mb-[16px]`, `Plus` icon) pinned below it, which stays visible in every state. Inside the scroll: `DepreciationSummaryCard`, then one `EquipmentCard` per item. States: **loading** is a centered muted line ("Carregando equipamentos...") while there is nothing to show; **error** is the same `rounded-xl bg-destructive/10 px-4 py-3` notice as the supplies tab, text `text-sm text-destructive`, with a small pill `Button` (`size="sm"`, default brown variant) "Tentar novamente" under it; **empty** is `EmptyState` (`Wrench` icon) inviting the first registration, and the summary card is hidden. `DepreciationSummaryCard` is a `Card` (`gap-1 rounded-[14px]`) with an uppercase eyebrow (`text-xs font-semibold uppercase text-label-primary`, "DEPRECIAÇÃO TOTAL/MÊS"), the monthly total in `text-[28px] font-bold` and a `text-xs text-label-primary` line ("3 equipamentos · R$ 1.270/ano", singular for one item; the yearly total has no cents). `EquipmentCard` is a pressable `Card` (`gap-1 rounded-[14px]`, same as `MaterialCard`): name and the monthly depreciation share the title style (`text-sm font-semibold leading-[21px]`), the "/mês" unit sits right-aligned under the value in 11px muted, the subtitle ("Desde Mar 2022 · Valor atual R$ 4.604", `text-xs` muted) under the name, then a 4px progress bar (track `bg-border-primary`, fill `bg-label-primary`, width clamped to 0–100%) and the "46% da vida útil utilizada" caption (11px muted). When the backend flags `endOfLife`, the fill turns `bg-details-tertiary` and a `rounded-full bg-details-tertiary` badge with a 10px `TriangleAlert` and the "Fim da vida útil" text (11px, semibold, `text-label-primary`) appears at the right of the caption — the same yellow attention state as the stock entry review, since it asks for planning, not a blocked action.

**Equipment form sheet (US15)**: `EquipmentFormSheet` in `features/equipment/components`, one sheet with three modes, following the clinic detail flow (`ClinicDetailSheet`). "+ Adicionar equipamento" opens it in **create** (editable, title "Novo equipamento", only the "✓ Confirmar" button). A tap on a card opens it in **view**: the title is the equipment name (`text-xl font-bold text-label-primary`, wrapping on long names), the name is not a field, the other fields are filled and read-only, and the buttons are "Editar" (`Pencil`) and, below it, "Excluir" (`secondary` red variant, `Trash2`; rendered when the screen passes `onDelete`, and `MaterialsPage` does). "Editar" switches the same sheet to **edit** without closing or animating again: title "Editar equipamento", the name field comes back, all fields are editable with the current values, and the buttons are "Salvar" (`Check`) and, below it, "Cancelar" (`X`, the primary variant, the same look as a harmless cancel in `ConfirmSheet`). "Cancelar" drops the edits and goes back to view with the original values, without the API and without closing the sheet; it is disabled while saving. All the button icons are `size-5` placed before the label, like the clinic buttons. Saving an edit validates, sends the PATCH, refreshes the list and goes back to **view** with the sheet still open, showing the updated equipment from the new list (if it is gone from the list, the sheet closes); a failed save keeps the sheet in edit with the data and the message. Saving a new equipment closes the sheet. Closing the sheet in any mode drops the changes, and opening the same card again starts in view. **Excluir** never stacks two modals, because iOS does not show a second `Modal` while the first is on screen: "Excluir" in view closes the sheet and, only when the sheet reports it finished closing (`onClosed`, the end of its exit animation), opens the shared `ConfirmSheet` (title "Excluir equipamento?", a message with the equipment name saying it stops appearing in the list and in the total depreciation, a primary "Excluir" with `Trash2` and the default red "Cancelar"). "Cancelar" in the confirmation closes it and, once it finished closing, the same equipment reopens in view. Confirming keeps the confirmation open while the DELETE runs, with the button reading "Excluindo…" (a ref blocks a second call and cancelling is ignored meanwhile); on success the confirmation closes, the list and total refresh and the sheet does not reopen (if it was the last equipment the list shows its empty state with the add button); a 404 (already gone) counts as done; any other failure shows its message inside the confirmation, with the button back to "Excluir" to try again. The wording "Excluir" is provisional until it is aligned with the vehicles screen (US13); all the delete texts are under `equipment.delete.*` so they change in one place. It is the US9 item sheet pattern (backdrop `bg-background-shade`, `rounded-t-3xl bg-background-modal px-5 pb-8 pt-4`, handle, title and a `h-px bg-details-primary` divider) with the keyboard handling of `ProcedureFormSheet`: a `KeyboardAvoidingView` and a `ScrollView` with `keyboardShouldPersistTaps="handled"` for the fields, with the preview, error line and buttons pinned below it. Fields: form field labels follow the Figma and the `ProcedureFormSheet` (`text-xs font-semibold uppercase text-label-primary`), which is different from the card eyebrow label in the typography table above; they sit over `rounded-xl border bg-white px-4 py-3 text-[15px]` inputs (`border-details-primary`, `border-destructive` with a `text-xs text-destructive` message under it when invalid), in the order name, purchase value (currency mask, decimal keyboard), acquisition date (`DD/MM/AAAA` mask), notes (a single-line input like the others) and useful life (label without the unit, "Ex.: 5 anos" placeholder, with a `text-xs text-label-tertiary` hint under it). In **view** the inputs keep exactly the same look (no dimming, no error border, no placeholder, `editable={false}` so there is no cursor or keyboard), the useful life reads "10 anos" or, when the months are not a whole number of years, "18 meses", and the 10-year hint and the 18-month notice are not shown (the notice belongs to edit). Above the buttons, a discreet `text-xs text-label-tertiary` line shows the estimated monthly depreciation (only the value in semibold): recalculated as the person types in create and edit, and the equipment's current monthly value in view; a muted note says when the useful life already ended (R$ 0,00/mês).

When implementing, follow this repo's existing pattern: base primitives live in `src/app/components/ui` (shared, shadcn-style, using `cva` + `cn()`); feature-specific compositions (like a `finance`-specific `StatCard` row) live in `src/features/<feature>/components`.

## 6. Screen anatomy (top → bottom)

1. Back button (circular icon button) — top-left, floating over the gradient background.
2. Patient header: name (title) + species + ASA badge, inline.
3. Procedure name (subtitle).
4. Location + date row, small pin icon + muted text.
5. 2×2 grid of `StatCard`s: Idade, Peso, Valor do atendimento, Horário.
6. "Horas trabalhadas" card: label + "Editar" link, big value + secondary "Valor/hora" column.
7. `SectionHeader` "Materiais usados" + "+ Adicionar" action → list of `ListRow`s (name/qty/price, dismiss `×`).
8. `SectionHeader` "Deslocamento" + toggle action (`+ Registrar` ↔ `Cancelar`):
   - Collapsed/empty: `EmptyState` box.
   - Expanded: form (vehicle select input, distance input) + full-width "Confirmar" button.
9. Summary card (muted background): "Total insumos" (negative, alert color) + "Margem bruta" (bold, primary).
10. Floating action button (bottom-right, circular, calculator icon) — opens the quick-actions bottom sheet.

## 7. States / variants captured

The Figma frame contains 5 states of the same screen — useful as the acceptance criteria for implementing it:

1. **Default, travel form expanded** — "Deslocamento" section open with vehicle/distance inputs and "Confirmar".
2. **Default, no travel registered** — empty state box + "+ Registrar" link.
3. **Bottom sheet: "Adicionar equipamentos usados"** — plain checklist of equipment names (no visible quantity/price, just selection).
4. **Bottom sheet: quick actions** — two stacked full-width primary buttons, "+ Novo insumo" / "+ Novo equipamento", triggered from the FAB.
5. **Bottom sheet: "Adicionar insumo"** — list of materials with price per row, plus a "Quantidade" number input and "Confirmar".

## 8. Interaction conventions worth keeping consistent

- **Text-link actions instead of icon buttons** for reversible/secondary actions inline in a section header (`Editar`, `Cancelar`, `+ Registrar`, `+ Adicionar`) — always brand-brown (`label-quartenery`), never a separate button component.
- **Destructive remove = small `×` glyph**, not a trash icon, placed at the end of a list row.
- **Any "add" flow opens a bottom sheet**, never a full-screen navigation — consistent with this app having no stack navigator today (`src/app/App.tsx` currently only switches tabs), so a sheet/modal is the natural primitive to add rather than introducing new screens for CRUD-style flows.
- **Negative monetary values are red** (`alert-primary`), positive/neutral bold values are black (`label-primary`) — don't invent a second "success green". The same red marks a blocking state (a stock entry line that cannot go into stock as it is); a state that only needs checking is yellow (`details-tertiary`).
- **A review or detail that fills the screen** opens as a `Modal` with `animationType="slide"` and a back chevron (appointment detail, stock entry review), since there is no stack navigator. Adding or editing a record from inside it is still a bottom sheet.

## 9. Open questions for a follow-up pass

These need either designer input or a live Figma desktop session (`get_design_context` / `get_variable_defs`, which require an active selection in the Figma app and weren't reachable in this analysis):

- Exact corner radius values (currently estimated as `rounded-xl`/`rounded-2xl`/`rounded-full`).
- Card shadow/elevation spec (the screenshots suggest a very soft shadow, not currently defined anywhere in `theme/`).
- Selection/checked state visuals for the equipment checklist sheet (variant 3) — no selected item is shown in the captured frame.
- Whether "Badge"/eyebrow letter-spacing is a deliberate token or just visual default — affects whether it's worth adding a `tracking-*` token.
