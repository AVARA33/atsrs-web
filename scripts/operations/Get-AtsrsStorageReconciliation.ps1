[CmdletBinding()]
param(
  [string]$SecretPath = (Join-Path $env:LOCALAPPDATA 'ATSRS\Backup\secrets.clixml'),
  [string]$OutputRoot = (Join-Path $env:LOCALAPPDATA 'ATSRS\Monitoring')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Import-Module (Join-Path $PSScriptRoot 'AtsrsBackup.Common.psm1') -Force

$projectRef = 'hwtjuqyxzivymofamwxl'
$projectUrl = "https://$projectRef.supabase.co"
$secrets = Get-AtsrsSecretStore -Path $SecretPath
$serviceRole = ConvertFrom-AtsrsSecureString -SecureString $secrets.ServiceRoleKey
New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null

try {
  $headers = @{ apikey = $serviceRole }
  if ($serviceRole -notlike 'sb_secret_*') {
    $headers.Authorization = "Bearer $serviceRole"
  }

  $response = Invoke-RestMethod `
    -Uri "$projectUrl/rest/v1/rpc/atsrs_storage_reconciliation_report" `
    -Headers $headers `
    -Method Post `
    -ContentType 'application/json' `
    -Body '{}' `
    -TimeoutSec 30

  $record = [ordered]@{
    checked_at_utc = [DateTime]::UtcNow.ToString('o')
    project_ref = $projectRef
    report = $response
  }
  $file = Join-Path $OutputRoot "storage-reconciliation-$([DateTime]::UtcNow.ToString('yyyyMMdd')).jsonl"
  ($record | ConvertTo-Json -Depth 8 -Compress) | Add-Content -LiteralPath $file -Encoding UTF8

  Write-Output "STORAGE_RECONCILIATION_STATUS=$($response.status)"
  Write-Output "METADATA_WITHOUT_STORAGE=$($response.user_files.metadata_without_storage)"
  Write-Output "STORAGE_WITHOUT_METADATA=$($response.user_files.storage_without_metadata)"
  Write-Output "STALE_STORAGE_WITHOUT_METADATA=$($response.user_files.storage_without_metadata_older_than_24_hours)"
  Write-Output "PROFILE_OBJECTS_WITHOUT_USER=$($response.profile_photos.objects_without_user)"
} finally {
  $serviceRole = $null
}
