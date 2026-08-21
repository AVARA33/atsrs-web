param(
  [string]$Source = ""
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$scriptRoot = Split-Path -Parent $PSCommandPath
$androidRoot = Split-Path -Parent $scriptRoot
$projectRoot = (Resolve-Path (Join-Path $androidRoot '..\..')).Path
if (-not $Source) {
  $Source = Join-Path $projectRoot 'assets\branding\atsrs-favicon-green-v576.png'
}
$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$resourceRoot = Join-Path $androidRoot 'android\app\src\main\res'
$sourceImage = [System.Drawing.Image]::FromFile($sourcePath)
$dark = [System.Drawing.Color]::FromArgb(255, 3, 7, 6)

function Save-Icon([string]$Path, [bool]$Transparent, [double]$Scale) {
  $existing = [System.Drawing.Image]::FromFile($Path)
  $width = $existing.Width
  $height = $existing.Height
  $existing.Dispose()
  $bitmap = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  if ($Transparent) { $graphics.Clear([System.Drawing.Color]::Transparent) } else { $graphics.Clear($dark) }
  $side = [Math]::Floor([Math]::Min($width, $height) * $Scale)
  $left = [Math]::Floor(($width - $side) / 2)
  $top = [Math]::Floor(($height - $side) / 2)
  $graphics.DrawImage($sourceImage, $left, $top, $side, $side)
  $graphics.Dispose()
  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}

Get-ChildItem -LiteralPath $resourceRoot -Recurse -Filter 'ic_launcher_foreground.png' | ForEach-Object {
  Save-Icon $_.FullName $true 0.66
}
Get-ChildItem -LiteralPath $resourceRoot -Recurse -Include 'ic_launcher.png','ic_launcher_round.png' | ForEach-Object {
  Save-Icon $_.FullName $false 0.72
}
Get-ChildItem -LiteralPath $resourceRoot -Recurse -Filter 'splash.png' | ForEach-Object {
  Save-Icon $_.FullName $false 0.28
}

$sourceImage.Dispose()
Write-Host 'ATSRS Android launcher and splash assets generated.'
