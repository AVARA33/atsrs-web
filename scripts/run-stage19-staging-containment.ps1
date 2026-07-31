[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$OutputDirectory
)

$ErrorActionPreference = "Stop"
$stagingRef = "nsbmbbqgekcwmdqmqsao"
$productionRef = "hwtjuqyxzivymofamwxl"
$nodeDirectory = "C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
$nodeExe = Join-Path $nodeDirectory "node.exe"
$pnpm = "C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"
$runner = Join-Path $PSScriptRoot "stage19-staging-containment-runner.cjs"

if ($stagingRef -eq $productionRef) { throw "Project guard failed." }
if (-not (Test-Path -LiteralPath $nodeExe)) { throw "Bundled Node is unavailable." }
if (-not (Test-Path -LiteralPath $runner)) { throw "Containment runner is unavailable." }

$serviceRoleKey = $null
$anonKey = $null
try {
  $env:PATH = "$nodeDirectory;$env:PATH"
  $keys = & $pnpm dlx supabase projects api-keys `
    --project-ref $stagingRef --reveal --output-format json |
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
  $env:ATSRS_STAGE19_OUTPUT_DIR = $OutputDirectory
  & $nodeExe $runner
  if ($LASTEXITCODE -ne 0) { throw "Containment runner failed." }
} finally {
  Remove-Item Env:ATSRS_STAGING_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:ATSRS_STAGING_ANON_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:ATSRS_STAGE19_OUTPUT_DIR -ErrorAction SilentlyContinue
  $serviceRoleKey = $null
  $anonKey = $null
}
