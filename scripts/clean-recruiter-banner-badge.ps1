# Localized background repair requested by the owner; all other pixels stay intact.
Add-Type -AssemblyName System.Drawing
$assetRoot = Join-Path $PSScriptRoot '../assets/recruiters'
$sourcePath = [IO.Path]::GetFullPath((Join-Path $assetRoot 'recruiter-directory-orbit-v1.png'))
$outputPath = [IO.Path]::GetFullPath((Join-Path $assetRoot 'recruiter-directory-orbit-clean.png'))
$source = [Drawing.Bitmap]::new($sourcePath)
$result = [Drawing.Bitmap]::new($source)
try {
    # Only the baked-in bottom-right badge. Interpolate adjacent background rows.
    for ($x = 748; $x -le 960; $x++) {
        $top = $source.GetPixel($x, 243)
        $bottom = $source.GetPixel($x, 285)
        for ($y = 244; $y -le 284; $y++) {
            $weight = ($y - 243) / 42.0
            $red = [int][Math]::Round($top.R * (1-$weight) + $bottom.R * $weight)
            $green = [int][Math]::Round($top.G * (1-$weight) + $bottom.G * $weight)
            $blue = [int][Math]::Round($top.B * (1-$weight) + $bottom.B * $weight)
            $result.SetPixel($x, $y, [Drawing.Color]::FromArgb(255, $red, $green, $blue))
        }
    }
    $result.Save($outputPath, [Drawing.Imaging.ImageFormat]::Png)
    $unexpected = 0
    for ($x = 0; $x -lt $source.Width; $x++) {
        for ($y = 0; $y -lt $source.Height; $y++) {
            if (($x -lt 748 -or $x -gt 960 -or $y -lt 244 -or $y -gt 284) -and $source.GetPixel($x,$y).ToArgb() -ne $result.GetPixel($x,$y).ToArgb()) { $unexpected++ }
        }
    }
    if ($unexpected -ne 0) { throw 'Pixels outside the badge changed.' }
    Write-Output 'Verified: all pixels outside the old badge are unchanged.'
} finally { $result.Dispose(); $source.Dispose() }
