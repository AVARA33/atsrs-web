[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("A", "B", "C")]
  [string]$Path,
  [Parameter(Mandatory = $true)]
  [int]$Port,
  [Parameter(Mandatory = $true)]
  [string]$OutputDirectory,
  [ValidateSet("staging", "production")]
  [string]$Target = "staging"
)

$ErrorActionPreference = "Stop"
$stagingRef = "nsbmbbqgekcwmdqmqsao"
$productionRef = "hwtjuqyxzivymofamwxl"
$nodeDirectory = "C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
$nodeExe = Join-Path $nodeDirectory "node.exe"
$pnpm = "C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"
$server = Join-Path $PSScriptRoot "stage19-staging-rpc-harness.cjs"

if ($stagingRef -eq $productionRef) { throw "Project guard failed." }
$targetRef = if ($Target -eq "production") { $productionRef } else { $stagingRef }
if (-not (Test-Path -LiteralPath $nodeExe)) { throw "Bundled Node is unavailable." }
if (-not (Test-Path -LiteralPath $server)) { throw "Harness server is unavailable." }

$serviceRoleKey = $null
$anonKey = $null
try {
  $env:PATH = "$nodeDirectory;$env:PATH"
  $keys = & $pnpm dlx supabase projects api-keys `
    --project-ref $targetRef --reveal --output-format json |
    ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) { throw "Staging key retrieval failed." }
  $serviceRoleKey = [string](@($keys.keys) |
    Where-Object { $_.name -eq "service_role" -and $_.type -eq "legacy" } |
    Select-Object -First 1).api_key
  $anonKey = [string](@($keys.keys) |
    Where-Object { $_.name -eq "anon" -and $_.type -eq "legacy" } |
    Select-Object -First 1).api_key
  if (-not $serviceRoleKey -or -not $anonKey) {
    throw "Required staging keys are unavailable."
  }

  New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
  $env:ATSRS_STAGING_SERVICE_ROLE_KEY = $serviceRoleKey
  $env:ATSRS_STAGING_ANON_KEY = $anonKey
  $env:ATSRS_STAGE19_PORT = [string]$Port
  $env:ATSRS_STAGE19_OUTPUT_DIR = $OutputDirectory
  $env:ATSRS_STAGE19_TARGET_REF = $targetRef
  if ($Target -eq "production") {
    $env:ATSRS_ALLOW_PRODUCTION_SYNTHETIC_CANARY =
      "CONFIRMED_TARGETED_SYNTHETIC_CANARY"
  }
  $stdoutPath = Join-Path $OutputDirectory "stage19-rpc-$Port-stdout.log"
  $stderrPath = Join-Path $OutputDirectory "stage19-rpc-$Port-stderr.log"
  $process = Start-Process -FilePath $nodeExe `
    -ArgumentList @($server) -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
  Start-Sleep -Milliseconds 1500
  if ($process.HasExited) {
    $safeError = Get-Content -Raw -LiteralPath $stderrPath -ErrorAction SilentlyContinue
    throw "Harness process failed to start: $safeError"
  }

  [pscustomobject]@{
    ready = $true
    path = $Path
    port = $Port
    processId = $process.Id
    url = "http://127.0.0.1:$Port/?path=$Path"
    projectRef = $targetRef
  } | ConvertTo-Json -Compress
} finally {
  Remove-Item Env:ATSRS_STAGING_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:ATSRS_STAGING_ANON_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:ATSRS_STAGE19_PORT -ErrorAction SilentlyContinue
  Remove-Item Env:ATSRS_STAGE19_OUTPUT_DIR -ErrorAction SilentlyContinue
  Remove-Item Env:ATSRS_STAGE19_TARGET_REF -ErrorAction SilentlyContinue
  Remove-Item Env:ATSRS_ALLOW_PRODUCTION_SYNTHETIC_CANARY -ErrorAction SilentlyContinue
  $serviceRoleKey = $null
  $anonKey = $null
}
