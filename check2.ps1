Add-Type -AssemblyName System.Drawing
$text = [IO.File]::ReadAllText('C:\Users\ASUS\Downloads\encoded-20260403144426.txt').Trim()
if ($text -match '^data:image/[a-zA-Z]+;base64,(.*)$') {
    $text = $matches[1]
}
$bytes = [Convert]::FromBase64String($text)
$ms = New-Object IO.MemoryStream(,$bytes)
$bmp = New-Object System.Drawing.Bitmap($ms)
$color = $bmp.GetPixel(0,0)
Write-Host "A: $($color.A), R: $($color.R), G: $($color.G), B: $($color.B)"
