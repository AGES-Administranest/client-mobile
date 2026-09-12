# CLAUDE.md

Guidance for Claude Code (or any contributor) working in this repository. This file documents conventions that are **already established** in the codebase — it doesn't introduce new rules, it makes the existing ones explicit so new code stays consistent without re-deriving them from scratch each time.

For the full setup/run instructions, see [README.md](./README.md). This file is about *how to write code and UI here*, not how to install or run the app.

## Architecture

Feature-based structure with a thin domain layer:

```
src/
  app/                  # App shell: root component, providers, shared UI primitives
    components/ui/      # Design-system primitives (shadcn-style, NativeWind)
  features/
    <feature>/
      screens/          # Screen-level components (route targets)
      components/       # Components used only within this feature
      hooks/             # UI state, wiring screens to domain/services
      domain/            # Business logic: framework-free TypeScript
      services/           # Data layer: API clients, repositories
      index.ts            # Public API — the ONLY entry point other features may import
  shared/
    components/          # UI components shared by 2+ features
    hooks/                # Shared hooks
    i18n/                 # Translation dictionaries + the t() hook
    services/             # Shared infra (http client, storage, etc.)
    theme/                # Design tokens: colors, gradients
    utils/                # Framework-free helper functions
```

A feature only gets the subfolders it actually uses — don't scaffold empty `domain/`/`services/` just to match the template. **`src/features/home`** is the living reference implementation; when unsure how a layer should look, read it first.

### Dependency rules (enforced by ESLint, not just convention)

`npm run lint` fails on any of these — treat a violation as a bug in the diff, not a lint nag to silence:

1. **Cross-feature imports go through `index.ts` only.** `features/other` is fine; `features/other/screens/...` is not.
2. **`domain/` is framework-free.** No `react`/`react-native` imports, and no importing `screens/`, `components/`, `hooks/`, or `services/` from within the same feature — dependencies point inward.
3. **Direction of control:** `screens` → `hooks` → `domain`/`services`. Screens orchestrate; business rules live in `domain`; I/O lives in `services`.
4. **Shared code only moves to `shared/`** once 2+ features actually need it — don't generalize preemptively.

### Path aliases

Use `app/*`, `features/*`, `shared/*` — never relative `../../..` climbs across those boundaries. This is what makes rule 1 above visible at a glance in a diff.

## Code style

- **Function components only**, props typed with `type XxxProps = {...}` (not `interface`).
- **Naming:** `camelCase`/`UPPER_CASE`/`PascalCase` for variables (enforced), `PascalCase` for types and components. Files: `PascalCase.tsx` for components/screens, `camelCase.ts` for hooks/services/domain, `kebab-case.tsx` for `app/components/ui` primitives (shadcn convention).
- **Imports** ordered as: external packages → internal aliases (`app/*`, `features/*`, `shared/*`) → relative — enforced by `import/order`, alphabetized, blank line between groups. Don't hand-order these; let `npm run lint -- --fix` or your editor do it.
- **Formatting** is Prettier, not up for debate: single quotes, trailing commas, `arrowParens: avoid`. Run `npm run format` before committing; CI checks `npm run format:check`.
- **Screens are the only place that calls `useTranslation()`.** Everything under `components/` is presentational — it receives already-translated strings and already-computed values as props, no i18n/domain/service calls inside.
- **Hooks return a typed state object** (e.g. `HomeScreenState`) and own the loading/error lifecycle, including cleanup (`isMounted` guard) for async work in `useEffect`.
- **Custom services stub realistically** when there's no backend yet (`Promise.resolve(...)` with a comment marking it as a stand-in) rather than leaving a feature unimplementable — see `features/home/services/currentUserService.ts`.
- **i18n:** every user-facing string goes through `t('key')`, key defined in `src/shared/i18n/locales/pt-BR.json` first (source of truth) and mirrored in other locale files. Never hardcode visible text in a component.
- **No comments explaining *what* the code does** — names should do that. A comment is only for a non-obvious *why* (a workaround, an intentional security trade-off, a subtle invariant) — see `toAuthErrorCode`'s comments in `features/auth` for the bar to meet.

## Visual / UI development — always follow DESIGN.md

**[DESIGN.md](./DESIGN.md) is the source of truth for anything visual** in this app: colors, typography scale, spacing/radius, component inventory, and screen-composition patterns, all reverse-engineered from the team's Figma file. Before writing or reviewing any UI code:

1. **Don't invent colors.** Every color role needed should already map to a token in `src/theme/colors.ts` (and its NativeWind class in `global.css`/`tailwind.config.js`) — DESIGN.md has the mapping table. If a design genuinely needs a color with no existing token, that's a signal to pause and confirm with the design file rather than eyeballing a hex value.
2. **Reuse before creating.** Check `src/app/components/ui` for an existing primitive (Button, Card, Text, Icon, etc.) before writing a new one. DESIGN.md's component inventory lists what exists, what's missing (e.g. `Badge`, `SectionHeader`, dismissible `ListRow`, `EmptyState`, `BottomSheet`), and where a new primitive belongs (`app/components/ui` if it's generic/shared, `features/<feature>/components` if it's feature-specific).
3. **Match the established patterns**, not just the pixels of one screen: pill-shaped (`rounded-full`) primary buttons, `rounded-2xl` cards, text-link actions (not icon buttons) for inline secondary actions like "Editar"/"Cancelar", bottom sheets instead of new full-screen routes for add/edit flows, red (`alert-primary`) reserved for negative monetary values only.
4. **Update DESIGN.md when the design system evolves.** If a new Figma screen introduces a genuinely new pattern (a new component shape, a new color role), extend DESIGN.md's tables in the same PR — it should stay in sync with what's actually implemented, not drift into a one-time snapshot.

## Testing

- **Jest** (`jest-expo` preset) + `react-test-renderer`.
- Two co-existing test locations: colocated (`x.test.ts` next to the file, common for `domain/`) and mirrored under `src/tests/` (common for UI components). Follow whichever pattern the file you're touching already uses.
- Test real behavior, not implementation details: domain tests use `it.each` to cover edge cases/boundaries (see `getGreetingPeriod.test.ts`), not just the happy path.

## Before opening a PR

```bash
npm run lint
npm run format:check
npm test
```

PR titles must follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `style:`, `test:`, `perf:`, `build:`, `ci:`) — the title becomes the squash-merge commit message, and CI checks it.
