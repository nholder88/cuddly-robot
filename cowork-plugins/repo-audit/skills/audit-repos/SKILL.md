---
name: audit-repos
description: Run a full audit of a GitHub user's personal repos. Inventories every repo, deep-analyzes each one for problem/goal/state/completion, clusters duplicates, drafts new READMEs for keeps, and emits PowerShell scripts that stage draft PRs and archives. Use when the user says "audit my GitHub", "audit my repos", "review my GitHub projects", "find duplicate repos", "consolidate my projects", "clean up my GitHub", "what should I archive", "deep-clean my repos", "I have too many incomplete projects", or otherwise describes wanting to triage a personal GitHub account with sprawl.
---

# Audit GitHub Repos

End-to-end pipeline for auditing a personal GitHub account: inventory → deep analysis → duplicate detection → README drafting → draft PR staging.

## When this skill runs

Invoke when the user wants to clean up, document, or consolidate a personal GitHub repo collection. Common phrasings: "audit my repos", "find duplicates", "what should I archive", "I have too many incomplete projects", "build me READMEs for my repos".

## Architecture

The pipeline runs partly inside Cowork (analysis, drafting) and partly on the user's local machine (anything that touches GitHub via `gh` CLI). **Cowork's sandbox cannot reach GitHub directly** — do not attempt `gh` or `git clone github.com/...` from Bash inside Cowork. Instead, emit PowerShell scripts the user runs locally, then read the resulting files when they report back.

Phases:

1. **Setup** — confirm GH user + working folder, mount via `request_cowork_directory`
2. **Inventory** — emit `01-export-and-clone.ps1`; user runs locally; produces `_inventory/repos.json` + `repos/<name>/` clones
3. **Analysis** — fan out to subagents to deep-analyze each repo into `_analysis/<name>.json`
4. **Clustering** — detect duplicate clusters and write `ConsolidationPlan.md`
5. **Spreadsheet** — produce `Repo-Audit.xlsx` via the `xlsx` skill
6. **README drafting** — fan out to subagents to draft new READMEs into `_drafts/<name>/README.md`
7. **PR staging** — emit `02-open-pr-drafts.ps1` for the user to run locally
8. **Merge helper** (optional) — emit `03-merge-readme-prs.ps1`

See `references/pipeline-overview.md` for a visual flow.

## Step-by-step procedure

### Step 1: Setup

Ask the user (use AskUserQuestion):
- **GitHub username** to audit
- **Working folder** path on their machine (suggest `D:\RepoAnalyzer` on Windows, `~/RepoAnalyzer` on Mac/Linux)

Then call `request_cowork_directory` to mount the folder into the Cowork VM.

### Step 2: Inventory + clone

Read `references/scripts/01-export-and-clone.ps1`. Write a copy into the user's mounted working folder. The script's `-User` parameter has no default — instruct the user to pass it explicitly:

```powershell
cd <working folder>
.\01-export-and-clone.ps1 -User <their-handle>
```

Wait for the user to confirm "done" or similar. Then verify `_inventory/repos.json` exists in the mounted folder and read it. If it doesn't exist, troubleshoot before proceeding.

### Step 3: Deep analysis

For each repo, capture: problem statement, goal, approach, tech stack, implemented features, missing features, completion %, quality signal, duplicate hint, recommended action. Schema is in `references/analysis-schema.md` — adhere to it exactly so downstream phases can parse the output.

**Fan out**: split repos into clusters of 10–15 (by topic if obvious from `repos.json` names/languages, otherwise alphabetical). Spawn one Agent per cluster using `subagent_type: "general-purpose"`. Each agent reads the repo files in its slice (top-level files, README head, package.json/equivalent, recent commit messages) and writes `_analysis/<repo>.json` files matching the schema.

Pass each agent the schema content from `references/analysis-schema.md` so they all produce consistent output.

### Step 4: Cluster duplicates

Read all `_analysis/<repo>.json` files. Identify duplicate clusters by `duplicate_hint` field and tech-stack/name overlap. For each cluster, name a winner (highest completion + most recent activity, with a tie-breaker for "has the most complete domain model" or similar substantive signal) and mark the others as `consolidate_into:<winner>`.

Write `ConsolidationPlan.md` to the working folder root. Sections:

- Executive summary (one paragraph, count by action)
- Action counts table (Keep / Consolidate / Archive / Delete-candidate counts)
- Per-cluster sections — for each duplicate cluster, name the winner and explain why; list sources being absorbed
- Cross-cluster notes — repos that aren't duplicates but are related (ecosystems)
- Delete candidates — empty/placeholder repos
- "Things worth flagging before pushing" — committed secrets, encoding bugs, name typos, identity drift between `package.json` name and repo name, course-fork repos with zero original commits

### Step 5: Spreadsheet

Use the `xlsx` skill to produce `Repo-Audit.xlsx` at the working folder root. Sheets:

- **Summary** — count by action, top-line stats
- **All Repos** — every repo with action color-coding (green=keep, amber=consolidate, gray=archive, red-lite=delete)
- **Keeps** — just the keep list with one-liners
- **Consolidations** — winner → losers mapping with rationale

### Step 6: README drafting

For every KEEP repo, draft a new README following the structured template in `references/readme-template.md`. Sections in order: Problem, Goal, Approach, Implemented features, What's left to reach the goal (checkbox list), Related repos (if any), Getting started, Status.

**Fan out**: 4–6 README drafts per Agent (`subagent_type: "general-purpose"`). Pass each agent the readme-template content from `references/readme-template.md` so output stays consistent.

**CRITICAL — honesty rules:**
- Do not invent biographical or factual details that aren't in the source files.
- If a feature isn't in the code, don't claim it's implemented.
- Profile READMEs (the `<user>/<user>` repo) are the most sensitive — they show on the user's public profile. Strip anything not directly verifiable from the existing profile README or repo metadata. **Do NOT invent hobbies, job titles, years of experience, or personal details.** When in doubt, omit.

Write drafts to `_drafts/<repo>/README.md` so the user can review before they get pushed.

### Step 7: PR staging script

Read `references/scripts/02-open-pr-drafts.ps1` (a template with empty data arrays). Write a customized version to the working folder root with the actual KEEP, consolidation, archive, and delete-candidate lists from the analysis filled into the `$keeps`, `$consolidations`, `$archives`, and `$deleteCandidates` arrays.

Tell the user to run `-WhatIf` first, then for real:

```powershell
.\02-open-pr-drafts.ps1 -User <their-handle> -WhatIf
.\02-open-pr-drafts.ps1 -User <their-handle>
```

### Step 8: Merge helper (optional)

If the user signals they want the YOLO merge path ("just merge them all"), read `references/scripts/03-merge-readme-prs.ps1` and emit a customized copy with the same KEEP list filled in.

**Push back on merging consolidation PRs immediately.** Those branches are designed to be the working surface for cherry-picking from now-archived sources. Merging them prematurely just ships a `CONSOLIDATION_TODO.md` to main with no actual consolidation done. The script defaults to keeping them open; only adds them to the merge set when the user passes `-IncludeConsolidation`.

## Key invariants

- **Every action is reversible.** PRs land as `--draft`. Archives use `gh repo archive` which is reversed by `gh repo unarchive`. Nothing gets deleted automatically.
- **GitHub access is local-only.** This skill runs in Cowork's sandbox. Do not attempt to call `gh` from Bash here — it will fail with a network block. Always emit scripts and have the user run them.
- **Don't hallucinate.** README drafts must be grounded in repo file contents. If you can't verify it, omit it. Profile READMEs are the highest-stakes case.
- **Stage before applying.** Drafts go in `_drafts/`. Scripts ship with `-WhatIf` by default in their docs. The user always sees output before it hits GitHub.

## References

- `references/pipeline-overview.md` — visual flow of the 8 phases
- `references/readme-template.md` — structured README format used in Phase 6
- `references/analysis-schema.md` — JSON schema for `_analysis/<repo>.json` files
- `references/scripts/01-export-and-clone.ps1` — inventory + clone (parameterized, no default user)
- `references/scripts/02-open-pr-drafts.ps1` — draft PR staging template (data arrays empty; fill in per-audit)
- `references/scripts/03-merge-readme-prs.ps1` — README PR merge helper template
