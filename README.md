# client-mobile

Administranest mobile app, built with [Expo](https://expo.dev) ([React Native](https://reactnative.dev), TypeScript) — managed workflow.

- **Android**, **iOS**, and **Web** all run from the same codebase and the same dev server, via Expo/Metro — no separate bundler for web, no native `android/`/`ios/` folders to keep in sync (Expo generates them on demand).

## Table of contents

- [Requirements](#requirements)
- [Getting the code](#getting-the-code)
- [Installing dependencies](#installing-dependencies)
- [Running the app](#running-the-app)
  - [Web](#web-fastest-way-to-check-a-change)
  - [Physical device via Expo Go](#physical-device-via-expo-go)
  - [Android emulator / native build](#android-emulator--native-build)
  - [iOS simulator / native build](#ios-simulator--native-build-macos-only)
- [Architecture](#architecture)
  - [Local notifications](#local-notifications)
  - [Internationalization (i18n)](#internationalization-i18n)
- [Code style](#code-style)
- [CI](#ci)

## Requirements

| Tool                    | Version           | Needed for                                                          |
| ----------------------- | ----------------- | ------------------------------------------------------------------- |
| Node.js                 | 22 LTS            | Everything                                                          |
| npm                     | bundled with Node | Installing dependencies                                             |
| Watchman                | latest            | Metro's file watcher (recommended)                                  |
| **Expo Go** app         | latest            | Fastest way to run on a physical device — no native setup at all    |
| Xcode + CocoaPods       | latest            | iOS simulator, or a native build (`expo run:ios`) — optional        |
| Android Studio + JDK 17 | latest            | Android emulator, or a native build (`expo run:android`) — optional |

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

No extra setup — if you have Node, you can run the app in a browser. This is the fastest way to see a UI change without booting an emulator or installing anything mobile-specific.

### Physical device (fastest for Android/iOS, no SDK needed)

Install [Expo Go](https://expo.dev/go) from the App Store / Play Store. `npm start` prints a QR code — scan it with Expo Go (Android: in-app scanner; iOS: the system Camera app) and the app opens on your phone, hot reload included. No Android Studio, no Xcode, no native build.

### Android emulator or native build (optional)

Only needed if you want an emulator, or a real native build via `expo run:android` (e.g. to test a native module Expo Go doesn't include). Follow the **React Native CLI Quickstart** for Android on the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) page (select "React Native CLI", your OS, target OS "Android") — Android Studio, an SDK, a Virtual Device, `ANDROID_HOME`.

### iOS simulator or native build (optional, macOS only)

Same guide, target OS "iOS": Xcode (App Store), Command Line Tools, CocoaPods (`bundle install`), and a Simulator runtime — only needed for `expo run:ios` or the iOS Simulator.

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

```sh
npm start
```

Starts the Expo dev server and an interactive terminal. From there, press:

- **`w`** — open in the browser (web)
- **`a`** — open on a connected Android emulator/device
- **`i`** — open in the iOS Simulator (macOS only)
- Or scan the QR code it prints with the **Expo Go** app on your phone — no emulator, no native build

Every target shares the same Metro server and gets hot reload. You can also jump straight to
one target without the interactive menu:

### Web (fastest way to check a change)

```sh
npm run web
```

Opens at **http://localhost:8081** in your browser.

> Not every native module works on web (e.g. anything backed by a real native API with no browser equivalent). It's meant for quickly iterating on UI, not as a replacement for testing on Android/iOS.

To produce a static build (e.g. to preview it as a deployed site):

```sh
npm run web:build   # outputs to dist/
```

Both commands go through Expo's Metro web bundler — see the `web` key in [`app.json`](./app.json) for its config.

### Physical device via Expo Go

The fastest way to see the app on a real phone with zero native setup:

1. Install **Expo Go** on your device ([App Store](https://apps.apple.com/app/expo-go/id982107779) / [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)).
2. `npm start`, then scan the QR code (iOS: Camera app; Android: the scanner inside Expo Go).

> Expo Go can't run custom native modules that aren't part of the Expo SDK. If the app ever needs one, use a native build (below) instead — Expo will tell you when that's the case.

### Android emulator / native build

1. Open Android Studio → Device Manager → start a virtual device (or plug in a physical device with USB debugging on).
2. ```sh
   npm run android
   ```
   First run generates the native `android/` project (via `expo prebuild`, automatic) and installs the app — slower than Expo Go, but produces a real native build.

### iOS simulator / native build (macOS only)

1. ```sh
   npm run ios
   ```
   First run generates the native `ios/` project (via `expo prebuild`, automatic), runs `pod install`, and boots the default simulator. To pick a specific device, pass `--simulator "iPhone 16"`.

Generated `android/`/`ios/` folders aren't committed (see `.gitignore`) — delete and re-run either command any time to regenerate them cleanly from `app.json`.

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

**`src/features/home`** uses every subfolder and is meant as a living reference for the pattern — the `feature-dev`, `feature-mentor`, and `repo-review` skills all point here rather than hardcoding a feature name. If `home` is ever removed or simplified, update this section to point at whichever feature best demonstrates the full pattern next, so those skills keep working without edits:

- `domain/getGreetingPeriod.ts` — a pure function (plus its unit test) with no framework dependency.
- `services/currentUserService.ts` — the data layer, stubbed until there's a real endpoint.
- `hooks/useHomeScreen.ts` — wires the domain rule and the service call together for the screen.
- `components/AppTitle.tsx`, `components/GreetingCard.tsx` — presentational components, feature-local, receiving already-translated strings as props.
- `screens/HomeScreen.tsx` — composes the components and hook; the only place that touches `useTranslation`.

### Dependency rules

These rules exist so both humans and AI agents can review a diff quickly: **if an import breaks one of these, it's very likely wrong.** They're enforced by ESLint (`no-restricted-imports`), not just documented — `npm run lint` will fail on a violation.

1. **Features are only imported through their public API.** From outside a feature, import `features/<name>` (its `index.ts`), never `features/<name>/screens/...` or any other internal path.
2. **`domain/` is framework-free.** No `react` or `react-native` imports, and no importing from `screens/`, `components/`, `hooks/`, or `services/` — dependencies point inward, toward the domain, not out from it. `domain/` should be plain, unit-testable TypeScript.
3. **Direction of control:** `screens` → `hooks` → `domain`/`services`. Screens orchestrate; business rules live in `domain`; I/O lives in `services`.
4. **Shared code only goes in `shared/`** once it's used by two or more features — don't preemptively generalize a feature-specific thing.

### Path aliases

Imports use `app/*`, `features/*`, and `shared/*` instead of relative `../../..` paths (configured via `babel-plugin-module-resolver` and `tsconfig.json` `paths`). This is also what makes the "public API only" rule easy to lint: a deep cross-feature import is visually obvious (`features/other/screens/...`) instead of hiding behind `../../other/screens/...`.

### Local notifications

Local (on-device) notifications go through [`expo-notifications`](https://docs.expo.dev/versions/latest/sdk/notifications/), wrapped by `src/shared/services/notifications.ts` — `initNotifications()` (called once in `App.tsx`, creates the Android channel), `requestNotificationPermission()`, `scheduleNotification()` and `cancelNotification()`. Features should use that wrapper, not import `expo-notifications` directly.

- **Permission** is required on iOS and on Android 13+; `scheduleNotification()` asks for it on demand, so nothing prompts the user on app start.
- **Web** has no implementation — every function is a no-op there, so the web target keeps building.
- **Testing:** iOS works in Expo Go. On Android, `expo-notifications` is limited in Expo Go since SDK 53 — use a native/dev build (`npm run android`).

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

GitHub Actions runs on every PR, regardless of target branch:

- **Lint** — `eslint` + `prettier --check`
- **Build** — TypeScript typecheck + Android JS bundle
- **Test** — `jest`
- **PR title** — must follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `style:`, `test:`, `perf:`, `build:`, `ci:`, `revert:`), since the PR title becomes the squash-merge commit message.

`CODEOWNERS` requires review from `@AGES-Administranest/code-reviewers` on every PR.
