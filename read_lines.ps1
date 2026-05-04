$lines = Get-Content 'd:\placement\Index.html'
for ($i = 2142; $i -le 2159; $i++) {
    Write-Host ("{0}: |{1}|" -f ($i+1), $lines[$i])
}
