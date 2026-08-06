[CmdletBinding()]
param(
  [string]$SecretPath = (Join-Path $env:LOCALAPPDATA 'ATSRS\Backup\secrets.clixml')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$parent = Split-Path -Parent $SecretPath
New-Item -ItemType Directory -Path $parent -Force | Out-Null

$databasePassword = Read-Host 'Production database password' -AsSecureString
$backupPassphrase = Read-Host 'Portable backup encryption passphrase' -AsSecureString
$serviceRoleKey = Read-Host 'Production service-role key (for private Storage backup)' -AsSecureString
$managementAccessToken = Read-Host 'Supabase personal access token (for aggregate-only log monitoring)' -AsSecureString

[pscustomobject]@{
  Version = 2
  CreatedAtUtc = [DateTime]::UtcNow.ToString('o')
  DatabasePassword = $databasePassword
  BackupPassphrase = $backupPassphrase
  ServiceRoleKey = $serviceRoleKey
  ManagementAccessToken = $managementAccessToken
} | Export-Clixml -LiteralPath $SecretPath -Force

$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
& icacls.exe $SecretPath '/inheritance:r' "/grant:r" "${identity}:(F)" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Unable to restrict the secret-store ACL' }

Write-Output "SECRET_STORE_READY=$SecretPath"
Write-Output 'SECRETS_DISPLAYED=NO'
