param(
  [Parameter(Mandatory = $true)]
  [string]$SupabaseCli,
  [Parameter(Mandatory = $true)]
  [string]$StagingWorkdir
)

$ErrorActionPreference = 'Stop'
$StagingRef = 'nsbmbbqgekcwmdqmqsao'
$ProductionRef = 'hwtjuqyxzivymofamwxl'
$Bucket = 'atsrs-stage24-synthetic'
$BaseUrl = "https://$StagingRef.supabase.co"
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$SetupSql = Join-Path $Root 'supabase\audit\staging-stage24-storage-api-setup.sql'
$CleanupSql = Join-Path $Root 'supabase\audit\staging-stage24-storage-api-cleanup.sql'

if ($StagingRef -eq $ProductionRef) {
  throw 'Stage 24 production/staging guard failed'
}

function Invoke-HttpStatus {
  param(
    [string]$Method,
    [string]$Uri,
    [hashtable]$Headers,
    [object]$Body = $null,
    [string]$ContentType = 'application/json'
  )
  try {
    $parameters = @{
      Method = $Method
      Uri = $Uri
      Headers = $Headers
      UseBasicParsing = $true
    }
    if ($null -ne $Body) {
      $parameters.Body = $Body
      $parameters.ContentType = $ContentType
    }
    $response = Invoke-WebRequest @parameters
    return [int]$response.StatusCode
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      return [int]$_.Exception.Response.StatusCode
    }
    throw
  }
}

function Get-Sha256Hex {
  param([byte[]]$Bytes)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([BitConverter]::ToString($sha.ComputeHash($Bytes))).Replace('-', '')
  } finally {
    $sha.Dispose()
  }
}

function Invoke-SupabaseCli {
  param([string[]]$Arguments)
  $priorPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $output = & $SupabaseCli @Arguments 2>$null
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $priorPreference
  }
  if ($exitCode -ne 0) {
    throw "Supabase CLI command failed with exit code $exitCode"
  }
  return $output
}

$keysJson = Invoke-SupabaseCli -Arguments @(
  'projects', 'api-keys',
  '--project-ref', $StagingRef,
  '--reveal',
  '--output', 'json'
)
$keys = $keysJson | ConvertFrom-Json
$anonKey = [string](($keys | Where-Object { $_.name -eq 'anon' }).api_key)
$serviceKey = [string](($keys | Where-Object { $_.name -eq 'service_role' }).api_key)
if (-not $anonKey -or -not $serviceKey) {
  throw 'Required staging API keys are unavailable'
}

$suffix = [Guid]::NewGuid().ToString('N')
$emailA = "atsrs-stage24-$suffix-a@example.invalid"
$emailB = "atsrs-stage24-$suffix-b@example.invalid"
$password = ([Guid]::NewGuid().ToString('N') + 'aA!9')
$adminHeaders = @{
  apikey = $serviceKey
  Authorization = "Bearer $serviceKey"
}
$userA = $null
$userB = $null
$policiesInstalled = $false
$bucketCreated = $false
$path = $null
$result = [ordered]@{}

try {
  $userA = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/v1/admin/users" `
    -Headers $adminHeaders -ContentType 'application/json' `
    -Body (@{email=$emailA;password=$password;email_confirm=$true} | ConvertTo-Json)
  $userB = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/v1/admin/users" `
    -Headers $adminHeaders -ContentType 'application/json' `
    -Body (@{email=$emailB;password=$password;email_confirm=$true} | ConvertTo-Json)

  Invoke-RestMethod -Method Post -Uri "$BaseUrl/storage/v1/bucket" `
    -Headers $adminHeaders -ContentType 'application/json' `
    -Body (@{id=$Bucket;name=$Bucket;public=$false} | ConvertTo-Json) | Out-Null
  $bucketCreated = $true

  $null = Invoke-SupabaseCli -Arguments @(
    'db', 'query', '--linked',
    '--workdir', $StagingWorkdir,
    '--file', $SetupSql,
    '--output', 'json'
  )
  $policiesInstalled = $true

  $loginHeaders = @{apikey=$anonKey}
  $sessionA = Invoke-RestMethod -Method Post `
    -Uri "$BaseUrl/auth/v1/token?grant_type=password" `
    -Headers $loginHeaders -ContentType 'application/json' `
    -Body (@{email=$emailA;password=$password} | ConvertTo-Json)
  $sessionB = Invoke-RestMethod -Method Post `
    -Uri "$BaseUrl/auth/v1/token?grant_type=password" `
    -Headers $loginHeaders -ContentType 'application/json' `
    -Body (@{email=$emailB;password=$password} | ConvertTo-Json)

  $headersA = @{apikey=$anonKey;Authorization="Bearer $($sessionA.access_token)"}
  $headersB = @{apikey=$anonKey;Authorization="Bearer $($sessionB.access_token)"}
  $anonHeaders = @{apikey=$anonKey;Authorization="Bearer $anonKey"}
  $path = "$($userA.id)/stage24-$suffix.txt"
  $objectUri = "$BaseUrl/storage/v1/object/$Bucket/$path"
  $firstBytes = [Text.Encoding]::UTF8.GetBytes('ATSRS Stage 24 synthetic v1')
  $secondBytes = [Text.Encoding]::UTF8.GetBytes('ATSRS Stage 24 synthetic v2')

  $result.owner_upload = Invoke-HttpStatus -Method Post -Uri $objectUri `
    -Headers ($headersA + @{'x-upsert'='false'}) -Body $firstBytes `
    -ContentType 'text/plain'
  $result.anon_read = Invoke-HttpStatus -Method Get -Uri $objectUri `
    -Headers $anonHeaders
  $result.cross_user_read = Invoke-HttpStatus -Method Get -Uri $objectUri `
    -Headers $headersB
  $result.cross_user_update = Invoke-HttpStatus -Method Post -Uri $objectUri `
    -Headers ($headersB + @{'x-upsert'='true'}) -Body $secondBytes `
    -ContentType 'text/plain'
  $result.cross_user_delete = Invoke-HttpStatus -Method Delete -Uri $objectUri `
    -Headers $headersB

  $downloadV1 = Invoke-WebRequest -Method Get -Uri $objectUri `
    -Headers $headersA -UseBasicParsing
  $result.owner_read = [int]$downloadV1.StatusCode
  $downloadV1Bytes = [Text.Encoding]::UTF8.GetBytes([string]$downloadV1.Content)
  $result.hash_v1_match = (
    (Get-Sha256Hex -Bytes $firstBytes) -eq
    (Get-Sha256Hex -Bytes $downloadV1Bytes)
  )

  $result.owner_update = Invoke-HttpStatus -Method Post -Uri $objectUri `
    -Headers ($headersA + @{'x-upsert'='true'}) -Body $secondBytes `
    -ContentType 'text/plain'
  $downloadV2 = Invoke-WebRequest -Method Get -Uri $objectUri `
    -Headers $headersA -UseBasicParsing
  $downloadV2Bytes = [Text.Encoding]::UTF8.GetBytes([string]$downloadV2.Content)
  $result.hash_v2_match = (
    (Get-Sha256Hex -Bytes $secondBytes) -eq
    (Get-Sha256Hex -Bytes $downloadV2Bytes)
  )

  $dummyId = [Guid]::NewGuid().ToString()
  $normalizedRows = Invoke-RestMethod -Method Get `
    -Uri "$BaseUrl/rest/v1/atsrs_workspace_personnel?select=id&limit=1" `
    -Headers $headersA
  $legacyRows = Invoke-RestMethod -Method Get `
    -Uri "$BaseUrl/rest/v1/atsrs_workspace_data?select=data_key&limit=1" `
    -Headers $headersA
  $adminOverview = Invoke-RestMethod -Method Post `
    -Uri "$BaseUrl/rest/v1/rpc/atsrs_get_admin_overview" `
    -Headers $headersA -ContentType 'application/json' -Body '{}'
  $result.cross_workspace_normalized_rows = @($normalizedRows).Count
  $result.cross_workspace_legacy_rows = @($legacyRows).Count
  $result.non_admin_overview = -not [bool](@($adminOverview)[0].is_admin)
  $result.anon_normalized_read = Invoke-HttpStatus -Method Get `
    -Uri "$BaseUrl/rest/v1/atsrs_workspace_personnel?select=id&limit=1" `
    -Headers $anonHeaders
  $result.direct_normalized_delete = Invoke-HttpStatus -Method Delete `
    -Uri "$BaseUrl/rest/v1/atsrs_workspace_personnel?id=eq.$dummyId" `
    -Headers ($headersA + @{Prefer='return=minimal'})

  $result.owner_delete = Invoke-HttpStatus -Method Delete -Uri $objectUri `
    -Headers $headersA

  $success = @(200, 201)
  if ($result.owner_upload -notin $success -or
      $result.owner_read -notin $success -or
      $result.owner_update -notin $success -or
      $result.owner_delete -notin $success -or
      -not $result.hash_v1_match -or
      -not $result.hash_v2_match -or
      -not $result.non_admin_overview) {
    throw 'Owner Storage lifecycle gate failed'
  }
  if ($result.anon_read -lt 400 -or
      $result.cross_user_read -lt 400 -or
      $result.cross_user_update -lt 400 -or
      $result.cross_user_delete -lt 400 -or
      $result.anon_normalized_read -lt 400 -or
      $result.direct_normalized_delete -lt 400) {
    throw 'Anonymous, cross-user, or direct-DML denial gate failed'
  }
  if ($result.cross_workspace_normalized_rows -ne 0 -or
      $result.cross_workspace_legacy_rows -ne 0) {
    throw 'Cross-workspace RLS isolation gate failed'
  }
} finally {
  if ($path -and $bucketCreated) {
    $null = Invoke-HttpStatus -Method Delete `
      -Uri "$BaseUrl/storage/v1/object/$Bucket/$path" -Headers $adminHeaders
  }
  if ($policiesInstalled) {
    try {
      $null = Invoke-SupabaseCli -Arguments @(
        'db', 'query', '--linked',
        '--workdir', $StagingWorkdir,
        '--file', $CleanupSql,
        '--output', 'json'
      )
    } catch {
      # Residue is checked by the caller; do not mask the original test result.
    }
  }
  if ($bucketCreated) {
    $null = Invoke-HttpStatus -Method Delete `
      -Uri "$BaseUrl/storage/v1/bucket/$Bucket" -Headers $adminHeaders
  }
  if ($userA -and $userA.id) {
    $null = Invoke-HttpStatus -Method Delete `
      -Uri "$BaseUrl/auth/v1/admin/users/$($userA.id)" -Headers $adminHeaders
  }
  if ($userB -and $userB.id) {
    $null = Invoke-HttpStatus -Method Delete `
      -Uri "$BaseUrl/auth/v1/admin/users/$($userB.id)" -Headers $adminHeaders
  }
  $anonKey = $null
  $serviceKey = $null
  $password = $null
}

$result | ConvertTo-Json -Compress
