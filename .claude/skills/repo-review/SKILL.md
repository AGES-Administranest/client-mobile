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
npx expo export --platform android --output-dir /tmp/repo-review-bundle
rm -rf /tmp/repo-review-bundle
```

Run `npm run web:build` too — it's the same Metro web bundler `npm run web` uses, but
production mode tends to surface different breakage than the dev server does (minification,
tree-shaking, `NODE_ENV`-gated code paths).

## 2. Architecture verification

This repo follows the feature-based structure with a thin domain layer documented in the
"Architecture" section of `README.md`. ESLint enforces the two hard rules mechanically
(cross-feature deep imports, domain purity) — `npm run lint` failing means one of those was
violated. But lint can't see everything; read through `src/` and check by hand.

Don't just eyeball this — run it and capture the actual output in the report, so "the
architecture is correct" is a checked fact, not an impression:

```sh
# every feature must expose a public index.ts
for d in src/features/*/; do
  [ -f "${d}index.ts" ] || echo "MISSING index.ts: $d"
done

# only the documented subfolders belong inside a feature
for d in src/features/*/*/; do
  base=$(basename "$d")
  case "$base" in
    screens|components|hooks|domain|services) ;;
    *) echo "UNEXPECTED FOLDER: $d" ;;
  esac
done

# only app/, features/, shared/ belong at the top of src/
for d in src/*/; do
  base=$(basename "$d")
  case "$base" in
    app|features|shared) ;;
    *) echo "UNEXPECTED TOP-LEVEL FOLDER: $d" ;;
  esac
done

# no relative reach-arounds dodging the app/*, features/*, shared/* aliases
grep -rn "from '\.\./\.\./\.\." src/ || echo "no alias reach-arounds"

# domain/ must stay framework-free
grep -rln "from 'react" src/features/*/domain/ 2>/dev/null || echo "domain/ is framework-free"
```

Any non-empty output from the "MISSING" / "UNEXPECTED" / reach-around / framework checks is
a finding — quote it in the report rather than summarizing it away. A clean run of all five
is what "Architecture: Pass" in the summary strip is backed by.

Beyond what those commands catch, still read through `src/` for judgment calls a script
can't make:

- **Folder placement makes sense.** Business logic sits in `domain/`, not leaked into
  `screens/` or `hooks/`. Data/IO sits in `services/`, not inline in a screen.
- **`index.ts` is a real public surface**, not a re-export of everything internal (check
  what it exports, not just that it exists).
- **`shared/` additions are genuinely shared** (used by 2+ features) — a single-feature
  concern that got moved to `shared/` "just in case" is a rule violation even though the
  scripts above won't catch it.

Re-read the "Dependency rules" and "Path aliases" subsections of `README.md` before this
pass in case they've been updated since this skill was written — the README is the source
of truth, this list is a summary of it.

## 3. i18n verification

Skip this section only if the diff touches nothing under `src/shared/i18n/` and adds no new
user-facing text. Otherwise, run it — a locale drifting out of sync or a hardcoded string
sneaking past `t()` is exactly the kind of thing that's easy to miss in a normal read-through.

- **Locale parity.** `pt-BR.json` is the source of truth for which keys exist (that's what
  `TranslationKey` is derived from), but nothing enforces that every other locale file has
  the *same* keys — a locale can silently drift missing or stale entries. Check it directly:

  ```sh
  node -e "
  const flatten = (obj, prefix = '') => Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'string' ? [prefix + k] : flatten(v, prefix + k + '.'));
  const fs = require('fs');
  const dir = 'src/shared/i18n/locales';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const source = 'pt-BR.json';
  const sourceKeys = new Set(flatten(require('./' + dir + '/' + source)));
  for (const f of files) {
    if (f === source) continue;
    const keys = new Set(flatten(require('./' + dir + '/' + f)));
    const missing = [...sourceKeys].filter(k => !keys.has(k));
    const extra = [...keys].filter(k => !sourceKeys.has(k));
    console.log(f, '— missing:', missing, '| extra:', extra);
  }
  "
  ```

  Any non-empty `missing`/`extra` list is a finding — that locale is out of sync with the
  source of truth.

- **Keys are actually typed.** `npx tsc --noEmit` (already run in §1) fails if a `t('...')`
  call uses a key that doesn't exist in `pt-BR.json` — confirm this is *why* that check
  matters here, not just that it passed. If someone loosened `TranslationKey` to plain
  `string` at some point, that safety net is gone; check `src/shared/i18n/dictionary.ts`
  still derives the type from the JSON.

- **No hardcoded user-facing strings bypassing `t()`.** Spot-check screens/components for
  literal text that should be a translation key:

  ```sh
  grep -rn "<Text>[^{]" src/features src/shared --include="*.tsx"
  ```

  Every hit should either go through `{t(...)}` or be genuinely non-translatable (a number,
  a code, an icon glyph) — anything else is a finding.

- **Interpolation params line up.** For any key whose dictionary value contains a
  `{{param}}` placeholder, confirm the call site passes a matching param name in the second
  argument to `t()`. A silently-missing param renders the literal `{{param}}` in the UI.

## 4. Functional smoke test

Static checks don't prove the app renders. Actually run it:

1. Start the web dev server in the background: `npm run web` (Expo's default port is 8081;
   check `app.json`'s `web` key if it's been changed).
2. Load `claude-in-chrome` and open `http://localhost:8081` in a tab.
3. Take a screenshot. The app must render real content (not a blank white page, not a red
   error overlay).
4. Read the browser console (`read_console_messages`, `onlyErrors: true`) — zero errors is
   the bar. A warning is worth noting but not a failure.
5. If the change under review touches a specific screen/flow, exercise it manually
   (navigate, tap, type) rather than only checking the home screen loads.
6. Kill the dev server (`pkill -f "expo start"`) when done.

If Android/iOS tooling is available in this environment (an emulator or simulator already
running), prefer running the real target instead of only web — web is the fast fallback,
not a substitute when a native-only code path is what's being reviewed.

## 5. Report

Build one HTML report and publish it with the Artifact tool (`favicon: "🔍"`). Structure:

- **Header**: branch name, commit SHA, timestamp.
- **Summary strip**: one badge per check (Lint / Format / Typecheck / Tests / Build /
  Architecture / i18n / Functional) — pass/fail/warn at a glance, most-severe first if
  anything failed. Skip the i18n badge only if §3 was itself skipped (no i18n-relevant
  changes in the diff).
- **Build & lint**: each command run, its result, and the first real error line for any
  failure (not the full raw log).
- **Architecture**: the actual output of the §2 scripts (not a paraphrase — if a check
  found nothing, say so explicitly) plus the checklist items with a verdict per item, and a
  short note on anything that needed a judgment call.
- **i18n** (when §3 ran): locale parity result per locale file, the hardcoded-string grep
  result, and any interpolation mismatch found.
- **Functional test**: the screenshot, console error count, and what was exercised.
- **Verdict**: one paragraph — is this repo/branch in a mergeable state, and if not, the
  ordered list of what has to be fixed first.

Load the `artifact-design` skill before writing the HTML so the report doesn't come out
looking like an unstyled dump — this is meant to be something a reviewer actually wants to
open.
