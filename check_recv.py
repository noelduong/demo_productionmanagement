import urllib.request
import json
import ssl
url = 'https://script.google.com/macros/s/AKfycbx0vjv3WWF9GXxA2zS16kNkLR0Nn9sdIfSUTIB7smfQbPhLRSX27P78OVFBJEPM9nJ9TQ/exec?action=getReceivingHistory'
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
with urllib.request.urlopen(url, context=ctx) as res:
    data = json.loads(res.read().decode('utf-8'))['data']
    for d in data:
        if d.get('Mã đơn hàng') in ['0276/2026/PLMR-VH', '0277/2026/PLMR-VH']:
            print(f"Receiving {d.get('Mã đơn hàng')}: SL={d.get('Tổng SL nhận')}")
