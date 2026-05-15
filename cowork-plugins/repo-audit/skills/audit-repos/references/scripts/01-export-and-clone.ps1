# repo-audit - Phase 1: export repo metadata + clone everything locally.
#
# Prereqs: `gh` installed + `gh auth login` completed, `git` on PATH.
# Run from inside your audit folder:
#   .\01-export-and-clone.ps1 -User <github-handle>
#
# Flags:
#   -User <handle>   : GitHub handle (REQUIRED)
#   -Limit <n>       : max repos to pull (default: 1000)
#   -Shallow         : shallow clones (--depth 50), faster + smaller
#   -Ssh             : force SSH clone URLs (default is HTTPS via gh credential helper)

param(
    [Parameter(Mandatory=$true)][string]$User,
    [int]$Limit = 1000,
    [switch]$Shallow,
    [switch]$Ssh
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
Set-Location $root

New-Item -ItemType Directory -Force -Path "$root\_inventory" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\repos"      | Out-Null

Write-Host "==> Exporting repo metadata for $User (limit $Limit)..." -ForegroundColor Cyan
$jsonFields = "name,description,url,sshUrl,visibility,isFork,isArchived,isTemplate,isEmpty,isPrivate,defaultBranchRef,primaryLanguage,languages,diskUsage,pushedAt,updatedAt,createdAt,stargazerCount,forkCount,repositoryTopics,hasIssuesEnabled,hasWikiEnabled"
gh repo list $User --limit $Limit --json $jsonFields | Out-File -Encoding utf8 "$root\_inventory\repos.json"

$repos = Get-Content "$root\_inventory\repos.json" -Raw | ConvertFrom-Json
Write-Host ("    found {0} repos" -f $repos.Count) -ForegroundColor Green

Write-Host "==> Writing flat CSV summary..." -ForegroundColor Cyan
$repos | ForEach-Object {
    [PSCustomObject]@{
        name            = $_.name
        visibility      = $_.visibility
        isFork          = $_.isFork
        isArchived      = $_.isArchived
        primaryLanguage = if ($_.primaryLanguage) { $_.primaryLanguage.name } else { "" }
        pushedAt        = $_.pushedAt
        diskUsageKB     = $_.diskUsage
        stars           = $_.stargazerCount
        description     = ($_.description -replace "`r?`n", " ")
    }
} | Export-Csv -NoTypeInformation -Encoding utf8 "$root\_inventory\repos.csv"

Write-Host "==> Cloning / updating each repo..." -ForegroundColor Cyan
if (-not $Ssh) {
    Write-Host "    using HTTPS (piggybacks on gh credential helper)" -ForegroundColor DarkGray
} else {
    Write-Host "    using SSH (-Ssh flag set)" -ForegroundColor DarkGray
}

$i = 0
foreach ($r in $repos) {
    $i++
    $name = $r.name
    if ($Ssh) {
        $url = $r.sshUrl
    } else {
        $url = "https://github.com/$User/$name.git"
    }
    $dest = Join-Path "$root\repos" $name
    Write-Host ("  [{0}/{1}] {2}" -f $i, $repos.Count, $name) -ForegroundColor DarkGray

    if (Test-Path (Join-Path $dest ".git")) {
        git -C $dest fetch --all --prune --quiet 2>$null
    } else {
        $cloneArgs = @("clone", "--quiet")
        if ($Shallow) { $cloneArgs += @("--depth", "50") }
        $cloneArgs += @($url, $dest)
        & git @cloneArgs
        if ($LASTEXITCODE -ne 0) {
            Write-Host ("    WARN: clone failed for {0}" -f $name) -ForegroundColor Yellow
        }
    }
}

Write-Host "==> Computing commit-activity summary..." -ForegroundColor Cyan
$activity = @()
foreach ($d in Get-ChildItem -Directory "$root\repos") {
    $commits = 0
    $last    = ""
    $sz      = 0
    try {
        $commits = (git -C $d.FullName log --since="1 year ago" --oneline 2>$null | Measure-Object).Count
        $last    = (git -C $d.FullName log -1 --format=%s 2>$null)
        if ($last) { $last = ($last -replace '"', "'") }
        $sz      = (Get-ChildItem $d.FullName -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object -Sum Length).Sum
    } catch { }
    $activity += [PSCustomObject]@{
        name               = $d.Name
        commits_last_year  = $commits
        last_commit_msg    = $last
        disk_bytes         = $sz
    }
}
$activity | Export-Csv -NoTypeInformation -Encoding utf8 "$root\_inventory\commit_activity.csv"

Write-Host ""
Write-Host "DONE. Outputs:" -ForegroundColor Green
Write-Host "  _inventory\repos.json"
Write-Host "  _inventory\repos.csv"
Write-Host "  _inventory\commit_activity.csv"
Write-Host "  repos\<each-repo>\"
Write-Host ""
Write-Host "Tell Claude the script finished." -ForegroundColor Green
