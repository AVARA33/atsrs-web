[CmdletBinding()]
param(
  [string]$RepoRoot,
  [string]$BackupRoot = (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'ATSRS Secure Backups'),
  [string]$MirrorRoot = $env:ATSRS_BACKUP_MIRROR_DIR,
  [string]$DatabaseUrl,
  [string]$PostgresBin = 'C:\Users\user\Documents\GitHub\output\postgresql-17.10-client-extract\bin',
  [string]$SecretPath = (Join-Path $env:LOCALAPPDATA 'ATSRS\Backup\secrets.clixml'),
  [switch]$SkipStorage,
  [switch]$ApplyRetention
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

$productionRef = 'hwtjuqyxzivymofamwxl'
$projectUrl = "https://$productionRef.supabase.co"
$modulePath = Join-Path $PSScriptRoot 'AtsrsBackup.Common.psm1'
Import-Module $modulePath -Force

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  $poolerFile = Join-Path $RepoRoot 'supabase\.temp\pooler-url'
  if (-not (Test-Path -LiteralPath $poolerFile -PathType Leaf)) {
    throw 'DatabaseUrl is required because the non-secret pooler URL file is unavailable'
  }
  $DatabaseUrl = (Get-Content -LiteralPath $poolerFile -Raw).Trim()
}
if ($DatabaseUrl -notmatch [regex]::Escape($productionRef)) {
  throw 'Refusing backup because DatabaseUrl does not identify the ATSRS production project'
}
if ($DatabaseUrl -match '://[^/@:]+:[^/@]+@') {
  throw 'DatabaseUrl must not contain a password; the password is loaded from the protected secret store'
}

$tools = @('pg_dump.exe', 'pg_dumpall.exe', 'psql.exe')
foreach ($tool in $tools) {
  $path = Join-Path $PostgresBin $tool
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Required PostgreSQL tool is missing: $path"
  }
}

$secrets = Get-AtsrsSecretStore -Path $SecretPath
$databasePassword = ConvertFrom-AtsrsSecureString -SecureString $secrets.DatabasePassword
$serviceRole = ConvertFrom-AtsrsSecureString -SecureString $secrets.ServiceRoleKey
$timestamp = [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')
$packageName = "atsrs-production-$timestamp"
$workRoot = Join-Path ([IO.Path]::GetTempPath()) "ab-$([Guid]::NewGuid().ToString('N').Substring(0, 8))"
$payload = Join-Path $workRoot 'payload'
$archive = Join-Path $workRoot "$packageName.zip"
$encrypted = Join-Path $BackupRoot "$packageName.atsrsbak"
$checksum = "$encrypted.sha256"

New-Item -ItemType Directory -Path $payload -Force | Out-Null
New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null

try {
  $env:PGPASSWORD = $databasePassword
  $rolesFile = Join-Path $payload 'roles.sql'
  $schemaFile = Join-Path $payload 'schema.sql'
  $dataFile = Join-Path $payload 'data.sql'
  $customFile = Join-Path $payload 'database.dump'

  & (Join-Path $PostgresBin 'pg_dumpall.exe') --roles-only --no-role-passwords --database=$DatabaseUrl --file=$rolesFile
  if ($LASTEXITCODE -ne 0) { throw 'Role backup failed' }
  & (Join-Path $PostgresBin 'pg_dump.exe') --schema-only --no-owner --no-acl --dbname=$DatabaseUrl --file=$schemaFile
  if ($LASTEXITCODE -ne 0) { throw 'Schema backup failed' }
  & (Join-Path $PostgresBin 'pg_dump.exe') --data-only --no-owner --no-acl --use-set-session-authorization --dbname=$DatabaseUrl --file=$dataFile
  if ($LASTEXITCODE -ne 0) { throw 'Data backup failed' }
  & (Join-Path $PostgresBin 'pg_dump.exe') --format=custom --no-owner --no-acl --dbname=$DatabaseUrl --file=$customFile
  if ($LASTEXITCODE -ne 0) { throw 'Custom-format database backup failed' }

  $storageObjectCount = 0
  $storageBytes = [int64]0
  if (-not $SkipStorage) {
    $storageRoot = Join-Path $payload 'storage'
    New-Item -ItemType Directory -Path $storageRoot -Force | Out-Null
    $objectQuery = "select row_to_json(x) from (select bucket_id, name from storage.objects order by bucket_id, name) x;"
    $objects = & (Join-Path $PostgresBin 'psql.exe') -X -A -t --set ON_ERROR_STOP=1 --dbname=$DatabaseUrl --command=$objectQuery
    if ($LASTEXITCODE -ne 0) { throw 'Storage inventory query failed' }

    $headers = @{ apikey = $serviceRole }
    if ($serviceRole -notlike 'sb_secret_*') {
      $headers.Authorization = "Bearer $serviceRole"
    }
    foreach ($line in $objects) {
      if ([string]::IsNullOrWhiteSpace($line)) { continue }
      $object = $line | ConvertFrom-Json
      $bucket = [string]$object.bucket_id
      $name = [string]$object.name
      $segments = @($bucket) + ($name -split '/')
      $encoded = ($segments | ForEach-Object { [Uri]::EscapeDataString($_) }) -join '/'
      $destination = Join-Path (Join-Path $storageRoot $bucket) ($name -replace '/', [IO.Path]::DirectorySeparatorChar)
      $destinationParent = Split-Path -Parent $destination
      New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
      Invoke-WebRequest -Uri "$projectUrl/storage/v1/object/authenticated/$encoded" -Headers $headers -OutFile $destination
      $storageObjectCount++
      $storageBytes += (Get-Item -LiteralPath $destination).Length
    }
  }

  $trackedFiles = git -C $RepoRoot ls-files 'supabase/migrations/*' 'supabase/functions/*'
  if ($LASTEXITCODE -ne 0) { throw 'Unable to inventory migration and Edge Function sources' }
  $sourceHashes = foreach ($relative in $trackedFiles) {
    $full = Join-Path $RepoRoot $relative
    if (Test-Path -LiteralPath $full -PathType Leaf) {
      [pscustomobject]@{
        path = $relative.Replace('\', '/')
        sha256 = (Get-FileHash -LiteralPath $full -Algorithm SHA256).Hash
      }
    }
  }
  $sourceHashes | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath (Join-Path $payload 'source-hashes.json') -Encoding UTF8

  $manifest = [ordered]@{
    format = 'ATSRBK01'
    created_at_utc = [DateTime]::UtcNow.ToString('o')
    project_ref = $productionRef
    repository_commit = (git -C $RepoRoot rev-parse HEAD).Trim()
    database = @{
      roles = 'roles.sql'
      schema = 'schema.sql'
      data = 'data.sql'
      custom = 'database.dump'
    }
    storage = @{
      included = (-not $SkipStorage)
      object_count = $storageObjectCount
      total_bytes = $storageBytes
    }
    contains_personal_data = $true
    encrypted = $true
  }
  $manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $payload 'manifest.json') -Encoding UTF8

  $hashLines = Get-ChildItem -LiteralPath $payload -Recurse -File |
    Sort-Object FullName |
    ForEach-Object {
      $relative = $_.FullName.Substring($payload.Length + 1).Replace('\', '/')
      "$(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256 | Select-Object -ExpandProperty Hash)  $relative"
    }
  $hashLines | Set-Content -LiteralPath (Join-Path $payload 'SHA256SUMS.txt') -Encoding ASCII

  Compress-Archive -Path (Join-Path $payload '*') -DestinationPath $archive -CompressionLevel Optimal
  Protect-AtsrsBackupFile -InputPath $archive -OutputPath $encrypted -Passphrase $secrets.BackupPassphrase
  $encryptedHash = (Get-FileHash -LiteralPath $encrypted -Algorithm SHA256).Hash
  "$encryptedHash  $([IO.Path]::GetFileName($encrypted))" | Set-Content -LiteralPath $checksum -Encoding ASCII

  if (-not [string]::IsNullOrWhiteSpace($MirrorRoot)) {
    New-Item -ItemType Directory -Path $MirrorRoot -Force | Out-Null
    $mirrorBackup = Join-Path $MirrorRoot ([IO.Path]::GetFileName($encrypted))
    $mirrorChecksum = Join-Path $MirrorRoot ([IO.Path]::GetFileName($checksum))
    Copy-Item -LiteralPath $encrypted -Destination $mirrorBackup -Force
    Copy-Item -LiteralPath $checksum -Destination $mirrorChecksum -Force
    $mirrorHash = (Get-FileHash -LiteralPath $mirrorBackup -Algorithm SHA256).Hash
    if ($mirrorHash -ne $encryptedHash) {
      Remove-Item -LiteralPath $mirrorBackup -Force -ErrorAction SilentlyContinue
      Remove-Item -LiteralPath $mirrorChecksum -Force -ErrorAction SilentlyContinue
      throw 'Independent mirror checksum verification failed'
    }
  }

  if ($ApplyRetention) {
    $resolvedBackupRoot = (Resolve-Path -LiteralPath $BackupRoot).Path
    if ($resolvedBackupRoot.Length -lt 10 -or $resolvedBackupRoot -eq [IO.Path]::GetPathRoot($resolvedBackupRoot)) {
      throw 'Unsafe backup root; retention refused'
    }
    $cutoff = [DateTime]::UtcNow.AddDays(-35)
    Get-ChildItem -LiteralPath $resolvedBackupRoot -File -Filter 'atsrs-production-*.atsrsbak' |
      Where-Object LastWriteTimeUtc -lt $cutoff |
      ForEach-Object {
        Remove-Item -LiteralPath $_.FullName -Force
        $sidecar = "$($_.FullName).sha256"
        if (Test-Path -LiteralPath $sidecar) { Remove-Item -LiteralPath $sidecar -Force }
      }
  }

  Write-Output "BACKUP_FILE=$encrypted"
  Write-Output "SHA256=$encryptedHash"
  Write-Output "STORAGE_OBJECTS=$storageObjectCount"
  Write-Output 'PLAINTEXT_RETAINED=NO'
  Write-Output 'BACKUP_STATUS=PASS'
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  $databasePassword = $null
  $serviceRole = $null
  if (Test-Path -LiteralPath $workRoot) {
    Remove-Item -LiteralPath $workRoot -Recurse -Force
  }
}
