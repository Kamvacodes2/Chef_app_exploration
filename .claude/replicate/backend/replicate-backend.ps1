<#
.SYNOPSIS
    Replicates the Speccon_TAP_Ext backend codebase to a target directory.

.DESCRIPTION
    Creates an exact one-to-one copy of the Speccon_TAP_Ext backend codebase
    using robocopy for reliable file mirroring. Preserves directory structure,
    file timestamps, and binary content integrity.

.PARAMETER SourcePath
    The source directory to replicate from.
    Default: C:\ERP_System\Backend\April\17th\Speccon_TAP_Ext

.PARAMETER DestinationPath
    The target directory where the replica will be created. REQUIRED.

.PARAMETER IncludeBuildArtifacts
    If specified, includes bin/, obj/, and .vs/ directories in the copy.

.PARAMETER DryRun
    If specified, shows what would be copied without actually copying.

.EXAMPLE
    .\replicate-backend.ps1 -DestinationPath "D:\Backup\Speccon_Copy"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$SourcePath = "C:\ERP_System\Backend\April\17th\Speccon_TAP_Ext",

    [Parameter(Mandatory = $true)]
    [string]$DestinationPath,

    [switch]$IncludeBuildArtifacts,

    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# Directories to exclude by default
$DefaultExcludeDirs = @(".git", ".vs", "bin", "obj")
$MinimalExcludeDirs = @(".git")

# ============================================================================
# BANNER
# ============================================================================

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  SPECCON TAP BACKEND CODEBASE REPLICATION SKILL" -ForegroundColor Cyan
Write-Host "  Exact 1:1 Mirror Copy" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# VALIDATION
# ============================================================================

Write-Host "[1/5] Validating paths..." -ForegroundColor Yellow

if (-not (Test-Path $SourcePath)) {
    Write-Host "  ERROR: Source path does not exist: $SourcePath" -ForegroundColor Red
    exit 1
}

Write-Host "  Source:      $SourcePath" -ForegroundColor Green
Write-Host "  Destination: $DestinationPath" -ForegroundColor Green

if (-not (Test-Path $DestinationPath)) {
    Write-Host "  Creating destination directory..." -ForegroundColor Gray
    New-Item -ItemType Directory -Path $DestinationPath -Force | Out-Null
}

# ============================================================================
# DETERMINE EXCLUSIONS
# ============================================================================

Write-Host ""
Write-Host "[2/5] Configuring exclusions..." -ForegroundColor Yellow

if ($IncludeBuildArtifacts) {
    $ExcludeDirs = $MinimalExcludeDirs
    Write-Host "  Mode: FULL COPY (including build artifacts)" -ForegroundColor Magenta
} else {
    $ExcludeDirs = $DefaultExcludeDirs
    Write-Host "  Mode: SOURCE ONLY (excluding build artifacts)" -ForegroundColor Magenta
}

$excludeJoined = $ExcludeDirs -join ', '
Write-Host "  Excluded directories: $excludeJoined" -ForegroundColor Gray

# ============================================================================
# SOURCE ANALYSIS
# ============================================================================

Write-Host ""
Write-Host "[3/5] Analyzing source codebase..." -ForegroundColor Yellow

# Build exclusion regex for analysis
$regexParts = @()
foreach ($d in $ExcludeDirs) {
    $escaped = [regex]::Escape("\$d\")
    $regexParts += $escaped
}
$excludeRegex = $regexParts -join '|'

$sourceFiles = Get-ChildItem -Path $SourcePath -Recurse -File | Where-Object {
    $_.FullName -notmatch $excludeRegex
}

$totalFiles = $sourceFiles.Count
$totalSizeBytes = ($sourceFiles | Measure-Object -Property Length -Sum).Sum
$totalSizeMB = [math]::Round($totalSizeBytes / 1MB, 2)

Write-Host "  Files:       $totalFiles" -ForegroundColor Green
Write-Host "  Total size:  $totalSizeMB MB" -ForegroundColor Green

# File type breakdown
$fileTypes = $sourceFiles | Group-Object { $_.Extension.ToLower() } | Sort-Object Count -Descending | Select-Object -First 10
Write-Host ""
Write-Host "  Top file types:" -ForegroundColor Gray
foreach ($ft in $fileTypes) {
    $extName = $ft.Name
    if (-not $extName) { $extName = "(no ext)" }
    $padded = $extName.PadRight(15)
    Write-Host "    $padded $($ft.Count) files" -ForegroundColor Gray
}

# ============================================================================
# REPLICATION
# ============================================================================

Write-Host ""
Write-Host "[4/5] Replicating codebase..." -ForegroundColor Yellow

if ($DryRun) {
    Write-Host "  [DRY RUN] Showing what would be copied..." -ForegroundColor Magenta
}

$startTime = Get-Date

# Build robocopy command parts
$xdArgs = ""
foreach ($dir in $ExcludeDirs) {
    $xdArgs += " /XD `"$dir`""
}

$dryRunFlag = ""
if ($DryRun) {
    $dryRunFlag = " /L"
}

$robocopyCmd = "robocopy `"$SourcePath`" `"$DestinationPath`" /MIR /COPY:DAT /DCOPY:T /R:3 /W:2 /NP /NFL /NDL /MT:8$xdArgs$dryRunFlag"

Write-Host "  Executing: robocopy [source] [dest] /MIR /COPY:DAT /DCOPY:T /MT:8" -ForegroundColor Gray
Write-Host ""

$robocopyOutput = cmd /c $robocopyCmd 2>&1
$robocopyExitCode = $LASTEXITCODE

$endTime = Get-Date
$duration = $endTime - $startTime
$durationSec = [math]::Round($duration.TotalSeconds, 1)

# Robocopy exit codes: 0-7 are success, 8+ are errors
if ($robocopyExitCode -lt 8) {
    Write-Host "  Replication COMPLETED successfully!" -ForegroundColor Green
    Write-Host "  Duration: $durationSec seconds" -ForegroundColor Green

    # Parse robocopy summary lines
    $summaryLines = $robocopyOutput | Select-String -Pattern "(Dirs|Files|Bytes|Times)"
    if ($summaryLines) {
        Write-Host ""
        Write-Host "  Robocopy Summary:" -ForegroundColor Gray
        foreach ($line in $summaryLines) {
            $trimmed = $line.Line.Trim()
            Write-Host "    $trimmed" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "  ERROR: Robocopy failed with exit code $robocopyExitCode" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Full output:" -ForegroundColor Red
    foreach ($outLine in $robocopyOutput) {
        Write-Host "    $outLine" -ForegroundColor Red
    }
    exit 1
}

# ============================================================================
# POST-COPY VALIDATION
# ============================================================================

Write-Host ""
Write-Host "[5/5] Quick validation..." -ForegroundColor Yellow

if (-not $DryRun) {
    $replicaFiles = Get-ChildItem -Path $DestinationPath -Recurse -File | Where-Object {
        $_.FullName -notmatch $excludeRegex
    }

    $replicaCount = $replicaFiles.Count
    $replicaSizeBytes = ($replicaFiles | Measure-Object -Property Length -Sum).Sum
    $replicaSizeMB = [math]::Round($replicaSizeBytes / 1MB, 2)

    Write-Host "  Source files:  $totalFiles - $totalSizeMB MB" -ForegroundColor Gray
    Write-Host "  Replica files: $replicaCount - $replicaSizeMB MB" -ForegroundColor Gray

    if ($replicaCount -eq $totalFiles) {
        Write-Host "  File count:    MATCH [OK]" -ForegroundColor Green
    } else {
        Write-Host "  File count:    MISMATCH [FAIL] - source=$totalFiles, replica=$replicaCount" -ForegroundColor Red
    }

    if ($replicaSizeMB -eq $totalSizeMB) {
        Write-Host "  Total size:    MATCH [OK]" -ForegroundColor Green
    } else {
        Write-Host "  Total size:    MISMATCH [FAIL] - source=$totalSizeMB MB, replica=$replicaSizeMB MB" -ForegroundColor Red
    }
}

# ============================================================================
# DONE
# ============================================================================

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  REPLICATION COMPLETE" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Replica location: $DestinationPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "  For full integrity verification, run:" -ForegroundColor Gray
Write-Host "    .\verify-replication.ps1 -SourcePath `"$SourcePath`" -ReplicaPath `"$DestinationPath`"" -ForegroundColor White
Write-Host ""
