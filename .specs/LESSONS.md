# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - When a filter or search feature's empty-result UI branch is only reachable through combinations the current mock/fixture data can't produce, add a dedicated test that mocks the data source to return zero items rather than relying on domain-level empty-array assertions alone.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `materials` · harmful: 0
- features: materials-category-filter
- evidence: MATF-07 / .specs/features/materials-category-filter/validation.md (materials)
- last seen: 2026-09-12T04:28:59Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
