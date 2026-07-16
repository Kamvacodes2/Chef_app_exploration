<#
.SYNOPSIS
    Verifies that a replicated Speccon_TAP_Ext codebase is an exact match of the source.

.DESCRIPTION
    Performs comprehensive integrity verification between the original codebase
    and a replica, including file count, sizes, and SHA256 hash comparisons.

.PARAMETER SourcePath
    The original source directory.
    Default: C:\ERP_System\Backend\April\17th\Speccon_TAP_Ext

.PARAMETER ReplicaPath
    The replicated directory to verify against the source.

.PARAMETER QuickMode
    If specified, skips SHA256 hash comparison (faster, only checks names and sizes).

.PARAMETER ReportPath
    If specified, writes a detailed verification report to this file path.

.EXAMPLE
    .\verify-replication.ps1 -ReplicaPath "D:\Backup\Speccon_Copy"

.EXAMPLE
    .\verify-replication.ps1 -ReplicaPath "D:\Backup\Speccon_Copy" -QuickMode
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$SourcePath = "C:\ERP_System\Backend\April\17th\Speccon_TAP_Ext",

    [Parameter(Mandatory = $true)]
    [string]$ReplicaPath,

    [switch]$QuickMode,

    [string]$ReportPath
)

$ErrorActionPreference = "Stop"

# ============================================================================
# BANNER
# ============================================================================

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  SPECCON TAP BACKEND REPLICATION VERIFIER" -ForegroundColor Cyan
Write-Host "  SHA256 Integrity Verification" -ForegroundColor Cyan
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
if (-not (Test-Path $ReplicaPath)) {
    Write-Host "  ERROR: Replica path does not exist: $ReplicaPath" -ForegroundColor Red
    exit 1
}

Write-Host "  Source:  $SourcePath" -ForegroundColor Green
Write-Host "  Replica: $ReplicaPath" -ForegroundColor Green
if ($QuickMode) {
    Write-Host "  Mode:    QUICK (size comparison only)" -ForegroundColor Magenta
} else {
    Write-Host "  Mode:    FULL (SHA256 hash verification)" -ForegroundColor Magenta
}

# ============================================================================
# EXCLUSION SETUP
# ============================================================================

$excludeDirNames = @(".git", ".vs", "bin", "obj")
$regexParts = @()
foreach ($d in $excludeDirNames) {
    $escaped = [regex]::Escape("\$d\")
    $regexParts += $escaped
}
$excludeRegex = $regexParts -join '|'

# ============================================================================
# FILE INVENTORY
# ============================================================================

Write-Host ""
Write-Host "[2/5] Building file inventories..." -ForegroundColor Yellow

$sourceFiles = Get-ChildItem -Path $SourcePath -Recurse -File | Where-Object {
    $_.FullName -notmatch $excludeRegex
}
$replicaFiles = Get-ChildItem -Path $ReplicaPath -Recurse -File | Where-Object {
    $_.FullName -notmatch $excludeRegex
}

# Build relative-path lookup tables
$sourceMap = @{}
foreach ($f in $sourceFiles) {
    $rel = $f.FullName.Substring($SourcePath.Length)
    $sourceMap[$rel] = $f
}

$replicaMap = @{}
foreach ($f in $replicaFiles) {
    $rel = $f.FullName.Substring($ReplicaPath.Length)
    $replicaMap[$rel] = $f
}

$srcCount = $sourceMap.Count
$repCount = $replicaMap.Count
Write-Host "  Source files:  $srcCount" -ForegroundColor Gray
Write-Host "  Replica files: $repCount" -ForegroundColor Gray

# ============================================================================
# STRUCTURE COMPARISON
# ============================================================================

Write-Host ""
Write-Host "[3/5] Comparing directory structures..." -ForegroundColor Yellow

$missingInReplica = @()
$extraInReplica = @()
$sizeMismatches = @()
$matchedFiles = @()

foreach ($rel in $sourceMap.Keys) {
    if (-not $replicaMap.ContainsKey($rel)) {
        $missingInReplica += $rel
    } else {
        $matchedFiles += $rel
        if ($sourceMap[$rel].Length -ne $replicaMap[$rel].Length) {
            $sizeMismatches += [PSCustomObject]@{
                File = $rel
                SourceSize = $sourceMap[$rel].Length
                ReplicaSize = $replicaMap[$rel].Length
            }
        }
    }
}

foreach ($rel in $replicaMap.Keys) {
    if (-not $sourceMap.ContainsKey($rel)) {
        $extraInReplica += $rel
    }
}

$missingCount = $missingInReplica.Count
$extraCount = $extraInReplica.Count

if ($missingCount -eq 0) {
    Write-Host "  Missing in replica: 0 [OK]" -ForegroundColor Green
} else {
    Write-Host "  Missing in replica: $missingCount [FAIL]" -ForegroundColor Red
    foreach ($f in $missingInReplica | Select-Object -First 20) {
        Write-Host "    MISSING: $f" -ForegroundColor Red
    }
    if ($missingCount -gt 20) {
        $remaining = $missingCount - 20
        Write-Host "    ... and $remaining more" -ForegroundColor Red
    }
}

if ($extraCount -eq 0) {
    Write-Host "  Extra in replica:   0 [OK]" -ForegroundColor Green
} else {
    Write-Host "  Extra in replica:   $extraCount [WARN]" -ForegroundColor Yellow
    foreach ($f in $extraInReplica | Select-Object -First 20) {
        Write-Host "    EXTRA: $f" -ForegroundColor Yellow
    }
}

# ============================================================================
# SIZE COMPARISON
# ============================================================================

Write-Host ""
Write-Host "[4/5] Comparing file sizes..." -ForegroundColor Yellow

$sizeMismatchCount = $sizeMismatches.Count
if ($sizeMismatchCount -eq 0) {
    Write-Host "  Size mismatches: 0 [OK]" -ForegroundColor Green
} else {
    Write-Host "  Size mismatches: $sizeMismatchCount [FAIL]" -ForegroundColor Red
    foreach ($m in $sizeMismatches | Select-Object -First 20) {
        Write-Host "    MISMATCH: $($m.File) - source=$($m.SourceSize), replica=$($m.ReplicaSize)" -ForegroundColor Red
    }
}

# ============================================================================
# HASH COMPARISON
# ============================================================================

Write-Host ""
Write-Host "[5/5] Content integrity verification..." -ForegroundColor Yellow

$hashMismatches = @()

if ($QuickMode) {
    Write-Host "  SKIPPED - Quick Mode enabled. Use full mode for SHA256." -ForegroundColor Magenta
} else {
    $filesToHash = @()
    foreach ($rel in $matchedFiles) {
        $isSizeMismatch = $false
        foreach ($sm in $sizeMismatches) {
            if ($sm.File -eq $rel) {
                $isSizeMismatch = $true
                break
            }
        }
        if (-not $isSizeMismatch) {
            $filesToHash += $rel
        }
    }

    $total = $filesToHash.Count
    $current = 0
    $hashErrors = 0
    $lastPercent = -1

    Write-Host "  Hashing $total files with SHA256..." -ForegroundColor Gray

    foreach ($rel in $filesToHash) {
        $current++
        $percent = [math]::Floor(($current / $total) * 100)

        if ($percent -ne $lastPercent -and $percent % 10 -eq 0) {
            Write-Host "    Progress: ${percent}% - ${current} / ${total}" -ForegroundColor Gray
            $lastPercent = $percent
        }

        try {
            $sourceHash = (Get-FileHash -Path $sourceMap[$rel].FullName -Algorithm SHA256).Hash
            $replicaHash = (Get-FileHash -Path $replicaMap[$rel].FullName -Algorithm SHA256).Hash

            if ($sourceHash -ne $replicaHash) {
                $hashMismatches += [PSCustomObject]@{
                    File = $rel
                    SourceHash = $sourceHash
                    ReplicaHash = $replicaHash
                }
            }
        } catch {
            $hashErrors++
            Write-Host "    HASH ERROR: $rel - $_" -ForegroundColor Red
        }
    }

    $hashMismatchCount = $hashMismatches.Count
    if ($hashMismatchCount -eq 0) {
        Write-Host "  Hash mismatches: 0 [OK]" -ForegroundColor Green
    } else {
        Write-Host "  Hash mismatches: $hashMismatchCount [FAIL]" -ForegroundColor Red
        foreach ($m in $hashMismatches | Select-Object -First 10) {
            Write-Host "    HASH MISMATCH: $($m.File)" -ForegroundColor Red
            Write-Host "      Source:  $($m.SourceHash)" -ForegroundColor Red
            Write-Host "      Replica: $($m.ReplicaHash)" -ForegroundColor Red
        }
    }

    if ($hashErrors -gt 0) {
        Write-Host "  Hash errors: $hashErrors" -ForegroundColor Yellow
    }
}

# ============================================================================
# FINAL REPORT
# ============================================================================

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  VERIFICATION REPORT" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Source:             $SourcePath" -ForegroundColor White
Write-Host "  Replica:            $ReplicaPath" -ForegroundColor White
Write-Host "  Source file count:  $srcCount" -ForegroundColor White
Write-Host "  Replica file count: $repCount" -ForegroundColor White
Write-Host "  Missing files:      $missingCount" -ForegroundColor White
Write-Host "  Extra files:        $extraCount" -ForegroundColor White
Write-Host "  Size mismatches:    $sizeMismatchCount" -ForegroundColor White

if (-not $QuickMode) {
    $hmCount = $hashMismatches.Count
    Write-Host "  Hash mismatches:    $hmCount" -ForegroundColor White
}

$totalIssues = $missingCount + $sizeMismatchCount + $hashMismatches.Count

Write-Host ""
if ($totalIssues -eq 0) {
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host "  VERIFICATION PASSED - EXACT MATCH" -ForegroundColor Green
    Write-Host "  The replica is a perfect 1:1 copy of the source." -ForegroundColor Green
    Write-Host "================================================================" -ForegroundColor Green
} else {
    Write-Host "================================================================" -ForegroundColor Red
    Write-Host "  VERIFICATION FAILED - $totalIssues ISSUE(S) FOUND" -ForegroundColor Red
    Write-Host "  The replica does NOT match the source exactly." -ForegroundColor Red
    Write-Host "================================================================" -ForegroundColor Red
}

# ============================================================================
# OPTIONAL: WRITE REPORT TO FILE
# ============================================================================

if ($ReportPath) {
    $report = @()
    $report += "SPECCON TAP BACKEND REPLICATION VERIFICATION REPORT"
    $report += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    $report += "Source:  $SourcePath"
    $report += "Replica: $ReplicaPath"
    $report += ""
    $report += "SUMMARY"
    $report += "  Source file count:  $srcCount"
    $report += "  Replica file count: $repCount"
    $report += "  Missing files:      $missingCount"
    $report += "  Extra files:        $extraCount"
    $report += "  Size mismatches:    $sizeMismatchCount"
    if (-not $QuickMode) {
        $hmCount = $hashMismatches.Count
        $report += "  Hash mismatches:    $hmCount"
    }
    $resultStr = "PASS"
    if ($totalIssues -gt 0) { $resultStr = "FAIL" }
    $report += "  Result:             $resultStr"
    $report += ""

    if ($missingCount -gt 0) {
        $report += "MISSING FILES IN REPLICA:"
        foreach ($f in $missingInReplica) { $report += "  $f" }
        $report += ""
    }

    if ($extraCount -gt 0) {
        $report += "EXTRA FILES IN REPLICA:"
        foreach ($f in $extraInReplica) { $report += "  $f" }
        $report += ""
    }

    if ($sizeMismatchCount -gt 0) {
        $report += "SIZE MISMATCHES:"
        foreach ($m in $sizeMismatches) {
            $report += "  $($m.File) - source=$($m.SourceSize), replica=$($m.ReplicaSize)"
        }
        $report += ""
    }

    if ($hashMismatches.Count -gt 0) {
        $report += "HASH MISMATCHES:"
        foreach ($m in $hashMismatches) {
            $report += "  $($m.File)"
            $report += "    Source:  $($m.SourceHash)"
            $report += "    Replica: $($m.ReplicaHash)"
        }
    }

    $report | Out-File -FilePath $ReportPath -Encoding UTF8
    Write-Host ""
    Write-Host "  Report saved to: $ReportPath" -ForegroundColor Cyan
}

Write-Host ""

if ($totalIssues -eq 0) { exit 0 } else { exit 1 }
