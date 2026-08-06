[CmdletBinding()]
param(
  [string]$DatabaseUrl,
  [string]$PostgresBin = 'C:\Users\user\Documents\GitHub\output\postgresql-17.10-client-extract\bin',
  [string]$SecretPath = (Join-Path $env:LOCALAPPDATA 'ATSRS\Backup\secrets.clixml')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Import-Module (Join-Path $PSScriptRoot 'AtsrsBackup.Common.psm1') -Force

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  $DatabaseUrl = (Get-Content -LiteralPath (Join-Path $repoRoot 'supabase\.temp\pooler-url') -Raw).Trim()
}
if ($DatabaseUrl -notmatch 'hwtjuqyxzivymofamwxl') {
  throw 'Refusing connection test because the URL does not identify ATSRS production'
}
if ($DatabaseUrl -notmatch '\?') {
  $DatabaseUrl = "${DatabaseUrl}?sslmode=require"
} elseif ($DatabaseUrl -notmatch 'sslmode=') {
  $DatabaseUrl = "$DatabaseUrl&sslmode=require"
}

$secrets = Get-AtsrsSecretStore -Path $SecretPath
$password = ConvertFrom-AtsrsSecureString -SecureString $secrets.DatabasePassword
try {
  $env:PGPASSWORD = $password
  $previousErrorPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $output = & (Join-Path $PostgresBin 'psql.exe') $DatabaseUrl -X -v ON_ERROR_STOP=1 -tAc 'select 1' 2>&1
  $ErrorActionPreference = $previousErrorPreference
  if ($LASTEXITCODE -ne 0) {
    $safeReason = if (($output -join ' ') -match 'password authentication failed') {
      'AUTHENTICATION'
    } elseif (($output -join ' ') -match 'timeout|timed out') {
      'TIMEOUT'
    } elseif (($output -join ' ') -match 'SSL|certificate') {
      'SSL'
    } else {
      'CONNECTIVITY_OR_CONFIGURATION'
    }
    Write-Output 'DB_CONNECTION=FAIL'
    Write-Output "DB_FAILURE_CLASS=$safeReason"
    exit 1
  }
  Write-Output 'DB_CONNECTION=PASS'
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  $password = $null
  $secrets = $null
}
