[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$OutputDirectory
)

$ErrorActionPreference = "Stop"
$productionRef = "hwtjuqyxzivymofamwxl"
$stagingRef = "nsbmbbqgekcwmdqmqsao"
$nodeDirectory = "C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
$nodeExe = Join-Path $nodeDirectory "node.exe"
$pnpm = "C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"
$runner = Join-Path $PSScriptRoot "stage19-staging-containment-runner.cjs"

if ($productionRef -eq $stagingRef) { throw "Project guard failed." }
if (-not (Test-Path -LiteralPath $nodeExe)) { throw "Bundled Node is unavailable." }
if (-not (Test-Path -LiteralPath $runner)) { throw "Containment runner is unavailable." }

$serviceRoleKey = $null
$anonKey = $null
try {
  $env:PATH = "$nodeDirectory;$env:PATH"
  $keys = & $pnpm dlx supabase projects api-keys `
    --project-ref $productionRef --reveal --output-format json |
    ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) { throw "Production key retrieval failed." }
  $serviceRoleKey = [string](@($keys.keys) |
    Where-Object { $_.name -eq "service_role" -and $_.type -eq "legacy" } |
    Select-Object -First 1).api_key
  $anonKey = [string](@($keys.keys) |
    Where-Object { $_.name -eq "anon" -and $_.type -eq "legacy" } |
    Select-Object -First 1).api_key
  if (-not $serviceRoleKey -or -not $anonKey) {
    throw "Required production keys are unavailable."
  }

  New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
  $env:ATSRS_STAGING_SERVICE_ROLE_KEY = $serviceRoleKey
  $env:ATSRS_STAGING_ANON_KEY = $anonKey
  $env:ATSRS_STAGE19_OUTPUT_DIR = $OutputDirectory
  $env:ATSRS_STAGE19_TARGET_REF = $productionRef
  $env:ATSRS_ALLOW_PRODUCTION_SYNTHETIC_CANARY =
    "CONFIRMED_TARGETED_SYNTHETIC_CANARY"
  & $nodeExe $runner
  if ($LASTEXITCODE -ne 0) { throw "Production canary runner failed." }
} finally {
  Remove-Item Env:ATSRS_STAGING_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:ATSRS_STAGING_ANON_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:ATSRS_STAGE19_OUTPUT_DIR -ErrorAction SilentlyContinue
  Remove-Item Env:ATSRS_STAGE19_TARGET_REF -ErrorAction SilentlyContinue
  Remove-Item Env:ATSRS_ALLOW_PRODUCTION_SYNTHETIC_CANARY -ErrorAction SilentlyContinue
  $serviceRoleKey = $null
  $anonKey = $null
}
