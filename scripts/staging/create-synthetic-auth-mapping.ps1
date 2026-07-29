[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$DumpPath,

  [Parameter(Mandatory = $true)]
  [string]$ProjectRef,

  [Parameter(Mandatory = $true)]
  [string]$CredentialPath,

  [string]$SupabaseCli = "supabase",

  [string]$NodeExe = "node"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Security
$ProductionProjectRef = "hwtjuqyxzivymofamwxl"
$ExpectedStagingProjectRef = "nsbmbbqgekcwmdqmqsao"

if ($ProjectRef -eq $ProductionProjectRef) {
  throw "Production project guard refused the operation."
}
if ($ProjectRef -ne $ExpectedStagingProjectRef) {
  throw "Unexpected staging project ref."
}
if (-not (Test-Path -LiteralPath $DumpPath -PathType Leaf)) {
  throw "Scoped data dump is missing."
}
if (Test-Path -LiteralPath $CredentialPath) {
  throw "Credential output already exists; refusing to overwrite it."
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$inspector = Join-Path $repoRoot "scripts\staging\inspect-scoped-dump-auth.cjs"
$temporaryIds = Join-Path ([System.IO.Path]::GetTempPath()) (
  "atsrs-staging-auth-ids-{0}.json" -f [guid]::NewGuid().ToString("N")
)
$createdUserIds = [System.Collections.Generic.List[string]]::new()
$serviceRoleKey = $null

function Invoke-StagingAdminApi {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("Get", "Post", "Delete")]
    [string]$Method,
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [object]$Body
  )

  $headers = @{
    apikey = $serviceRoleKey
    Authorization = "Bearer $serviceRoleKey"
  }
  $arguments = @{
    Uri = "https://$ProjectRef.supabase.co/auth/v1$Path"
    Method = $Method
    Headers = $headers
  }
  if ($PSBoundParameters.ContainsKey("Body")) {
    $arguments.ContentType = "application/json"
    $arguments.Body = ($Body | ConvertTo-Json -Depth 6 -Compress)
  }
  Invoke-RestMethod @arguments
}

try {
  $inspection = & $NodeExe $inspector $DumpPath $temporaryIds | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) {
    throw "Scoped dump auth inspection failed."
  }
  if ($inspection.workspaceRows -ne 4) {
    throw "Unexpected workspace row count."
  }
  if ($inspection.distinctWorkspaceUsers -ne 3) {
    throw "Unexpected distinct workspace user count."
  }
  if ($inspection.distinctReferencedAuthUsers -ne 5) {
    throw "Unexpected distinct referenced auth user count."
  }
  if ($inspection.referencedUsersOutsideWorkspaces -ne 2) {
    throw "Unexpected external auth reference count."
  }

  $userIds = Get-Content -LiteralPath $temporaryIds -Raw | ConvertFrom-Json
  if (@($userIds).Count -ne 5) {
    throw "Auth ID extraction count mismatch."
  }

  $keyDocument = & $SupabaseCli projects api-keys `
    --project-ref $ProjectRef --reveal --output-format json | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) {
    throw "Staging API key retrieval failed."
  }
  $serviceRoleEntry = @($keyDocument.keys) |
    Where-Object { $_.name -eq "service_role" -and $_.type -eq "legacy" } |
    Select-Object -First 1
  if (-not $serviceRoleEntry -or [string]::IsNullOrWhiteSpace($serviceRoleEntry.api_key)) {
    throw "Staging service role key was not available in the secure CLI session."
  }
  $serviceRoleKey = [string]$serviceRoleEntry.api_key

  $existing = Invoke-StagingAdminApi -Method Get -Path "/admin/users?page=1&per_page=1000"
  if (@($existing.users).Count -ne 0) {
    throw "Staging Auth is not empty; refusing to merge synthetic identities."
  }

  $mapping = [System.Collections.Generic.List[object]]::new()
  $ordinal = 0
  foreach ($id in @($userIds | Sort-Object)) {
    $ordinal += 1
    $passwordBytes = [byte[]]::new(32)
    $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
      $random.GetBytes($passwordBytes)
    } finally {
      $random.Dispose()
    }
    $password = [Convert]::ToBase64String($passwordBytes).
      Replace("+", "-").Replace("/", "_").TrimEnd("=")
    $email = "synthetic-$ordinal-$($id.Substring(0, 8))@example.invalid"
    $payload = @{
      id = $id
      email = $email
      password = $password
      email_confirm = $true
      app_metadata = @{ staging_only = $true }
      user_metadata = @{ staging_only = $true }
    }
    $null = Invoke-StagingAdminApi -Method Post -Path "/admin/users" -Body $payload
    $createdUserIds.Add($id)
    $mapping.Add([pscustomobject]@{
      id = $id
      email = $email
      password = $password
    })
  }

  $credentialJson = $mapping | ConvertTo-Json -Depth 4 -Compress
  $plainBytes = [Text.Encoding]::UTF8.GetBytes($credentialJson)
  $protectedBytes = [System.Security.Cryptography.ProtectedData]::Protect(
    $plainBytes,
    $null,
    [System.Security.Cryptography.DataProtectionScope]::CurrentUser
  )
  $credentialDirectory = Split-Path -Parent $CredentialPath
  if (-not (Test-Path -LiteralPath $credentialDirectory)) {
    $null = New-Item -ItemType Directory -Path $credentialDirectory
  }
  [IO.File]::WriteAllBytes($CredentialPath, $protectedBytes)
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
  $null = & icacls.exe $CredentialPath /inheritance:r /grant:r "${identity}:(R,W)"
  if ($LASTEXITCODE -ne 0) {
    throw "Could not restrict the encrypted credential file ACL."
  }

  [pscustomobject]@{
    stagingProjectRef = $ProjectRef
    syntheticUsersCreated = $createdUserIds.Count
    workspaceRows = $inspection.workspaceRows
    distinctWorkspaceUsers = $inspection.distinctWorkspaceUsers
    referencedUsersOutsideWorkspaces = $inspection.referencedUsersOutsideWorkspaces
    credentialStorage = "Windows DPAPI CurrentUser"
  } | ConvertTo-Json -Compress
} catch {
  if ($serviceRoleKey) {
    foreach ($createdId in $createdUserIds) {
      try {
        $null = Invoke-StagingAdminApi -Method Delete -Path "/admin/users/$createdId"
      } catch {
        # Preserve the original failure. A caller must inspect Auth before retrying.
      }
    }
  }
  if (Test-Path -LiteralPath $CredentialPath) {
    Remove-Item -LiteralPath $CredentialPath -Force
  }
  throw
} finally {
  $serviceRoleKey = $null
  if (Test-Path -LiteralPath $temporaryIds) {
    Remove-Item -LiteralPath $temporaryIds -Force
  }
}
