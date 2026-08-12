---
name: feature-dev
description: Build a feature end-to-end following client-mobile's feature-based architecture — scaffold only the layers actually needed, wire i18n correctly, write tests that check real behavior, and don't call it done until lint/format/typecheck/tests/functional smoke all pass. Use when asked to implement or add a feature, screen, or flow in client-mobile.
---

# Building a feature in client-mobile

This is the "just build it, correctly" path. If the person asking wants to be walked
through the *why* of each decision instead of getting a finished implementation, use the
`feature-mentor` skill instead — same architecture, different mode.

The README's Architecture section names a current reference feature under `src/features/` —
a real feature kept as a living example of the pattern. Read it there rather than assuming
which one it is here; that reference changes as the codebase evolves, and the README is
kept in sync with it, this skill isn't. When in doubt about shape or naming, look at how
that feature actually does it before inventing a new convention.

## 0. Scope it before touching files

If the request is ambiguous about what the feature actually does (what triggers it, what
data it needs, what "done" looks like), ask one round of concise clarifying questions before
writing anything. Don't guess at requirements and build the wrong thing efficiently.

Create a branch off `dev` named for what's changing (`feat/<slug>`, `fix/<slug>`, etc. — the
prefix matters, since PR titles must follow Conventional Commits per the CI's PR Lint check).

## 1. Decide which layers you actually need

A feature only gets the subfolders it uses — don't scaffold empty `domain/`/`services/` to
"follow the template." For each piece of the feature, place it by asking what it *is*, not
by habit:

- **Pure decision, calculation, or validation logic** (no I/O, no React) → `domain/`.
- **Talks to an API, storage, or any external system** → `services/`. No real backend yet?
  Stub it with a realistic async signature — check the reference feature's `services/` for
  how this repo currently does that — so it's a one-line swap later, not a fake shape that
  won't match the real thing.
- **Owns loading/error state, wires domain + services together for a screen** → `hooks/`.
- **Presentational, takes already-computed and already-translated props, no direct calls to
  services/domain/i18n** → `components/`, and only if it's feature-local. Something used by
  2+ features belongs in `shared/` — but only once it's *actually* reused, not preemptively.
- **The route target that composes hook + components** → `screens/`. This is the only place
  that should call `useTranslation` directly, matching the reference feature's pattern.

Export only what other features need from `index.ts`. Everything else stays unexported —
that file *is* the feature's contract with the rest of the app.

## 2. Domain first, and give it real tests

Write the business rule as a plain, framework-free TypeScript function before writing any UI
around it — no `react`/`react-native` imports, no reaching into `screens/`, `components/`,
`hooks/`, or `services/` (ESLint enforces this, but write it clean the first time).

Every non-trivial domain function gets a unit test that covers its actual edge cases and
boundaries — not a single happy-path assertion. The reference feature's domain tests are the
pattern to follow: one case per boundary the function actually branches on.

## 3. i18n — every user-facing string goes through `t()`

No hardcoded strings in a component or screen. Add the key to
`src/shared/i18n/locales/pt-BR.json` (the source of truth) and mirror it in every other
locale file — nothing enforces that automatically, so check it yourself:

```sh
node -e "
const flatten = (obj, prefix = '') => Object.entries(obj).flatMap(([k, v]) =>
  typeof v === 'string' ? [prefix + k] : flatten(v, prefix + k + '.'));
const fs = require('fs');
const dir = 'src/shared/i18n/locales';
const source = 'pt-BR.json';
const sourceKeys = new Set(flatten(require('./' + dir + '/' + source)));
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== source)) {
  const keys = new Set(flatten(require('./' + dir + '/' + f)));
  const missing = [...sourceKeys].filter(k => !keys.has(k));
  const extra = [...keys].filter(k => !sourceKeys.has(k));
  console.log(f, '— missing:', missing, '| extra:', extra);
}
"
```

Both lists must be empty. Use `{{param}}` interpolation for dynamic values instead of string
concatenation, and pass matching param names in the `t()` call's second argument.

## 4. Wire it in

Compose the pieces in the screen, and connect the screen wherever it needs to be reachable
(navigation, `App.tsx`, or the parent feature that renders it) — a feature that isn't wired
into anything isn't done, even if every file in it is correct.

## 5. Validate — all of this, not a subset

```sh
npm run lint
npm run format:check
npx tsc --noEmit
npx jest
```

All four must pass clean. Then prove it actually runs:

1. `npm run web`, open `http://localhost:8080` in `claude-in-chrome`.
2. Exercise the actual flow you built — not just "the home screen still loads." Navigate to
   it, interact with it, trigger the states that matter (loading, error, the real happy
   path).
3. Read the console (`read_console_messages`, `onlyErrors: true`) — zero errors.
4. Kill the dev server when done.

A green `tsc` is not proof the feature works. Don't report the feature as finished without
having watched it render and behave correctly.

## 6. Ship it

Commit with a Conventional Commits message, push, and open a PR against `dev` (or whatever
base the rest of the current work is stacked on). Summarize in the PR description which
layers were touched and which checks were run — the same shape as the `repo-review` skill's
report, just written by the person who built it instead of a separate reviewer.
