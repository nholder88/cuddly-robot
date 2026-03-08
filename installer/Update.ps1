[CmdletBinding()]
param(
    [Parameter()]
    [string]$InstallRoot,

    [Parameter()]
    [string]$SourceRepoPath,

    [Parameter()]
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message"
}

function Fail {
    param([string]$Message)
    throw "[ERROR] $Message"
}

try {
    if ([string]::IsNullOrWhiteSpace($InstallRoot)) {
        $InstallRoot = Join-Path ([Environment]::GetFolderPath("LocalApplicationData")) "ai-agent-workflows-pack"
    }

    $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
    $setupScriptPath = Join-Path $scriptRoot "Setup.ps1"
    $defaultSourceRepoPath = Split-Path -Parent $scriptRoot
    $defaultAgentsPath = Join-Path $defaultSourceRepoPath "VS Code\agents"
    $defaultTemplatesPath = Join-Path $defaultSourceRepoPath "Templates"

    if (-not (Test-Path -LiteralPath $setupScriptPath -PathType Leaf)) {
        Fail "Setup script not found next to Update script: $setupScriptPath"
    }

    $manifestPath = Join-Path $InstallRoot "install-manifest.json"

    if (-not $PSBoundParameters.ContainsKey("SourceRepoPath")) {
        if ((Test-Path -LiteralPath $defaultAgentsPath -PathType Container) -and (Test-Path -LiteralPath $defaultTemplatesPath -PathType Container)) {
            $SourceRepoPath = $defaultSourceRepoPath
            Write-Info "Using local source repo next to installer scripts: $SourceRepoPath"
        }
        elseif (Test-Path -LiteralPath $manifestPath) {
            try {
                $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
                if ($null -ne $manifest.sourceRepoPath -and $manifest.sourceRepoPath.ToString().Trim().Length -gt 0) {
                    $SourceRepoPath = $manifest.sourceRepoPath.ToString()
                    Write-Info "Using source repo from manifest: $SourceRepoPath"
                }
            }
            catch {
                Write-Info "Manifest exists but could not be parsed. Falling back to Setup.ps1 default source repo resolution."
            }
        }
        else {
            Write-Info "No manifest source available; falling back to Setup.ps1 default source repo resolution."
        }
    }

    $args = @{
        InstallRoot = $InstallRoot
    }

    if (-not [string]::IsNullOrWhiteSpace($SourceRepoPath)) {
        $args.SourceRepoPath = $SourceRepoPath
    }

    if ($Force) {
        $args.Force = $true
    }

    Write-Info "Running Setup.ps1 in update mode..."
    & $setupScriptPath @args
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        Fail "Update failed because Setup.ps1 returned exit code $exitCode"
    }

    Write-Host "[OK] Update complete."
    exit 0
}
catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
