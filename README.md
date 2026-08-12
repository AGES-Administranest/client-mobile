# client-mobile

Administranest mobile app, built with [React Native](https://reactnative.dev) (TypeScript).

- **Android** and **iOS**, via React Native CLI
- **Web**, via [react-native-web](https://necolas.github.io/react-native-web/) + webpack — runs the same app in the browser, like an emulator

## Table of contents

- [Requirements](#requirements)
- [Getting the code](#getting-the-code)
- [Installing dependencies](#installing-dependencies)
- [Running the app](#running-the-app)
  - [Web](#web-fastest-way-to-check-a-change)
  - [Android emulator](#android-emulator)
  - [iOS simulator](#ios-simulator-macos-only)
  - [Physical device](#physical-device)
- [Architecture](#architecture)
  - [Internationalization (i18n)](#internationalization-i18n)
- [Code style](#code-style)
- [CI](#ci)

## Requirements

| Tool                    | Version           | Needed for                         |
| ----------------------- | ----------------- | ---------------------------------- |
| Node.js                 | 22 LTS            | Everything                         |
| npm                     | bundled with Node | Installing dependencies            |
| Watchman                | latest            | Metro's file watcher (recommended) |
| Xcode + CocoaPods       | latest            | iOS simulator/device only          |
| Android Studio + JDK 17 | latest            | Android emulator/device only       |

### Node — use nvm

This repo pins its Node version in [`.nvmrc`](./.nvmrc). Don't install Node 22 globally by hand — use [nvm](https://github.com/nvm-sh/nvm) so the version matches the repo (and everyone else's) automatically:

```sh
# install nvm, if you don't have it yet
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# from inside the repo — installs & switches to the version in .nvmrc
nvm install
nvm use
```

`nvm use` (with no version) reads `.nvmrc` automatically whenever you're in this directory. Consider adding [automatic `nvm use` on `cd`](https://github.com/nvm-sh/nvm#calling-nvm-use-automatically-in-a-directory-with-a-nvmrc-file) to your shell config so you never have to think about it.

### Web

No extra setup — if you have Node, you can run the app in a browser. This is the fastest way to see a UI change without booting an emulator.

### Android

Follow the **React Native CLI Quickstart** for Android on the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) page (select "React Native CLI", your OS, and target OS "Android"). You'll end up with: Android Studio, an Android SDK, an Android Virtual Device (emulator), and `ANDROID_HOME` set.

### iOS (macOS only)

Same guide, target OS "iOS": Xcode (from the App Store), Xcode Command Line Tools, CocoaPods (via `bundle install`), and an iOS Simulator runtime.

## Getting the code

```sh
git clone https://github.com/AGES-Administranest/client-mobile.git
cd client-mobile
```

If you use SSH instead of HTTPS for GitHub:

```sh
git clone git@github.com:AGES-Administranest/client-mobile.git
```

## Installing dependencies

```sh
nvm use        # switch to the Node version this repo expects
npm install
```

## Running the app

Metro (React Native's bundler) needs to be running for Android/iOS. Start it in its own terminal and leave it running:

```sh
npm start
```

Then, in another terminal, pick a target:

### Web (fastest way to check a change)

```sh
npm run web
```

Opens a dev server at **http://localhost:8080** — open it in any browser. Hot reload is on, so edits show up without a manual refresh. This does _not_ need Metro running; it uses its own webpack dev server.

> Not every native module works on web (e.g. anything backed by a real native API with no browser equivalent). It's meant for quickly iterating on UI, not as a replacement for testing on Android/iOS.

To produce a static build (e.g. to preview it as a deployed site):

```sh
npm run web:build   # outputs to web-build/
```

Both commands run the [`webpack.config.js`](./webpack.config.js) at the repo root under the hood (`npm run web` runs `webpack serve`, `npm run web:build` runs `webpack build`) — that's where the dev server port, aliasing of `react-native` to `react-native-web`, and the `web-build/` output path are configured, so check there first if the web build ever needs tweaking.

### Android emulator

1. Open Android Studio → Device Manager → start a virtual device (or plug in a physical device with USB debugging on).
2. With Metro running:
   ```sh
   npm run android
   ```

### iOS simulator (macOS only)

1. First run only (and whenever native iOS deps change):
   ```sh
   bundle install
   bundle exec pod install
   ```
2. With Metro running:
   ```sh
   npm run ios
   ```
   This boots the default simulator and installs the app. To pick a specific device, open `ios/ClientMobile.xcworkspace` in Xcode and hit Run, or pass `--simulator "iPhone 16"` to the command above.

### Physical device

Follow the "Physical Device" tab in the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide for your target OS — it covers enabling developer mode / USB debugging and signing for iOS.

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
    i18n/                 # Translation dictionaries + the `t()` hook
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

### Internationalization (i18n)

Strings live in JSON dictionaries under [`src/shared/i18n/locales`](./src/shared/i18n/locales) — one file per locale (`pt-BR.json`, `en-US.json`), with `pt-BR.json` as the source of truth for which keys exist. There's no external i18n library; it's a small custom setup:

- **`I18nProvider`** wraps the app (in `App.tsx`) and holds the current locale, defaulting to `pt-BR`.
- **`useTranslation()`** gives you `t(key, params?)` and `setLocale(locale)`:

  ```tsx
  import { useTranslation } from 'shared/i18n';

  function Example() {
    const { t, setLocale } = useTranslation();
    return <Text>{t('home.title')}</Text>;
  }
  ```

- **Keys are dot-paths into the JSON** (`"home": { "title": "..." }` → `t('home.title')`), and are type-checked against `pt-BR.json` — a typo or a key that doesn't exist is a TypeScript error, not a runtime surprise.
- **Params** are interpolated with `{{name}}` placeholders: a dictionary value of `"Hello, {{name}}"` is filled in via `t('key', { name: 'Ana' })`.
- **Missing translations** render the key itself instead of blank text, so a gap in a locale file is obvious in the UI.

Adding a language means adding a new JSON file with the same keys as `pt-BR.json` and registering it in `src/shared/i18n/locales/index.ts`.

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
