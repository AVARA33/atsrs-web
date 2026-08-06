[CmdletBinding()]
param(
  [string]$SecretPath = (Join-Path $env:LOCALAPPDATA 'ATSRS\Backup\secrets.clixml')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not (Test-Path -LiteralPath $SecretPath -PathType Leaf)) {
  throw 'ATSRS protected secret store does not exist'
}

$secrets = Import-Clixml -LiteralPath $SecretPath
$newToken = Read-Host 'Supabase personal access token for aggregate log monitoring' -AsSecureString

[pscustomobject]@{
  Version = 2
  CreatedAtUtc = $secrets.CreatedAtUtc
  UpdatedAtUtc = [DateTime]::UtcNow.ToString('o')
  DatabasePassword = $secrets.DatabasePassword
  BackupPassphrase = $secrets.BackupPassphrase
  ServiceRoleKey = $secrets.ServiceRoleKey
  ManagementAccessToken = $newToken
} | Export-Clixml -LiteralPath $SecretPath -Force

$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
& icacls.exe $SecretPath '/inheritance:r' "/grant:r" "${identity}:(F)" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Unable to restrict the secret-store ACL' }

Write-Output 'MANAGEMENT_ACCESS_TOKEN_UPDATED=YES'
Write-Output 'SECRET_DISPLAYED=NO'
