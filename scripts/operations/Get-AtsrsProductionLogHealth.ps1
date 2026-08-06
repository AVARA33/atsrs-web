[CmdletBinding()]
param(
  [string]$SecretPath = (Join-Path $env:LOCALAPPDATA 'ATSRS\Backup\secrets.clixml'),
  [string]$OutputRoot = (Join-Path $env:LOCALAPPDATA 'ATSRS\Monitoring')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Import-Module (Join-Path $PSScriptRoot 'AtsrsBackup.Common.psm1') -Force

$projectRef = 'hwtjuqyxzivymofamwxl'
$secrets = Get-AtsrsSecretStore -Path $SecretPath
if (-not $secrets.PSObject.Properties.Name.Contains('ManagementAccessToken')) {
  throw 'Secret store version 2 is required'
}
$token = ConvertFrom-AtsrsSecureString -SecureString $secrets.ManagementAccessToken
New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null

$queries = [ordered]@{
  edge_5xx = "select count(*) as total from edge_logs cross join unnest(metadata) as m cross join unnest(m.response) as r where timestamp >= timestamp_sub(current_timestamp(), interval 15 minute) and r.status_code >= 500"
  edge_504 = "select count(*) as total from edge_logs cross join unnest(metadata) as m cross join unnest(m.response) as r where timestamp >= timestamp_sub(current_timestamp(), interval 15 minute) and r.status_code = 504"
  auth_errors = "select count(*) as total from auth_logs where timestamp >= timestamp_sub(current_timestamp(), interval 15 minute) and event_message like '%error%'"
}

try {
  $counts = [ordered]@{}
  foreach ($entry in $queries.GetEnumerator()) {
    $encoded = [Uri]::EscapeDataString($entry.Value)
    $uri = "https://api.supabase.com/v1/projects/$projectRef/analytics/endpoints/logs.all?sql=$encoded"
    $response = Invoke-RestMethod -Uri $uri -Headers @{ Authorization="Bearer $token" } -Method Get -TimeoutSec 30
    $value = 0
    if ($response.result -and $response.result.Count -gt 0) {
      $value = [int64]$response.result[0].total
    }
    $counts[$entry.Key] = $value
  }

  $record = [ordered]@{
    checked_at_utc = [DateTime]::UtcNow.ToString('o')
    project_ref = $projectRef
    aggregate_counts = $counts
  }
  $file = Join-Path $OutputRoot "logs-$([DateTime]::UtcNow.ToString('yyyyMMdd')).jsonl"
  ($record | ConvertTo-Json -Depth 4 -Compress) | Add-Content -LiteralPath $file -Encoding UTF8
  foreach ($entry in $counts.GetEnumerator()) {
    Write-Output "$($entry.Key.ToUpperInvariant())=$($entry.Value)"
  }
  Write-Output 'LOG_HEALTH=PASS'
} finally {
  $token = $null
}
