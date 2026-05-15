# Pipeline Overview

The 8-phase audit pipeline. Phases marked LOCAL run on the user's machine via emitted PowerShell scripts; everything else runs inside Cowork.

```
┌──────────────────────────────────────────────────────────────────┐
│ Phase 0: Setup                                                   │
│   • Confirm GH user + working folder via AskUserQuestion         │
│   • Mount working folder via request_cowork_directory            │
└──────────────────────────────────────────────────────────────────┘
            ↓
┌──────────────────────────────────────────────────────────────────┐
│ Phase 1: Inventory + clone        [LOCAL — PowerShell]           │
│   • Emit 01-export-and-clone.ps1 to working folder               │
│   • User runs:  .\01-export-and-clone.ps1 -User <handle>         │
│   • Produces _inventory/repos.json + repos/<name>/ clones        │
└──────────────────────────────────────────────────────────────────┘
            ↓
┌──────────────────────────────────────────────────────────────────┐
│ Phase 2: Deep analysis            [parallel subagents]           │
│   • Split repos into clusters of 10–15                           │
│   • One Agent per cluster writes _analysis/<repo>.json files     │
│   • Schema enforced from references/analysis-schema.md           │
└──────────────────────────────────────────────────────────────────┘
            ↓
┌──────────────────────────────────────────────────────────────────┐
│ Phase 3: Cluster duplicates → ConsolidationPlan.md               │
│   • Group by duplicate_hint                                      │
│   • Pick winner per cluster, mark losers consolidate_into:X      │
│   • Write narrative plan with per-cluster sections               │
└──────────────────────────────────────────────────────────────────┘
            ↓
┌──────────────────────────────────────────────────────────────────┐
│ Phase 4: Spreadsheet → Repo-Audit.xlsx           [xlsx skill]    │
│   • Color-coded by action: green/amber/gray/red-lite             │
│   • Sheets: Summary, All Repos, Keeps, Consolidations            │
└──────────────────────────────────────────────────────────────────┘
            ↓
┌──────────────────────────────────────────────────────────────────┐
│ Phase 5: Draft READMEs            [parallel subagents]           │
│   • Per KEEP repo: write _drafts/<repo>/README.md                │
│   • Template enforced from references/readme-template.md         │
│   • Honesty rules: don't invent features or biographical details │
└──────────────────────────────────────────────────────────────────┘
            ↓
┌──────────────────────────────────────────────────────────────────┐
│ Phase 6: PR staging script        [LOCAL — PowerShell]           │
│   • Emit 02-open-pr-drafts.ps1 with KEEP/consol/archive lists    │
│   • User runs -WhatIf, reviews log, then runs for real           │
└──────────────────────────────────────────────────────────────────┘
            ↓
┌──────────────────────────────────────────────────────────────────┐
│ Phase 7: (optional) Merge helper  [LOCAL — PowerShell]           │
│   • Emit 03-merge-readme-prs.ps1                                 │
│   • Defaults: README PRs only; consolidation PRs stay open       │
└──────────────────────────────────────────────────────────────────┘
```

## Why phases 1, 6, 7 are local

Cowork's sandbox network policy blocks `github.com`, `api.github.com`, and `cli.github.com`. `gh` and `git push` from inside Cowork will fail. The script-emit pattern keeps Cowork doing what it's good at (analysis, drafting) and the user's local machine doing what's required (anything that touches GitHub).

If this changes in the future and Cowork can reach GitHub directly, phases 1/6/7 can be rewritten as inline Bash steps instead of script emits — the rest of the pipeline doesn't need to change.
