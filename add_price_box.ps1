$file = 'd:\APP\placement\Index.html'
$lines = [System.IO.File]::ReadAllLines($file, [System.Text.Encoding]::UTF8)

# Find the line with nplInfo closing </div> (right after the input)
$insertAfterIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'id="nplInfo"') {
        # The next line should be "            </div>"
        $insertAfterIdx = $i + 1
        break
    }
}

if ($insertAfterIdx -eq -1) {
    Write-Output "FAIL: nplInfo not found"
    exit 1
}

Write-Output "Found nplInfo at line $($insertAfterIdx), inserting price box after line $insertAfterIdx"
Write-Output "Line content: $($lines[$insertAfterIdx])"

$priceBox = @(
'            <div class="form-group">',
'              <label style="display:flex;align-items:center;gap:8px">',
'                <i class="fas fa-tag" style="color:var(--accent)"></i>',
'                Gi&#225; Tham Chi&#7871;u (Nh&#224; M&#225;y)',
'              </label>',
'              <div id="priceRefBox" style="background:#f8fafc;border:1px solid var(--border);border-radius:6px;padding:10px 14px;font-size:0.88rem;color:var(--text-light);min-height:42px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">',
'                <span id="priceRefText">&#8212; Ch&#7885;n s&#7843;n ph&#7849;m &#273;&#7875; xem gi&#225; tham chi&#7871;u</span>',
'              </div>',
'            </div>'
)

$newLines = [System.Collections.Generic.List[string]]::new()
for ($i = 0; $i -lt $lines.Count; $i++) {
    $newLines.Add($lines[$i])
    if ($i -eq $insertAfterIdx) {
        foreach ($pl in $priceBox) {
            $newLines.Add($pl)
        }
    }
}

[System.IO.File]::WriteAllLines($file, $newLines.ToArray(), [System.Text.Encoding]::UTF8)
Write-Output "SUCCESS: Price reference box inserted. Total lines: $($newLines.Count)"
