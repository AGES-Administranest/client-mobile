# client-mobile

Administranest mobile app, built with [React Native](https://reactnative.dev) (TypeScript).

## Requirements

- Node 22 LTS (run `nvm use`, respects `.nvmrc`)
- Environment set up per the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide

## Getting started

### 1. Install dependencies

```sh
npm install
```

### 2. Start Metro

```sh
npm start
```

### 3. Run the app

With Metro running, in another terminal:

```sh
# Android
npm run android

# iOS (install pods first)
bundle install
bundle exec pod install
npm run ios
```

## Architecture

The app follows a **feature-based structure with a thin domain layer** — enough separation to keep business logic testable and decoupled from React Native, without the ceremony of full DDD (aggregates, value objects, bounded contexts), which is more than a mobile client like this needs.

```
src/
  app/                  # App shell: root component, providers, navigation
    App.tsx
  features/
    <feature>/
      screens/          # Screen-level components (route targets)
      components/       # Components used only within this feature
      hooks/             # React hooks: UI state, wiring screens to domain/services
      domain/            # Business logic: framework-free TypeScript (use cases, rules)
      services/           # Data layer: API clients, repositories, persistence
      index.ts            # Public API — the ONLY entry point other features may import
  shared/
    components/          # UI components shared by 2+ features
    hooks/                # Shared hooks
    services/             # Shared infra (http client, storage, etc.)
    theme/                # Design tokens, colors, typography
    utils/                # Framework-free helper functions
```

A feature only needs the subfolders it actually uses — don't create empty `domain/`/`services/` just to follow the template.

### Dependency rules

These rules exist so both humans and AI agents can review a diff quickly: **if an import breaks one of these, it's very likely wrong.** They're enforced by ESLint (`no-restricted-imports`), not just documented — `npm run lint` will fail on a violation.

1. **Features are only imported through their public API.** From outside a feature, import `features/<name>` (its `index.ts`), never `features/<name>/screens/...` or any other internal path.
2. **`domain/` is framework-free.** No `react` or `react-native` imports, and no importing from `screens/`, `components/`, `hooks/`, or `services/` — dependencies point inward, toward the domain, not out from it. `domain/` should be plain, unit-testable TypeScript.
3. **Direction of control:** `screens` → `hooks` → `domain`/`services`. Screens orchestrate; business rules live in `domain`; I/O lives in `services`.
4. **Shared code only goes in `shared/`** once it's used by two or more features — don't preemptively generalize a feature-specific thing.

### Path aliases

Imports use `app/*`, `features/*`, and `shared/*` instead of relative `../../..` paths (configured via `babel-plugin-module-resolver` and `tsconfig.json` `paths`). This is also what makes the "public API only" rule easy to lint: a deep cross-feature import is visually obvious (`features/other/screens/...`) instead of hiding behind `../../other/screens/...`.

## Code style

- **Formatting** is handled by Prettier (`npm run format` / `npm run format:check`) — not up for debate in review.
- **Linting** is ESLint (`npm run lint`), which also enforces:
  - `camelCase` for variables/functions (`PascalCase` for types and components), via `@typescript-eslint/naming-convention`.
  - Import order: external packages → internal aliases (`app/*`, `features/*`, `shared/*`) → relative imports, via `import/order`.
  - The architectural boundaries described above.

Run both before opening a PR:

```sh
npm run lint
npm run format:check
```

## CI

GitHub Actions runs on every PR/push to `dev` and `production`:

- **Lint** — `eslint` + `prettier --check`
- **Build** — TypeScript typecheck + Android JS bundle
- **PR title** — must follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `style:`, `test:`, `perf:`, `build:`, `ci:`, `revert:`), since the PR title becomes the squash-merge commit message.

`CODEOWNERS` requires review from `@AGES-Administranest/code-reviewers` on every PR.
