Add-Type -AssemblyName System.Drawing
$text = [IO.File]::ReadAllText('C:\Users\ASUS\Downloads\encoded-20260403144426.txt').Trim()
if ($text -match '^data:image/[a-zA-Z]+;base64,(.*)$') {
    $text = $matches[1]
}
$bytes = [Convert]::FromBase64String($text)
$ms = New-Object IO.MemoryStream(,$bytes)
$bmp = New-Object System.Drawing.Bitmap($ms)
Write-Host "Width: $($bmp.Width) Height: $($bmp.Height)"
$color = $bmp.GetPixel(1,1)
Write-Host "Color at 1,1 - A: $($color.A) R: $($color.R) G: $($color.G) B: $($color.B)"
$hex = "#{0:x2}{1:x2}{2:x2}" -f $color.R, $color.G, $color.B
Write-Host "Color at 1,1 in hex: $hex"
