# Per-Repo Analysis Schema

Each repo gets a `_analysis/<name>.json` file with this exact shape. Downstream phases (clustering, spreadsheet, README drafting) read these files programmatically — keep field names and enums precise.

## Schema

```json
{
  "name": "string — repo name (must match folder under repos/)",
  "one_liner": "string — one-sentence description suitable for a spreadsheet cell",
  "problem_statement": "string — what real friction this addresses",
  "goal": "string — what 'done' looks like",
  "approach": "string — architecture / tech choices",
  "tech_stack": ["array of strings — primary languages/frameworks/notable libs"],
  "implemented_features": ["array of strings — what's actually built"],
  "missing_features": ["array of strings — what's needed to ship"],
  "completion_pct": "number 0-100",
  "quality_signal": "abandoned | experiment | prototype | working | production-lean",
  "duplicate_hint": "string — name of suspected duplicate cluster (e.g. 'jit-app', 'sanity-blog'), or empty string if standalone",
  "recommended_action_hint": "keep | consolidate_into:<winner-name> | archive | delete_candidate",
  "notes": "string — anything else worth flagging (committed secrets, encoding issues, identity drift between repo name and package.json name, abandoned forks, course follow-along projects, etc)"
}
```

## Quality signal definitions

| Signal | Meaning |
|--------|---------|
| `abandoned` | No commits in >2 years, no working state, no clear path to revival |
| `experiment` | Single-purpose throwaway; served its learning purpose; not worth maintaining |
| `prototype` | Incomplete but real progress; could be revived with clear next steps |
| `working` | Runs end-to-end against expected inputs; missing polish/auth/tests |
| `production-lean` | Actually used, gets bug fixes, has someone depending on it |

## Action definitions

| Action | Meaning |
|--------|---------|
| `keep` | Refresh README, keep maintaining, may be highlighted on profile |
| `consolidate_into:<name>` | Worthwhile bits get merged into the named winner; this repo then archived |
| `archive` | Preserve history, mark read-only on GitHub via `gh repo archive` |
| `delete_candidate` | Empty or pure-placeholder; default to archive (reversible), but flag as a real-deletion option |

## How clustering uses this

The clustering phase (Phase 4) reads all `_analysis/*.json` files and:

1. Groups by `duplicate_hint` value (non-empty hints with the same value form a cluster).
2. Within each cluster, picks the winner using: highest `completion_pct` + most recent activity (from `pushedAt` in the inventory) + substantive signal (e.g., "has the only real domain model"). Ties broken by author judgment, documented in `ConsolidationPlan.md`.
3. Mutates the losers' `recommended_action_hint` to `consolidate_into:<winner>`.

If `duplicate_hint` is honest, clustering is mostly mechanical. Worth investing analysis-phase time to get those hints right.

## Honesty rules during analysis

- `completion_pct` is a judgment call, not a measurement. Anchor it to: 0% (empty), 25% (scaffold only), 50% (core path works), 75% (works but missing auth/tests/deploy), 100% (production-grade).
- `implemented_features` should be verifiable from the source — don't list "auth" if there's no login page.
- If you can't tell what a repo does after reading it, that's data: set `quality_signal: "abandoned"` and `notes: "purpose unclear from source"`.
