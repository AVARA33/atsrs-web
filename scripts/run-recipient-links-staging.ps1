[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
$stagingRef = 'nsbmbbqgekcwmdqmqsao'
$productionRef = 'hwtjuqyxzivymofamwxl'
$nodeDirectory = 'C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin'
$nodeExe = Join-Path $nodeDirectory 'node.exe'
$pnpm = 'C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd'
$runner = Join-Path $PSScriptRoot 'recipient-links-staging-runner.cjs'

if ($stagingRef -eq $productionRef) { throw 'Project guard failed.' }
if (-not (Test-Path -LiteralPath $nodeExe)) { throw 'Bundled Node is unavailable.' }
if (-not (Test-Path -LiteralPath $runner)) { throw 'Recipient-link runner is unavailable.' }

$serviceRoleKey = $null
$anonKey = $null
try {
  $env:PATH = "$nodeDirectory;$env:PATH"
  $keys = & $pnpm dlx supabase projects api-keys `
    --project-ref $stagingRef --reveal --output-format json |
    ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) { throw 'Staging key retrieval failed.' }
  $serviceRoleKey = [string](@($keys.keys) |
    Where-Object { $_.name -eq 'service_role' -and $_.type -eq 'legacy' } |
    Select-Object -First 1).api_key
  $anonKey = [string](@($keys.keys) |
    Where-Object { $_.name -eq 'anon' -and $_.type -eq 'legacy' } |
    Select-Object -First 1).api_key
  if (-not $serviceRoleKey -or -not $anonKey) {
    throw 'Required staging keys are unavailable.'
  }

  New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
  $env:ATSRS_RECIPIENT_STAGING_SERVICE_ROLE_KEY = $serviceRoleKey
  $env:ATSRS_RECIPIENT_STAGING_ANON_KEY = $anonKey
  $env:ATSRS_RECIPIENT_STAGING_OUTPUT = $OutputDirectory
  & $nodeExe $runner
  if ($LASTEXITCODE -ne 0) { throw 'Recipient-link staging runner failed.' }
} finally {
  Remove-Item Env:ATSRS_RECIPIENT_STAGING_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:ATSRS_RECIPIENT_STAGING_ANON_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:ATSRS_RECIPIENT_STAGING_OUTPUT -ErrorAction SilentlyContinue
  $serviceRoleKey = $null
  $anonKey = $null
}
