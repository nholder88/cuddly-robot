# repo-audit - Phase 7 (optional): merge the README-refresh draft PRs.
#
# This is a TEMPLATE. The skill emits a customized copy with the $keeps and
# $consolidationTargets arrays filled in to match the audit. Run as:
#
#   .\03-merge-readme-prs.ps1 -User <handle> -WhatIf
#   .\03-merge-readme-prs.ps1 -User <handle>
#
# For each KEEP repo: mark `docs/readme-refresh` PR ready-for-review,
# squash-merge it, delete the branch.
#
# Consolidation PRs are NOT touched unless -IncludeConsolidation is passed.
# Those branches are the landing pad for cherry-picking from now-archived
# source repos; merging them prematurely just ships a TODO file to main with
# no real consolidation work done.
#
# Flags:
#   -User <handle>            : GitHub handle (REQUIRED)
#   -WhatIf                   : print actions without executing
#   -IncludeConsolidation     : ALSO merge the consolidation PRs (only if
#                               you've already cherry-picked everything you
#                               want onto those branches)

param(
    [Parameter(Mandatory=$true)][string]$User,
    [switch]$WhatIf,
    [switch]$IncludeConsolidation
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$logFile = Join-Path $root "_inventory\merge-run.log"
New-Item -ItemType Directory -Force -Path (Split-Path $logFile) | Out-Null
"=== merge run start: $(Get-Date -Format o) ===" | Out-File $logFile -Append

function Log($m) { Write-Host $m; $m | Out-File $logFile -Append }
function Do-Cmd([scriptblock]$sb, [string]$desc) {
    if ($WhatIf) { Log "  [dry-run] $desc" ; return 0 }
    Log "  > $desc"
    & $sb
    return $LASTEXITCODE
}

# ============================================================================
# CLAUDE: replace the empty arrays below with the actual KEEP and
# consolidation-target lists from the analysis. Must match the lists used
# in 02-open-pr-drafts.ps1.
# ============================================================================

$keeps = @(
    # "RepoName1", "RepoName2", ...
)

$consolidationTargets = @(
    # "TargetRepo1", "TargetRepo2", ...
)

# ============================================================================

Log ""
Log "=== Merging README-refresh PRs on $($keeps.Count) keep repos ==="

foreach ($name in $keeps) {
    Log ""
    Log "[$name]"
    $repo = "$User/$name"
    Do-Cmd { gh pr ready --repo $repo "docs/readme-refresh" } "mark ready" | Out-Null
    Do-Cmd { gh pr merge --repo $repo --squash --delete-branch "docs/readme-refresh" } "squash merge + delete branch" | Out-Null
}

if ($IncludeConsolidation) {
    Log ""
    Log "=== Merging consolidation PRs on $($consolidationTargets.Count) target repos ==="
    Log "    (you passed -IncludeConsolidation; this will ship CONSOLIDATION_TODO.md to main)"
    foreach ($name in $consolidationTargets) {
        Log ""
        Log "[$name]"
        $repo = "$User/$name"
        $branch = "consolidation/$name"
        Do-Cmd { gh pr ready --repo $repo $branch } "mark ready" | Out-Null
        Do-Cmd { gh pr merge --repo $repo --squash --delete-branch $branch } "squash merge + delete branch" | Out-Null
    }
} else {
    Log ""
    Log "Consolidation PRs left open (pass -IncludeConsolidation to also merge those)."
}

Log ""
Log "=== merge run end: $(Get-Date -Format o) ==="
if ($WhatIf) {
    Log "DRY RUN. Nothing was executed. Remove -WhatIf to apply."
} else {
    Log "DONE. Check https://github.com/$User?tab=repositories"
}
