# repo-audit

A Cowork plugin that audits, deduplicates, and documents a personal GitHub repo collection.

## What it does

You point it at a GitHub username. It:

1. Inventories every repo (metadata + clones, run locally on your machine)
2. Deep-analyzes each repo for problem statement, goal, completion %, and quality signal
3. Clusters duplicates into consolidation candidates
4. Drafts new structured READMEs for every keep
5. Emits PowerShell scripts that stage draft PRs, open consolidation branches, and archive abandoned repos

Everything is reversible: PRs land as `--draft`, archives use `gh repo archive` (which `gh repo unarchive` reverses), and nothing is deleted automatically.

## Skills

| Skill | Trigger | What it does |
|-------|---------|--------------|
| `audit-repos` | "audit my GitHub", "find duplicate repos", "what should I archive" | Full multi-repo pipeline |
| `draft-repo-readme` | "draft a README for X", "regenerate this repo's README" | Single-repo README from source files |

## Requirements

- **`gh` CLI** installed locally and authenticated (`gh auth login`)
- **`git`** on PATH
- **PowerShell** (Windows native, or PowerShell Core on Mac/Linux)
- A folder on your local machine you can dedicate to the audit (e.g. `~/RepoAnalyzer` or `D:\RepoAnalyzer`)

The plugin runs analysis inside Cowork but emits PowerShell scripts you run on your own machine — Cowork's sandbox can't reach GitHub directly.

## Usage

In a Cowork session:

```
/audit-repos
```

Or in plain language:

> Audit my GitHub repos, my username is `acme-dev`.

The skill walks through setup, runs the inventory step (you execute the emitted script), then takes over for analysis, drafting, and PR script generation.

## Output

After a full run, your working folder will contain:

- `_inventory/repos.json`, `repos.csv`, `commit_activity.csv` — raw metadata
- `repos/<name>/` — local clones of every repo
- `_analysis/<name>.json` — structured per-repo analysis
- `ConsolidationPlan.md` — narrative cleanup plan
- `Repo-Audit.xlsx` — color-coded spreadsheet with per-repo actions
- `_drafts/<name>/README.md` — drafted READMEs for keeps
- `01-export-and-clone.ps1`, `02-open-pr-drafts.ps1`, `03-merge-readme-prs.ps1` — runnable scripts

## License

MIT.
