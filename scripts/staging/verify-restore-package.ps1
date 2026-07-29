param(
  [string]$BackupDirectory = 'C:\Users\user\Documents\GitHub\output\atsrs-database-backup-20260729-001024',
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
  [switch]$ValidatePackageOnly,
  [string]$PsqlPath = 'psql'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$productionRef = 'hwtjuqyxzivymofamwxl'
$requiredBackupFiles = @(
  'SHA256SUMS.txt',
  'backup-manifest.txt',
  'public-schema.sql',
  'data-public-atsrs_workspace_data.sql',
  'data-public-atsrs_files.sql',
  'data-public-atsrs_workspaces.sql'
)

if (-not (Test-Path -LiteralPath $BackupDirectory -PathType Container)) {
  throw "Backup directory does not exist: $BackupDirectory"
}

foreach ($name in $requiredBackupFiles) {
  $file = Join-Path $BackupDirectory $name
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
    throw "Required backup file is missing: $name"
  }
}

$hashFailures = [System.Collections.Generic.List[string]]::new()
foreach ($line in Get-Content -LiteralPath (Join-Path $BackupDirectory 'SHA256SUMS.txt')) {
  if ($line -notmatch '^([0-9A-Fa-f]{64})\s+(.+)$') {
    throw "Invalid SHA256SUMS line"
  }
  $expected = $Matches[1].ToUpperInvariant()
  $relative = $Matches[2]
  $target = Join-Path $BackupDirectory $relative
  if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
    $hashFailures.Add("$relative (missing)")
    continue
  }
  $actual = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
  if ($actual -ne $expected) {
    $hashFailures.Add("$relative (hash mismatch)")
  }
}
if ($hashFailures.Count -gt 0) {
  throw "Backup integrity failed: $($hashFailures -join ', ')"
}

$nodePath = 'C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
if (-not (Test-Path -LiteralPath $nodePath -PathType Leaf)) {
  throw "Bundled Node runtime is unavailable"
}

$contractTests = @(
  'tests\migration-repository-state.test.cjs',
  'tests\migration-reconciliation.test.cjs',
  'tests\reconciliation-baselines.test.cjs',
  'tests\stable-id-contract.test.cjs',
  'tests\canonical-checksum.test.cjs',
  'tests\staging-package.test.cjs'
)
foreach ($relative in $contractTests) {
  & $nodePath (Join-Path $RepoRoot $relative)
  if ($LASTEXITCODE -ne 0) {
    throw "Contract test failed: $relative"
  }
}

Write-Output 'PACKAGE_INTEGRITY=PASS'
Write-Output 'BACKUP_HASHES=PASS'
Write-Output "CONTRACT_TESTS=$($contractTests.Count)/$($contractTests.Count)"

if ($ValidatePackageOnly) {
  Write-Output 'DATABASE_CHECKS=SKIPPED_PACKAGE_ONLY'
  exit 0
}

if ([string]::IsNullOrWhiteSpace($env:ATSRS_STAGING_PROJECT_REF)) {
  throw 'ATSRS_STAGING_PROJECT_REF must identify an approved staging project'
}
if ($env:ATSRS_STAGING_PROJECT_REF -eq $productionRef) {
  throw 'Refusing to run verification against the production project'
}
if ([string]::IsNullOrWhiteSpace($env:PGHOST) -or
    [string]::IsNullOrWhiteSpace($env:PGDATABASE) -or
    [string]::IsNullOrWhiteSpace($env:PGUSER)) {
  throw 'Use PGHOST, PGDATABASE and PGUSER for the approved staging connection'
}
if ($env:PGHOST -like "*$productionRef*") {
  throw 'Refusing a database host containing the production project ref'
}

$psql = Get-Command $PsqlPath -ErrorAction Stop
$verifySql = Join-Path $RepoRoot 'supabase\audit\staging-restore-verify.sql'
$stableVerifySql = Join-Path $RepoRoot 'supabase\activation\stable-id-verify.sql'

& $psql.Source -X --set ON_ERROR_STOP=1 --file $verifySql
if ($LASTEXITCODE -ne 0) {
  throw 'Staging aggregate verification failed'
}

& $psql.Source -X --set ON_ERROR_STOP=1 --file $stableVerifySql
if ($LASTEXITCODE -ne 0) {
  throw 'Stable-ID verification failed'
}

Write-Output 'DATABASE_CHECKS=PASS'
