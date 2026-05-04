import urllib.request
import json
import ssl
url = 'https://script.google.com/macros/s/AKfycbx0vjv3WWF9GXxA2zS16kNkLR0Nn9sdIfSUTIB7smfQbPhLRSX27P78OVFBJEPM9nJ9TQ/exec?action=getHistory'
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
with urllib.request.urlopen(url, context=ctx) as res:
    data = json.loads(res.read().decode('utf-8'))['data']
    for d in data:
        po_month = str(d.get('poMonth', ''))
        d27 = str(d.get('benchmarkD27', ''))
        if po_month == '9/2026' or '2026-09' in d27 or '2026-09' in po_month:
            print(f"PO {d.get('orderNo')}: D27={d27}, poMonth={po_month}")
