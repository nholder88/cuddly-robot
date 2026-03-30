[CmdletBinding()]
param(
    [Parameter()]
    [string]$InstallRoot,

    [Parameter()]
    [switch]$RemoveInstallRoot,

    [Parameter()]
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message"
}

function Write-Ok {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Fail {
    param([string]$Message)
    throw "[ERROR] $Message"
}

function Is-ManagedInstallRoot {
    param([Parameter(Mandatory = $true)][string]$RootPath)

    $markerPath = Join-Path $RootPath ".managed-by-ai-agent-workflows"
    $manifestPath = Join-Path $RootPath "install-manifest.json"
    return (Test-Path -LiteralPath $markerPath -PathType Leaf) -and (Test-Path -LiteralPath $manifestPath -PathType Leaf)
}

function Remove-FileIfPresent {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (Test-Path -LiteralPath $Path -PathType Leaf) {
        Remove-Item -LiteralPath $Path -Force
        return $true
    }

    return $false
}

function Remove-EmptyParentDirectories {
    param(
        [Parameter(Mandatory = $true)][string]$StartPath,
        [Parameter(Mandatory = $true)][string]$StopPath
    )

    $cursor = Split-Path -Parent $StartPath
    while (-not [string]::IsNullOrWhiteSpace($cursor)) {
        if ($cursor -eq $StopPath) {
            break
        }

        if (-not (Test-Path -LiteralPath $cursor -PathType Container)) {
            $cursor = Split-Path -Parent $cursor
            continue
        }

        $children = @(Get-ChildItem -LiteralPath $cursor -Force)
        if ($children.Count -gt 0) {
            break
        }

        Remove-Item -LiteralPath $cursor -Force
        $cursor = Split-Path -Parent $cursor
    }
}

try {
    if ([string]::IsNullOrWhiteSpace($InstallRoot)) {
        $InstallRoot = Join-Path ([Environment]::GetFolderPath("LocalApplicationData")) "ai-agent-workflows-pack"
    }

    $rootPath = [System.IO.Path]::GetFullPath($InstallRoot)

    if (-not (Test-Path -LiteralPath $rootPath -PathType Container)) {
        Write-Info "Install root does not exist; nothing to uninstall: $rootPath"
        exit 0
    }

    if (-not (Is-ManagedInstallRoot -RootPath $rootPath)) {
        if (-not $Force) {
            Fail "Refusing uninstall because root is not recognized as managed by this installer: $rootPath"
        }

        Write-Warn "Proceeding with -Force on unrecognized install root."
    }

    $manifestPath = Join-Path $rootPath "install-manifest.json"
    if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
        if (-not $Force) {
            Fail "Manifest not found at expected path: $manifestPath"
        }

        Write-Warn "No manifest found. Skipping target cleanup because -Force was used."
    }
    else {
        $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
        $targetEntries = @($manifest.targets)

        foreach ($target in $targetEntries) {
            $promptsPath = $target.promptsPath
            $removedFiles = 0

            foreach ($installedFile in @($target.installedFiles)) {
                if (Remove-FileIfPresent -Path $installedFile) {
                    $removedFiles += 1
                    Remove-EmptyParentDirectories -StartPath $installedFile -StopPath $promptsPath
                }
            }

            $templatesPath = $target.templatesPath
            if (-not [string]::IsNullOrWhiteSpace($templatesPath) -and (Test-Path -LiteralPath $templatesPath -PathType Container)) {
                $remaining = @(Get-ChildItem -LiteralPath $templatesPath -Force)
                if ($remaining.Count -eq 0) {
                    Remove-Item -LiteralPath $templatesPath -Force
                }
            }

            Write-Info "Target [$($target.target)] removed files: $removedFiles"
        }

        $workspacePayload = $manifest.workspace
        if ($null -ne $workspacePayload) {
            $wsRoot = $workspacePayload.root
            $wsFiles = @($workspacePayload.installedFiles)
            if ($wsFiles.Count -gt 0) {
                $removedWs = 0
                foreach ($installedFile in $wsFiles) {
                    if (Remove-FileIfPresent -Path $installedFile) {
                        $removedWs += 1
                        if (-not [string]::IsNullOrWhiteSpace($wsRoot)) {
                            Remove-EmptyParentDirectories -StartPath $installedFile -StopPath $wsRoot
                        }
                    }
                }
                Write-Info "Workspace removed files: $removedWs"
            }
        }
    }

    $managedFiles = @("install-manifest.json", ".managed-by-ai-agent-workflows")
    foreach ($file in $managedFiles) {
        $fullFile = Join-Path $rootPath $file
        if (Test-Path -LiteralPath $fullFile -PathType Leaf) {
            Remove-Item -LiteralPath $fullFile -Force
            Write-Info "Removed: $fullFile"
        }
    }

    if ($RemoveInstallRoot) {
        $remaining = @(Get-ChildItem -LiteralPath $rootPath -Force)
        if ($remaining.Count -eq 0) {
            Remove-Item -LiteralPath $rootPath -Force
            Write-Info "Removed empty install root: $rootPath"
        }
        else {
            Write-Warn "Install root not empty; leaving in place: $rootPath"
        }
    }

    Write-Ok "Uninstall complete."
    Write-Host "Install root: $rootPath"
    exit 0
}
catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
