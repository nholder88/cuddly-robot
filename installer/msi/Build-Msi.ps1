[CmdletBinding()]
param(
    [Parameter()]
    [string]$OutputDirectory = (Join-Path $PSScriptRoot "out"),

    [Parameter()]
    [string]$MsiName = "AI-Agent-Workflows-Pack.msi"
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
    $wix = Get-Command wix -ErrorAction SilentlyContinue
    if ($null -eq $wix) {
        Fail "WiX CLI not found. Install WiX v4+ and ensure `wix` is on PATH."
    }

    $wxsPath = Join-Path $PSScriptRoot "AgentPack.wxs"
    if (-not (Test-Path -LiteralPath $wxsPath -PathType Leaf)) {
        Fail "WXS file not found: $wxsPath"
    }

    if (-not (Test-Path -LiteralPath $OutputDirectory)) {
        New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
    }

    $outputMsi = Join-Path $OutputDirectory $MsiName
    Write-Info "Building MSI to: $outputMsi"

    & wix build $wxsPath -arch x64 -o $outputMsi
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        Fail "WiX build failed with exit code $exitCode"
    }

    Write-Host "[OK] MSI created: $outputMsi" -ForegroundColor Green
    exit 0
}
catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
