[CmdletBinding()]
param(
  [string]$RepoRoot,
  [switch]$IncludeLogMonitor
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

$secretPath = Join-Path $env:LOCALAPPDATA 'ATSRS\Backup\secrets.clixml'
if (-not (Test-Path -LiteralPath $secretPath -PathType Leaf)) {
  throw 'Protected secret store is not initialized'
}

$powershell = (Get-Command powershell.exe).Source
$backupScript = Join-Path $RepoRoot 'scripts\operations\New-AtsrsProductionBackup.ps1'
$healthScript = Join-Path $RepoRoot 'scripts\operations\Test-AtsrsProductionHealth.ps1'
$logScript = Join-Path $RepoRoot 'scripts\operations\Get-AtsrsProductionLogHealth.ps1'
$mirrorRoot = [Environment]::GetEnvironmentVariable('ATSRS_BACKUP_MIRROR_DIR', 'User')
$mirrorArgument = ''
if (-not [string]::IsNullOrWhiteSpace($mirrorRoot)) {
  $mirrorArgument = " -MirrorRoot `"$mirrorRoot`""
}

$backupAction = New-ScheduledTaskAction -Execute $powershell -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$backupScript`" -ApplyRetention$mirrorArgument"
$backupTrigger = New-ScheduledTaskTrigger -Daily -At '02:15'
$healthAction = New-ScheduledTaskAction -Execute $powershell -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$healthScript`""
$healthTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 10)
$logAction = New-ScheduledTaskAction -Execute $powershell -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$logScript`""
$logTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval (New-TimeSpan -Minutes 15)

& $healthScript | Out-Null
if ($IncludeLogMonitor) {
  & $logScript | Out-Null
}

Register-ScheduledTask -TaskName 'ATSRS Encrypted Production Backup' -Action $backupAction -Trigger $backupTrigger -Description 'Encrypted database and Storage backup with checksums' -Force | Out-Null
Register-ScheduledTask -TaskName 'ATSRS Production Health Monitor' -Action $healthAction -Trigger $healthTrigger -Description 'Aggregate frontend, Supabase and CPU health monitoring' -Force | Out-Null
if ($IncludeLogMonitor) {
  Register-ScheduledTask -TaskName 'ATSRS Production Log Monitor' -Action $logAction -Trigger $logTrigger -Description 'Aggregate-only 5xx, timeout and Auth error monitoring' -Force | Out-Null
}

Write-Output 'SCHEDULED_BACKUP=READY'
Write-Output 'SCHEDULED_HEALTH_MONITOR=READY'
if ($IncludeLogMonitor) {
  Write-Output 'SCHEDULED_LOG_MONITOR=READY'
} else {
  Write-Output 'SCHEDULED_LOG_MONITOR=SKIPPED'
}
