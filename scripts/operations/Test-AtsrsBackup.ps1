[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$BackupFile,
  [string]$SecretPath = (Join-Path $env:LOCALAPPDATA 'ATSRS\Backup\secrets.clixml'),
  [string]$PostgresBin = 'C:\Users\user\Documents\GitHub\output\postgresql-17.10-client-extract\bin'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Import-Module (Join-Path $PSScriptRoot 'AtsrsBackup.Common.psm1') -Force

$resolved = (Resolve-Path -LiteralPath $BackupFile).Path
$sidecar = "$resolved.sha256"
if (-not (Test-Path -LiteralPath $sidecar -PathType Leaf)) {
  throw 'Encrypted backup checksum sidecar is missing'
}
$line = (Get-Content -LiteralPath $sidecar -Raw).Trim()
if ($line -notmatch '^([0-9A-Fa-f]{64})\s+') {
  throw 'Encrypted backup checksum sidecar is invalid'
}
if ((Get-FileHash -LiteralPath $resolved -Algorithm SHA256).Hash -ne $Matches[1].ToUpperInvariant()) {
  throw 'Encrypted backup checksum mismatch'
}

$secrets = Get-AtsrsSecretStore -Path $SecretPath
$workRoot = Join-Path ([IO.Path]::GetTempPath()) "at-$([Guid]::NewGuid().ToString('N').Substring(0, 8))"
$zip = Join-Path $workRoot 'payload.zip'
$extract = Join-Path $workRoot 'payload'
New-Item -ItemType Directory -Path $workRoot -Force | Out-Null

try {
  Unprotect-AtsrsBackupFile -InputPath $resolved -OutputPath $zip -Passphrase $secrets.BackupPassphrase
  Expand-Archive -LiteralPath $zip -DestinationPath $extract
  foreach ($required in @('manifest.json', 'SHA256SUMS.txt', 'roles.sql', 'schema.sql', 'data.sql', 'database.dump', 'source-hashes.json')) {
    if (-not (Test-Path -LiteralPath (Join-Path $extract $required) -PathType Leaf)) {
      throw "Backup package is missing $required"
    }
  }

  foreach ($hashLine in Get-Content -LiteralPath (Join-Path $extract 'SHA256SUMS.txt')) {
    if ($hashLine -notmatch '^([0-9A-Fa-f]{64})\s+(.+)$') {
      throw 'Invalid internal checksum line'
    }
    $target = Join-Path $extract ($Matches[2] -replace '/', [IO.Path]::DirectorySeparatorChar)
    if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
      throw "Backup package member is missing: $($Matches[2])"
    }
    if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -ne $Matches[1].ToUpperInvariant()) {
      throw "Backup package member checksum failed: $($Matches[2])"
    }
  }
  $manifest = Get-Content -LiteralPath (Join-Path $extract 'manifest.json') -Raw | ConvertFrom-Json
  if ($manifest.project_ref -ne 'hwtjuqyxzivymofamwxl' -or -not $manifest.encrypted) {
    throw 'Backup manifest does not identify an encrypted ATSRS production package'
  }
  $pgRestore = Join-Path $PostgresBin 'pg_restore.exe'
  if (-not (Test-Path -LiteralPath $pgRestore -PathType Leaf)) {
    throw 'pg_restore is required for non-destructive dump catalog validation'
  }
  & $pgRestore --list (Join-Path $extract 'database.dump') | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw 'PostgreSQL custom dump catalog validation failed'
  }

  Write-Output 'OUTER_CHECKSUM=PASS'
  Write-Output 'AUTHENTICATED_DECRYPTION=PASS'
  Write-Output 'INTERNAL_CHECKSUMS=PASS'
  Write-Output 'PACKAGE_STRUCTURE=PASS'
  Write-Output 'POSTGRES_DUMP_CATALOG=PASS'
} finally {
  if (Test-Path -LiteralPath $workRoot) {
    Remove-Item -LiteralPath $workRoot -Recurse -Force
  }
}
