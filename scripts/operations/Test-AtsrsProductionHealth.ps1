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

function Invoke-HealthProbe {
  param([string]$Name, [string]$Uri, [hashtable]$Headers = @{})
  $watch = [Diagnostics.Stopwatch]::StartNew()
  try {
    $response = Invoke-WebRequest -Uri $Uri -Headers $Headers -Method Get -UseBasicParsing -TimeoutSec 20
    $watch.Stop()
    [pscustomobject]@{ name=$Name; ok=($response.StatusCode -lt 500); status=[int]$response.StatusCode; latency_ms=$watch.ElapsedMilliseconds }
  } catch {
    $watch.Stop()
    $status = 0
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) { $status = [int]$_.Exception.Response.StatusCode }
    [pscustomobject]@{ name=$Name; ok=$false; status=$status; latency_ms=$watch.ElapsedMilliseconds }
  }
}

try {
  $apiHeaders = @{ apikey=$serviceRole }
  if ($serviceRole -notlike 'sb_secret_*') {
    $apiHeaders.Authorization = "Bearer $serviceRole"
  }
  $results = @(
    Invoke-HealthProbe -Name 'frontend' -Uri 'https://atsrs.com/'
    Invoke-HealthProbe -Name 'auth' -Uri "$projectUrl/auth/v1/health" -Headers @{ apikey=$serviceRole }
    Invoke-HealthProbe -Name 'rest' -Uri "$projectUrl/rest/v1/" -Headers $apiHeaders
    Invoke-HealthProbe -Name 'storage' -Uri "$projectUrl/storage/v1/status" -Headers $apiHeaders
  )

  $credential = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("supabase:$serviceRole"))
  $metricsResponse = Invoke-WebRequest `
    -Uri "$projectUrl/customer/v1/privileged/metrics" `
    -Headers @{ Authorization="Basic $credential" } `
    -UseBasicParsing -TimeoutSec 30
  $allowedMetricPattern = '^(process_cpu_seconds_total|pg_stat_activity_count|pg_database_size_bytes|node_memory_|pg_stat_database_|pg_stat_bgwriter_)'
  $safeMetrics = ($metricsResponse.Content -split "`n") |
    Where-Object { $_ -match $allowedMetricPattern -and $_ -notmatch '^#' }

  $record = [ordered]@{
    checked_at_utc = [DateTime]::UtcNow.ToString('o')
    project_ref = $projectRef
    probes = $results
    metrics = $safeMetrics
  }
  $file = Join-Path $OutputRoot "health-$([DateTime]::UtcNow.ToString('yyyyMMdd')).jsonl"
  ($record | ConvertTo-Json -Depth 5 -Compress) | Add-Content -LiteralPath $file -Encoding UTF8

  foreach ($result in $results) {
    Write-Output "$($result.name.ToUpperInvariant())_STATUS=$($result.status)"
    Write-Output "$($result.name.ToUpperInvariant())_LATENCY_MS=$($result.latency_ms)"
  }
  Write-Output "METRICS_STATUS=$($metricsResponse.StatusCode)"
  if ($results.ok -contains $false) { throw 'One or more production health probes failed' }
  Write-Output 'PRODUCTION_HEALTH=PASS'
} finally {
  $serviceRole = $null
}
