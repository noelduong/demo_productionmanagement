import urllib.request
import json
import ssl
url = 'https://script.google.com/macros/s/AKfycbx0vjv3WWF9GXxA2zS16kNkLR0Nn9sdIfSUTIB7smfQbPhLRSX27P78OVFBJEPM9nJ9TQ/exec?action=getHistory'
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
with urllib.request.urlopen(url, context=ctx) as res:
    history = json.loads(res.read().decode('utf-8'))['data']

url2 = 'https://script.google.com/macros/s/AKfycbx0vjv3WWF9GXxA2zS16kNkLR0Nn9sdIfSUTIB7smfQbPhLRSX27P78OVFBJEPM9nJ9TQ/exec?action=getReceivingHistory'
with urllib.request.urlopen(url2, context=ctx) as res:
    recv = json.loads(res.read().decode('utf-8'))['data']

recv_pos = set(r.get('Mã đơn hàng') for r in recv)
for d in history:
    if d['orderNo'] in recv_pos:
        month = d.get('poMonth')
        if '9' in str(month):
            print(f"PO {d['orderNo']} has receiving data! poMonth={month}")
