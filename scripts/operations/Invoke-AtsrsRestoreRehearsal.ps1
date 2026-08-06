[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$BackupFile,
  [Parameter(Mandatory)][string]$StagingDatabaseUrl,
  [Parameter(Mandatory)][Security.SecureString]$StagingDatabasePassword,
  [string]$PostgresBin = 'C:\Users\user\Documents\GitHub\output\postgresql-17.10-client-extract\bin',
  [string]$SecretPath = (Join-Path $env:LOCALAPPDATA 'ATSRS\Backup\secrets.clixml')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$productionRef = 'hwtjuqyxzivymofamwxl'
$stagingRef = 'nsbmbbqgekcwmdqmqsao'
if ($StagingDatabaseUrl -match [regex]::Escape($productionRef)) {
  throw 'Production target detected; restore is refused'
}
if ($StagingDatabaseUrl -notmatch [regex]::Escape($stagingRef)) {
  throw 'Restore target is not the approved ATSRS staging project'
}
if ($StagingDatabaseUrl -match '://[^/@:]+:[^/@]+@') {
  throw 'StagingDatabaseUrl must not contain a password'
}
if ($env:ATSRS_DISPOSABLE_RESTORE_CONFIRMED -ne 'YES-ERASE-STAGING') {
  throw 'Set ATSRS_DISPOSABLE_RESTORE_CONFIRMED=YES-ERASE-STAGING only after confirming staging may be erased'
}

foreach ($tool in @('pg_restore.exe', 'psql.exe')) {
  if (-not (Test-Path -LiteralPath (Join-Path $PostgresBin $tool) -PathType Leaf)) {
    throw "Required PostgreSQL tool is missing: $tool"
  }
}

Import-Module (Join-Path $PSScriptRoot 'AtsrsBackup.Common.psm1') -Force
$secrets = Get-AtsrsSecretStore -Path $SecretPath
$stagingPassword = ConvertFrom-AtsrsSecureString -SecureString $StagingDatabasePassword
$workRoot = Join-Path ([IO.Path]::GetTempPath()) "ar-$([Guid]::NewGuid().ToString('N').Substring(0, 8))"
$zip = Join-Path $workRoot 'payload.zip'
$payload = Join-Path $workRoot 'payload'
New-Item -ItemType Directory -Path $workRoot -Force | Out-Null

try {
  & (Join-Path $PSScriptRoot 'Test-AtsrsBackup.ps1') -BackupFile $BackupFile -SecretPath $SecretPath
  Unprotect-AtsrsBackupFile -InputPath (Resolve-Path -LiteralPath $BackupFile).Path -OutputPath $zip -Passphrase $secrets.BackupPassphrase
  Expand-Archive -LiteralPath $zip -DestinationPath $payload

  $env:PGPASSWORD = $stagingPassword
  & (Join-Path $PostgresBin 'pg_restore.exe') `
    --clean --if-exists --no-owner --no-acl --exit-on-error `
    --dbname=$StagingDatabaseUrl (Join-Path $payload 'database.dump')
  if ($LASTEXITCODE -ne 0) { throw 'Staging restore failed' }

  $validationSql = @'
select json_build_object(
  'public_tables', (select count(*) from pg_tables where schemaname = 'public'),
  'rls_tables', (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relrowsecurity),
  'storage_objects', (select count(*) from storage.objects),
  'auth_users', (select count(*) from auth.users)
);
'@
  $aggregate = & (Join-Path $PostgresBin 'psql.exe') -X -A -t --set ON_ERROR_STOP=1 --dbname=$StagingDatabaseUrl --command=$validationSql
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace(($aggregate -join ''))) {
    throw 'Aggregate restore validation failed'
  }

  Write-Output 'TARGET=STAGING'
  Write-Output "AGGREGATE_VALIDATION=$($aggregate -join '')"
  Write-Output 'RESTORE_REHEARSAL=PASS'
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  $stagingPassword = $null
  if (Test-Path -LiteralPath $workRoot) {
    Remove-Item -LiteralPath $workRoot -Recurse -Force
  }
}
