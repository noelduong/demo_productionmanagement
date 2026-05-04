Add-Type -AssemblyName System.Drawing
$b64 = [IO.File]::ReadAllText('C:\Users\ASUS\Downloads\encoded-20260403144426.txt').Trim()
if ($b64 -match '^data:image/[a-zA-Z]+;base64,(.*)$') {
    $b64 = $matches[1]
}
$bytes = [Convert]::FromBase64String($b64)
$ms = New-Object IO.MemoryStream(,$bytes)
$bmp = New-Object System.Drawing.Bitmap($ms)
$color = $bmp.GetPixel(0,0)
$hex = "#{0:x2}{1:x2}{2:x2}" -f $color.R, $color.G, $color.B
Write-Host "Logo background color: $hex"
