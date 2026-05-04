$htmlPath = "d:\APP\Index.html"
$newB64 = [IO.File]::ReadAllText('C:\Users\ASUS\Downloads\encoded-20260403144426.txt').Trim()
if ($newB64 -notmatch '^data:image') {
    $newB64 = "data:image/png;base64," + $newB64
}

$htmlContent = [IO.File]::ReadAllText($htmlPath)
$htmlContent = $htmlContent -replace 'src="data:image/png;base64,[^"]+"', ("src=`"" + $newB64 + "`"")
[IO.File]::WriteAllText($htmlPath, $htmlContent)
Write-Host "Injected new transparent base64 image."
