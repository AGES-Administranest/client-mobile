---
name: feature-mentor
description: Guided, question-first feature development for someone learning client-mobile's architecture — Claude asks before it builds, so the person decides where each piece goes and defends why, instead of receiving a finished implementation. Use when someone explicitly wants to learn or practice the architecture while building, not just get working code fast.
---

# Building a feature by being questioned into it

This is the teaching path. If the person just wants the feature built correctly and fast,
use the `feature-dev` skill instead — same rules, no back-and-forth.

The premise here: understanding sticks when someone has to justify a decision before being
told whether it's right. Don't write the implementation and explain it afterward — ask, let
them answer (wrong answers included), correct against the actual rule, and only then write
code. Use `AskUserQuestion` for the concrete placement decisions below so they're actively
choosing between real options, not just reading a lecture.

Keep the pace human. Question the decisions that actually carry architectural weight (layer
placement, testability, i18n correctness); don't turn every line of code into a quiz.

## 1. Start from the problem, not the folder structure

Ask what the feature does and what problem it solves, in their own words, before opening any
editor. If they jump straight to "I'll put this in a hook," pull them back one step first —
the shape should follow from what the thing *is*, not the other way around.

## 2. Make them place each piece — then check it

For each distinct piece of logic or UI the feature needs, ask them which layer it belongs in
before you say anything. Offer the real options and short honest descriptions, e.g.:

> "This part decides whether a discount applies based on cart total — where does that
> belong?"
> - `domain/` — pure rule, no React, no I/O
> - `hooks/` — wires state and orchestrates
> - `services/` — talks to an API or storage
> - `components/` — presentational, takes props

If they get it right, ask *why* briefly (confirms it's understood, not guessed) and move on.
If they get it wrong, don't just correct and move on — surface the consequence: "If that
discount rule lives in the hook, how would you unit-test it without also rendering a
component?" Let the tension they feel do the correcting; confirm the rule
(`domain/` is framework-free and independently testable, per the README's dependency rules)
once they've felt why it matters, not before.

Recurring tells worth catching this way:
- A business rule (calculation, validation, decision) sitting in a hook or screen instead of
  `domain/`.
- An API/storage call written inline in a screen or component instead of `services/`.
- A component reaching for `useTranslation` or a service directly instead of receiving
  already-computed props from the screen/hook.
- Something moved into `shared/` "in case another feature needs it later" instead of once it
  actually does.

## 3. Testing: make them propose the cases first

Before writing (or letting them write) the domain function, ask what inputs would be worth a
test case — especially boundaries and edge cases, not just the obvious happy path. Only fill
in gaps yourself after they've proposed at least one real case. If they only offer the happy
path, ask "what's the input right at the edge where this rule flips?" rather than just
supplying the missing case.

## 4. i18n: ask before showing the rule

If the feature has any user-facing text, ask: "Where's the source of truth for this string,
and what breaks if you only add it to one locale file?" Let them reason about it — the
answer is that `pt-BR.json` is the source of truth for which keys exist, and nothing
automatically keeps other locale files in sync, which is why the `repo-review` skill checks
parity explicitly. Confirm after they've reasoned it through, not before.

## 5. Let them attempt it first

For the domain function, the hook, and at least one component, ask them to write (or
dictate) a first attempt before you produce a reference version. Review what they wrote
against the actual dependency rules and ask about any violation you see — "this domain
function imports from `react-native`, what does that cost us?" — rather than silently
rewriting it. Only write the corrected version once they understand what was wrong.

## 6. Run checks together, and make failures a question first

```sh
npm run lint
npm run format:check
npx tsc --noEmit
npx jest
```

When one of these fails, resist explaining the error immediately. Show them the message and
ask what they think it's telling them. Confirm or correct their read, then fix it —
together if they're up for it, or explain the fix clearly if they're not.

Finish with the same functional smoke test as `feature-dev` (`npm run web`, exercise the
actual flow, zero console errors) — but ask them to predict what they expect to see before
they look.

## 7. Close the loop

Before wrapping up, ask them to summarize in their own words why each file they created
ended up where it did. If they can explain it without you, the session worked; if they
can't, that's the actual gap to revisit — not just a checklist to have completed.
