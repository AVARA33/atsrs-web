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
$newServiceRoleKey = Read-Host 'Production service-role key' -AsSecureString

[pscustomobject]@{
  Version = 2
  CreatedAtUtc = $secrets.CreatedAtUtc
  UpdatedAtUtc = [DateTime]::UtcNow.ToString('o')
  DatabasePassword = $secrets.DatabasePassword
  BackupPassphrase = $secrets.BackupPassphrase
  ServiceRoleKey = $newServiceRoleKey
  ManagementAccessToken = $secrets.ManagementAccessToken
} | Export-Clixml -LiteralPath $SecretPath -Force

$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
& icacls.exe $SecretPath '/inheritance:r' "/grant:r" "${identity}:(F)" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Unable to restrict the secret-store ACL' }

Write-Output 'SERVICE_ROLE_KEY_UPDATED=YES'
Write-Output 'SECRET_DISPLAYED=NO'
