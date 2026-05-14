# repo-audit - Phase 6: stage draft PRs + open consolidation branches + archive.
#
# This is a TEMPLATE. The skill emits a customized copy with the data arrays
# below filled in from the analysis output. Run as:
#
#   .\02-open-pr-drafts.ps1 -User <handle> -WhatIf      # dry run first
#   .\02-open-pr-drafts.ps1 -User <handle>              # apply
#
# For each KEEP repo: branch `docs/readme-refresh`, copy the drafted README,
#   commit, push, open a DRAFT PR.
# For each CONSOLIDATION target: branch `consolidation/<target>`, add a
#   CONSOLIDATION_TODO.md slot, open a DRAFT PR.
# For each ARCHIVE repo (incl. consolidation losers): `gh repo archive` (reversible).
# For each DELETE candidate: archived too (delete is a separate manual step).
#
# All PRs open as --draft. Nothing is merged. All archives are reversible.
#
# Flags:
#   -User <handle>         : GitHub handle (REQUIRED)
#   -WhatIf                : print actions without executing
#   -SkipReadmePRs         : skip part A
#   -SkipConsolidation     : skip part B
#   -SkipArchives          : skip part C

param(
    [Parameter(Mandatory=$true)][string]$User,
    [switch]$WhatIf,
    [switch]$SkipReadmePRs,
    [switch]$SkipConsolidation,
    [switch]$SkipArchives
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$reposDir  = Join-Path $root "repos"
$draftsDir = Join-Path $root "_drafts"
$logFile   = Join-Path $root "_inventory\apply-run.log"
New-Item -ItemType Directory -Force -Path (Split-Path $logFile) | Out-Null
"=== run start: $(Get-Date -Format o) ===" | Out-File $logFile -Append

function Log($m) { Write-Host $m; $m | Out-File $logFile -Append }
function Do-Cmd([scriptblock]$sb, [string]$desc) {
    if ($WhatIf) { Log "  [dry-run] $desc" ; return 0 }
    Log "  > $desc"
    & $sb
    return $LASTEXITCODE
}

# ============================================================================
# CLAUDE: replace the empty arrays below with the actual lists from analysis.
# Pull values from _analysis/<repo>.json files where recommended_action_hint
# matches each category.
# ============================================================================

# Repos to keep + refresh README. (recommended_action_hint == "keep")
$keeps = @(
    # "RepoName1", "RepoName2", ...
)

# Consolidation targets => sources being folded in.
# (target = winner of a duplicate cluster; sources = repos with
# recommended_action_hint == "consolidate_into:<target>")
$consolidations = @{
    # "TargetRepo" = @("Source1", "Source2")
}

# Repos to archive outright with no consolidation.
# (recommended_action_hint == "archive", not in any consolidation cluster)
$archives = @(
    # "RepoName1", "RepoName2", ...
)

# Empty/placeholder repos. Archived here (reversible). Actual deletion is manual.
# (recommended_action_hint == "delete_candidate")
$deleteCandidates = @(
    # "RepoName1", "RepoName2", ...
)

# ============================================================================

# All consolidation-source repos also get archived.
$consolidationLosers = $consolidations.Values | ForEach-Object { $_ } | Select-Object -Unique

# =======================================================================
# Part A — open README refresh draft PRs for every KEEP
# =======================================================================
if (-not $SkipReadmePRs) {
    Log ""
    Log "=== Part A: README refresh PRs on $($keeps.Count) keep repos ==="
    foreach ($name in $keeps) {
        $repoPath  = Join-Path $reposDir  $name
        $draftPath = Join-Path $draftsDir "$name\README.md"
        if (-not (Test-Path $repoPath))  { Log "  SKIP $name (no clone)"; continue }
        if (-not (Test-Path $draftPath)) { Log "  SKIP $name (no draft README)"; continue }
        Log ""
        Log "[$name]"
        Push-Location $repoPath
        try {
            $default = (git symbolic-ref refs/remotes/origin/HEAD 2>$null) -replace '^refs/remotes/origin/',''
            if (-not $default) { $default = "main" }
            Do-Cmd { git checkout $default --quiet } "checkout $default" | Out-Null
            Do-Cmd { git pull --ff-only --quiet }     "pull --ff-only"     | Out-Null
            Do-Cmd { git checkout -B docs/readme-refresh --quiet } "branch docs/readme-refresh" | Out-Null

            if (-not $WhatIf) { Copy-Item -Force $draftPath (Join-Path $repoPath "README.md") }
            Do-Cmd { git add README.md } "stage README" | Out-Null
            $changes = git status --porcelain
            if (-not $changes -and -not $WhatIf) {
                Log "  (README unchanged, nothing to commit)"
            } else {
                Do-Cmd { git commit -m "docs: refresh README with problem/goal/feature summary" --quiet } "commit" | Out-Null
                Do-Cmd { git push -u origin docs/readme-refresh --quiet } "push" | Out-Null
                $body = "Refreshed README generated as part of a repo audit pass.`n`nCovers: problem statement, goal, approach, implemented features, remaining work, getting-started, status.`n`nSee ``ConsolidationPlan.md`` in the audit folder for the full audit context."
                Do-Cmd { gh pr create --draft --base $default --head docs/readme-refresh --title "docs: refresh README (repo-audit pass)" --body $body } "gh pr create --draft" | Out-Null
            }
        } finally {
            Pop-Location
        }
    }
}

# =======================================================================
# Part B — consolidation branches on each target repo
# =======================================================================
if (-not $SkipConsolidation) {
    Log ""
    Log "=== Part B: consolidation branches on $($consolidations.Count) target repos ==="
    foreach ($target in $consolidations.Keys) {
        $sources = $consolidations[$target]
        $repoPath = Join-Path $reposDir $target
        if (-not (Test-Path $repoPath)) { Log "  SKIP $target (no clone)"; continue }
        Log ""
        Log "[$target <- $($sources -join ', ')]"
        Push-Location $repoPath
        try {
            $default = (git symbolic-ref refs/remotes/origin/HEAD 2>$null) -replace '^refs/remotes/origin/',''
            if (-not $default) { $default = "main" }
            Do-Cmd { git checkout $default --quiet } "checkout $default" | Out-Null
            Do-Cmd { git pull --ff-only --quiet } "pull" | Out-Null
            Do-Cmd { git checkout -B "consolidation/$target" --quiet } "branch consolidation/$target" | Out-Null

            $todoPath = Join-Path $repoPath "CONSOLIDATION_TODO.md"
            $todoContent = @"
# Consolidation landing pad

This branch is where code from the following archived-or-being-archived repos can be cherry-picked into ``$target`` before the originals are retired:

$(($sources | ForEach-Object { '- `' + $_ + '`' }) -join "`n")

## Suggested workflow per source

``````bash
git remote add src-$($sources[0]) https://github.com/$User/$($sources[0]).git
git fetch src-$($sources[0])
# review commits:
git log src-$($sources[0])/HEAD --oneline | head
# cherry-pick anything worth keeping:
git cherry-pick <sha>
# or copy schemas/docs verbatim into docs/:
mkdir -p docs/from-$($sources[0])
# (copy files, commit with clear message)
``````

Delete this file when you're done.

Audit context: see ``ConsolidationPlan.md`` in the audit folder.
"@
            if (-not $WhatIf) { $todoContent | Out-File -Encoding utf8 $todoPath }
            Do-Cmd { git add CONSOLIDATION_TODO.md } "stage todo" | Out-Null
            Do-Cmd { git commit -m "chore: open consolidation branch for $target" --quiet } "commit" | Out-Null
            Do-Cmd { git push -u origin "consolidation/$target" --quiet } "push" | Out-Null
            $body = "Consolidation branch for ``$target``. Sources being folded in: $($sources -join ', ').`n`nSee CONSOLIDATION_TODO.md on this branch for the cherry-pick workflow.`n`nSee ConsolidationPlan.md in the audit folder for the full audit context."
            Do-Cmd { gh pr create --draft --base $default --head "consolidation/$target" --title "consolidation: absorb $($sources -join ', ') into $target" --body $body } "gh pr create --draft" | Out-Null
        } finally {
            Pop-Location
        }
    }
}

# =======================================================================
# Part C — archive repos (reversible)
# =======================================================================
if (-not $SkipArchives) {
    $toArchive = $archives + $consolidationLosers + $deleteCandidates | Select-Object -Unique
    Log ""
    Log "=== Part C: archive $($toArchive.Count) repos (reversible via gh repo unarchive) ==="
    Log "    DOES NOT DELETE. Only flips the archive flag on GitHub."
    foreach ($name in $toArchive) {
        Log ""
        Log "[archive] $User/$name"
        Do-Cmd { gh repo archive "$User/$name" --yes } "gh repo archive" | Out-Null
    }
}

Log ""
Log "=== run end: $(Get-Date -Format o) ==="
Log ""
if ($WhatIf) {
    Log "DRY RUN. Nothing was executed. Remove -WhatIf to apply."
} else {
    Log "DONE. Review your draft PRs at https://github.com/$User?tab=repositories and the audit log at $logFile."
}
