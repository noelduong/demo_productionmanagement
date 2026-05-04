import urllib.request
import json
url = 'https://script.google.com/macros/s/AKfycbx0vjv3WWF9GXxA2zS16kNkLR0Nn9sdIfSUTIB7smfQbPhLRSX27P78OVFBJEPM9nJ9TQ/exec'
h_res = json.loads(urllib.request.urlopen(url + '?action=getHistory').read().decode('utf-8'))
r_res = json.loads(urllib.request.urlopen(url + '?action=getReceivedPOs').read().decode('utf-8'))
received = r_res.get('data', [])
for o in h_res.get('data', []):
    if o.get('orderNo') in received:
        print(f"PO {o.get('orderNo')} ({o.get('poMonth')}) is received")
