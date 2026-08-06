$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

Import-Module (Join-Path $PSScriptRoot '..\scripts\operations\AtsrsBackup.Common.psm1') -Force
$work = Join-Path $env:TEMP "atsrs-crypto-test-$([Guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $work | Out-Null

try {
  $source = Join-Path $work 'source.bin'
  $encrypted = Join-Path $work 'test.atsrsbak'
  $restored = Join-Path $work 'restored.bin'
  $bytes = [byte[]]::new(1048699)
  $random = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $random.GetBytes($bytes) } finally { $random.Dispose() }
  [IO.File]::WriteAllBytes($source, $bytes)
  $passphrase = ConvertTo-SecureString 'synthetic-test-passphrase-only' -AsPlainText -Force

  Protect-AtsrsBackupFile -InputPath $source -OutputPath $encrypted -Passphrase $passphrase
  Unprotect-AtsrsBackupFile -InputPath $encrypted -OutputPath $restored -Passphrase $passphrase
  if ((Get-FileHash -LiteralPath $source).Hash -ne (Get-FileHash -LiteralPath $restored).Hash) {
    throw 'Encrypted backup round-trip mismatch'
  }
  Write-Output 'CRYPTO_ROUNDTRIP=PASS'

  $tampered = [IO.File]::ReadAllBytes($encrypted)
  $tampered[64] = $tampered[64] -bxor 1
  [IO.File]::WriteAllBytes($encrypted, $tampered)
  try {
    Unprotect-AtsrsBackupFile -InputPath $encrypted -OutputPath $restored -Passphrase $passphrase
    throw 'Tampered backup was accepted'
  } catch {
    if ($_.Exception.Message -eq 'Tampered backup was accepted') { throw }
  }
  Write-Output 'TAMPER_REJECTION=PASS'
} finally {
  if (Test-Path -LiteralPath $work) {
    Remove-Item -LiteralPath $work -Recurse -Force
  }
}
