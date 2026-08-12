---
name: repo-review
description: Full repository review for client-mobile — build, lint, architecture rules, and a functional smoke test. Use when asked to review the repo, review a branch/PR end to end, or sanity-check the project before a release. Produces an HTML summary artifact.
---

# client-mobile repo review

A complete health check of this repository: build, lint/format, the architecture rules
documented in `README.md`, and a functional smoke test of the running app. Ends with an
HTML summary published via the Artifact tool — the point of this skill is a report someone
can glance at, not a wall of terminal output.

Run every section below. Don't skip the functional test because "the diff looked safe" —
that's exactly the kind of change a static check misses.

## 0. Setup

```sh
nvm use          # or: source "$HOME/.nvm/nvm.sh" && nvm use
npm install
```

Note the current branch and the commit SHA (`git rev-parse --short HEAD`) — both go in the
report header.

## 1. Build & lint checks

Run each of these independently and capture pass/fail + the actual output (truncate long
output, but keep the first real error):

```sh
npm run lint            # eslint
npm run format:check    # prettier --check
npx tsc --noEmit        # typecheck
npx jest                # unit tests
```

Also do a real bundle build, the same way CI does — a green `tsc` doesn't guarantee Metro
can actually bundle the app:

```sh
npx react-native bundle --platform android --dev false --entry-file index.js \
  --bundle-output /tmp/repo-review-bundle/index.android.bundle \
  --assets-dest /tmp/repo-review-bundle/res
rm -rf /tmp/repo-review-bundle
```

If `npm run web:build` is present in `package.json`, run that too — it exercises the
webpack config independently of Metro and tends to catch different breakage (e.g. an import
that only resolves through Metro's resolver, not webpack's).

## 2. Architecture verification

This repo follows the feature-based structure with a thin domain layer documented in the
"Architecture" section of `README.md`. ESLint enforces the two hard rules mechanically
(cross-feature deep imports, domain purity) — `npm run lint` failing means one of those was
violated. But lint can't see everything; read through `src/` and check by hand:

- **Folder placement makes sense.** Business logic sits in `domain/`, not leaked into
  `screens/` or `hooks/`. Data/IO sits in `services/`, not inline in a screen.
- **Every feature under `src/features/*` has an `index.ts`** that's actually its public
  surface (exports what other code needs, nothing internal leaking out beyond that).
- **No new top-level folders invented outside `app/`, `features/`, `shared/`** without a
  reason — if you find one, flag it rather than silently accepting it.
- **`shared/` additions are genuinely shared** (used by 2+ features) — a single-feature
  concern that got moved to `shared/` "just in case" is a rule violation even though ESLint
  won't catch it.
- **No relative reach-arounds that dodge the alias convention.** If you see `../../../` in
  an import where `features/*`/`shared/*`/`app/*` should have been used, that's worth a
  finding even if it technically doesn't cross a feature boundary.

Re-read the "Dependency rules" and "Path aliases" subsections of `README.md` before this
pass in case they've been updated since this skill was written — the README is the source
of truth, this list is a summary of it.

## 3. Functional smoke test

Static checks don't prove the app renders. Actually run it:

1. Start the web dev server in the background: `npm run web` (default port 8080; check
   `webpack.config.js` if it's been changed).
2. Load `claude-in-chrome` and open `http://localhost:8080` in a tab.
3. Take a screenshot. The app must render real content (not a blank white page, not a red
   error overlay).
4. Read the browser console (`read_console_messages`, `onlyErrors: true`) — zero errors is
   the bar. A warning is worth noting but not a failure.
5. If the change under review touches a specific screen/flow, exercise it manually
   (navigate, tap, type) rather than only checking the home screen loads.
6. Kill the dev server (`pkill -f "webpack serve"`) when done.

If Android/iOS tooling is available in this environment (an emulator or simulator already
running), prefer running the real target instead of only web — web is the fast fallback,
not a substitute when a native-only code path is what's being reviewed.

## 4. Report

Build one HTML report and publish it with the Artifact tool (`favicon: "🔍"`). Structure:

- **Header**: branch name, commit SHA, timestamp.
- **Summary strip**: one badge per check (Lint / Format / Typecheck / Tests / Build /
  Architecture / Functional) — pass/fail/warn at a glance, most-severe first if anything
  failed.
- **Build & lint**: each command run, its result, and the first real error line for any
  failure (not the full raw log).
- **Architecture**: the checklist from §2 with a verdict per item, and a short note on
  anything that needed a judgment call.
- **Functional test**: the screenshot, console error count, and what was exercised.
- **Verdict**: one paragraph — is this repo/branch in a mergeable state, and if not, the
  ordered list of what has to be fixed first.

Load the `artifact-design` skill before writing the HTML so the report doesn't come out
looking like an unstyled dump — this is meant to be something a reviewer actually wants to
open.
