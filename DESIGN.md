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
| **Card / StatCard** | White rounded box, eyebrow label + big value, used standalone or in a 2-column grid | `card.tsx` exists as a generic surface; a `StatCard` (label + value composition) is **not yet a shared component** — worth extracting since this pattern (Idade/Peso/Valor/Horário) repeats 4×+ per screen |
| **Badge / Chip** | Small pill, muted background, bold small caps text (e.g. "ASA I") | **Not present yet** — new primitive needed |
| **SectionHeader** | Eyebrow label (left) + trailing text-link action (right) — "MATERIAIS USADOS" / "+ Adicionar", "DESLOCAMENTO" / "Cancelar" | **Not present yet** — recurring pattern, worth its own component instead of ad hoc rows |
| **ListRow (dismissible)** | Title + subtitle on the left, price + small `×` remove button on the right, divider below | **Not present yet** |
| **EmptyState (inline)** | Dashed/soft box, centered muted text ("Nenhum deslocamento registrado") | **Not present yet** |
| **BottomSheet / Modal** | Drag handle, title, divider, scrollable list, pinned CTA — used for 3 of the 5 screen variants seen | Check if `@rn-primitives` already ships a sheet primitive before building one from scratch |
| **Text** | Central place for the typography scale above (title/eyebrow/body/price variants) | Exists (`text.tsx`) — extend its variants to cover "eyebrow" and "price" if not already there |

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
- **Negative monetary values are red** (`alert-primary`), positive/neutral bold values are black (`label-primary`) — don't invent a second "success green".

## 9. Open questions for a follow-up pass

These need either designer input or a live Figma desktop session (`get_design_context` / `get_variable_defs`, which require an active selection in the Figma app and weren't reachable in this analysis):

- Exact corner radius values (currently estimated as `rounded-xl`/`rounded-2xl`/`rounded-full`).
- Card shadow/elevation spec (the screenshots suggest a very soft shadow, not currently defined anywhere in `theme/`).
- Selection/checked state visuals for the equipment checklist sheet (variant 3) — no selected item is shown in the captured frame.
- Whether "Badge"/eyebrow letter-spacing is a deliberate token or just visual default — affects whether it's worth adding a `tracking-*` token.
