$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$backup = Get-Content -LiteralPath (Join-Path $root 'scripts\operations\New-AtsrsProductionBackup.ps1') -Raw
$restore = Get-Content -LiteralPath (Join-Path $root 'scripts\operations\Invoke-AtsrsRestoreRehearsal.ps1') -Raw
$gitignore = Get-Content -LiteralPath (Join-Path $root '.gitignore') -Raw

foreach ($required in @('hwtjuqyxzivymofamwxl', 'Protect-AtsrsBackupFile', 'SHA256SUMS.txt', 'storage.objects', 'PLAINTEXT_RETAINED=NO')) {
  if (-not $backup.Contains($required)) { throw "Backup safety contract missing: $required" }
}
foreach ($required in @('nsbmbbqgekcwmdqmqsao', 'YES-ERASE-STAGING', 'Production target detected', 'RESTORE_REHEARSAL=PASS')) {
  if (-not $restore.Contains($required)) { throw "Restore safety contract missing: $required" }
}
foreach ($required in @('*.atsrsbak', '*.dump', 'secrets.clixml', 'supabase/.temp/')) {
  if (-not $gitignore.Contains($required)) { throw "Git exclusion missing: $required" }
}

Write-Output 'BACKUP_GUARDS=PASS'
Write-Output 'RESTORE_GUARDS=PASS'
Write-Output 'GIT_EXCLUSIONS=PASS'
