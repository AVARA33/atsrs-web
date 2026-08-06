Set-StrictMode -Version Latest

$script:Magic = [Text.Encoding]::ASCII.GetBytes('ATSRBK01')
$script:SaltLength = 16
$script:IvLength = 16
$script:MacLength = 32
$script:Iterations = 600000

function Test-AtsrsFixedTimeEquals {
  param(
    [Parameter(Mandatory)][byte[]]$Left,
    [Parameter(Mandatory)][byte[]]$Right
  )
  if ($Left.Length -ne $Right.Length) { return $false }
  $difference = 0
  for ($index = 0; $index -lt $Left.Length; $index++) {
    $difference = $difference -bor ($Left[$index] -bxor $Right[$index])
  }
  $difference -eq 0
}

function ConvertFrom-AtsrsSecureString {
  param([Parameter(Mandatory)][Security.SecureString]$SecureString)

  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
  try {
    [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

function Get-AtsrsBackupKeys {
  param(
    [Parameter(Mandatory)][Security.SecureString]$Passphrase,
    [Parameter(Mandatory)][byte[]]$Salt,
    [int]$Iterations = $script:Iterations
  )

  $plain = ConvertFrom-AtsrsSecureString -SecureString $Passphrase
  try {
    $derive = [Security.Cryptography.Rfc2898DeriveBytes]::new(
      $plain,
      $Salt,
      $Iterations,
      [Security.Cryptography.HashAlgorithmName]::SHA256
    )
    try {
      $material = $derive.GetBytes(64)
      [pscustomobject]@{
        Encryption = $material[0..31]
        Authentication = $material[32..63]
      }
    } finally {
      $derive.Dispose()
    }
  } finally {
    $plain = $null
  }
}

function Protect-AtsrsBackupFile {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)][string]$InputPath,
    [Parameter(Mandatory)][string]$OutputPath,
    [Parameter(Mandatory)][Security.SecureString]$Passphrase
  )

  $input = (Resolve-Path -LiteralPath $InputPath).Path
  $outputParent = Split-Path -Parent $OutputPath
  if (-not (Test-Path -LiteralPath $outputParent -PathType Container)) {
    New-Item -ItemType Directory -Path $outputParent -Force | Out-Null
  }

  $salt = [byte[]]::new($script:SaltLength)
  $iv = [byte[]]::new($script:IvLength)
  $random = [Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $random.GetBytes($salt)
    $random.GetBytes($iv)
  } finally {
    $random.Dispose()
  }
  $keys = Get-AtsrsBackupKeys -Passphrase $Passphrase -Salt $salt
  $temporary = "$OutputPath.partial"

  try {
    $aes = [Security.Cryptography.Aes]::Create()
    $aes.KeySize = 256
    $aes.Mode = [Security.Cryptography.CipherMode]::CBC
    $aes.Padding = [Security.Cryptography.PaddingMode]::PKCS7
    $aes.Key = $keys.Encryption
    $aes.IV = $iv

    $source = [IO.File]::OpenRead($input)
    $target = [IO.File]::Create($temporary)
    try {
      $target.Write($script:Magic, 0, $script:Magic.Length)
      $target.Write($salt, 0, $salt.Length)
      $target.Write($iv, 0, $iv.Length)
      $iterationBytes = [BitConverter]::GetBytes([int]$script:Iterations)
      $target.Write($iterationBytes, 0, $iterationBytes.Length)
      $encryptor = $aes.CreateEncryptor()
      $crypto = [Security.Cryptography.CryptoStream]::new(
        $target,
        $encryptor,
        [Security.Cryptography.CryptoStreamMode]::Write,
        $true
      )
      try {
        $source.CopyTo($crypto)
        $crypto.FlushFinalBlock()
      } finally {
        $crypto.Dispose()
        $encryptor.Dispose()
      }
    } finally {
      $source.Dispose()
      $target.Dispose()
      $aes.Dispose()
    }

    $hmac = [Security.Cryptography.HMACSHA256]::new($keys.Authentication)
    $macSource = [IO.File]::OpenRead($temporary)
    try {
      $mac = $hmac.ComputeHash($macSource)
    } finally {
      $macSource.Dispose()
      $hmac.Dispose()
    }
    $append = [IO.File]::Open($temporary, [IO.FileMode]::Append, [IO.FileAccess]::Write)
    try {
      $append.Write($mac, 0, $mac.Length)
    } finally {
      $append.Dispose()
    }
    Move-Item -LiteralPath $temporary -Destination $OutputPath -Force
  } finally {
    if (Test-Path -LiteralPath $temporary) {
      Remove-Item -LiteralPath $temporary -Force
    }
    [Array]::Clear($keys.Encryption, 0, $keys.Encryption.Length)
    [Array]::Clear($keys.Authentication, 0, $keys.Authentication.Length)
  }
}

function Unprotect-AtsrsBackupFile {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)][string]$InputPath,
    [Parameter(Mandatory)][string]$OutputPath,
    [Parameter(Mandatory)][Security.SecureString]$Passphrase
  )

  $input = (Resolve-Path -LiteralPath $InputPath).Path
  $length = (Get-Item -LiteralPath $input).Length
  $headerLength = $script:Magic.Length + $script:SaltLength + $script:IvLength + 4
  if ($length -le ($headerLength + $script:MacLength)) {
    throw 'Encrypted backup is truncated'
  }

  $stream = [IO.File]::OpenRead($input)
  try {
    $magic = [byte[]]::new($script:Magic.Length)
    [void]$stream.Read($magic, 0, $magic.Length)
    if (-not (Test-AtsrsFixedTimeEquals -Left $magic -Right $script:Magic)) {
      throw 'Encrypted backup has an invalid header'
    }
    $salt = [byte[]]::new($script:SaltLength)
    $iv = [byte[]]::new($script:IvLength)
    $iterationBytes = [byte[]]::new(4)
    [void]$stream.Read($salt, 0, $salt.Length)
    [void]$stream.Read($iv, 0, $iv.Length)
    [void]$stream.Read($iterationBytes, 0, $iterationBytes.Length)
    $iterations = [BitConverter]::ToInt32($iterationBytes, 0)
    if ($iterations -lt 100000) {
      throw 'Encrypted backup uses an unsafe or invalid derivation count'
    }
  } finally {
    $stream.Dispose()
  }

  $keys = Get-AtsrsBackupKeys -Passphrase $Passphrase -Salt $salt -Iterations $iterations
  $cipherPath = $null
  try {
    $authenticatedLength = $length - $script:MacLength
    $expectedMac = [byte[]]::new($script:MacLength)
    $macReader = [IO.File]::OpenRead($input)
    try {
      $macReader.Position = $authenticatedLength
      [void]$macReader.Read($expectedMac, 0, $expectedMac.Length)
      $macReader.Position = 0
      $hmac = [Security.Cryptography.HMACSHA256]::new($keys.Authentication)
      try {
        $buffer = [byte[]]::new(1048576)
        $remaining = $authenticatedLength
        while ($remaining -gt 0) {
          $read = $macReader.Read($buffer, 0, [Math]::Min($buffer.Length, $remaining))
          if ($read -le 0) { throw 'Encrypted backup ended unexpectedly' }
          if ($remaining -eq $read) {
            [void]$hmac.TransformFinalBlock($buffer, 0, $read)
          } else {
            [void]$hmac.TransformBlock($buffer, 0, $read, $null, 0)
          }
          $remaining -= $read
        }
        $actualMac = $hmac.Hash
      } finally {
        $hmac.Dispose()
      }
    } finally {
      $macReader.Dispose()
    }
    if (-not (Test-AtsrsFixedTimeEquals -Left $expectedMac -Right $actualMac)) {
      throw 'Backup authentication failed: wrong passphrase or modified file'
    }

    $cipherLength = $authenticatedLength - $headerLength
    $cipherPath = "$OutputPath.cipher"
    $cipherSource = [IO.File]::OpenRead($input)
    $cipherTarget = [IO.File]::Create($cipherPath)
    try {
      $cipherSource.Position = $headerLength
      $copyBuffer = [byte[]]::new(1048576)
      $copyRemaining = $cipherLength
      while ($copyRemaining -gt 0) {
        $copyRead = $cipherSource.Read(
          $copyBuffer,
          0,
          [Math]::Min($copyBuffer.Length, $copyRemaining)
        )
        if ($copyRead -le 0) {
          throw 'Encrypted backup ciphertext ended unexpectedly'
        }
        $cipherTarget.Write($copyBuffer, 0, $copyRead)
        $copyRemaining -= $copyRead
      }
    } finally {
      $cipherSource.Dispose()
      $cipherTarget.Dispose()
    }

    $aes = [Security.Cryptography.Aes]::Create()
    $aes.KeySize = 256
    $aes.Mode = [Security.Cryptography.CipherMode]::CBC
    $aes.Padding = [Security.Cryptography.PaddingMode]::PKCS7
    $aes.Key = $keys.Encryption
    $aes.IV = $iv
    $source = [IO.File]::OpenRead($cipherPath)
    $target = [IO.File]::Create($OutputPath)
    try {
      $decryptor = $aes.CreateDecryptor()
      $crypto = [Security.Cryptography.CryptoStream]::new(
        $source,
        $decryptor,
        [Security.Cryptography.CryptoStreamMode]::Read,
        $true
      )
      try {
        $buffer = [byte[]]::new(1048576)
        while (($read = $crypto.Read($buffer, 0, $buffer.Length)) -gt 0) {
          $target.Write($buffer, 0, $read)
        }
      } finally {
        $crypto.Dispose()
        $decryptor.Dispose()
      }
    } finally {
      $source.Dispose()
      $target.Dispose()
      $aes.Dispose()
    }
  } catch {
    if (Test-Path -LiteralPath $OutputPath) {
      Remove-Item -LiteralPath $OutputPath -Force
    }
    throw
  } finally {
    if ($null -ne $cipherPath -and (Test-Path -LiteralPath $cipherPath)) {
      Remove-Item -LiteralPath $cipherPath -Force
    }
    [Array]::Clear($keys.Encryption, 0, $keys.Encryption.Length)
    [Array]::Clear($keys.Authentication, 0, $keys.Authentication.Length)
  }
}

function Get-AtsrsSecretStore {
  param([string]$Path = (Join-Path $env:LOCALAPPDATA 'ATSRS\Backup\secrets.clixml'))

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "ATSRS backup secrets are not initialized: $Path"
  }
  Import-Clixml -LiteralPath $Path
}

Export-ModuleMember -Function @(
  'Protect-AtsrsBackupFile',
  'Unprotect-AtsrsBackupFile',
  'Get-AtsrsSecretStore',
  'ConvertFrom-AtsrsSecureString'
)
