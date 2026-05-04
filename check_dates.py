import urllib.request
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

url = 'https://script.google.com/macros/s/AKfycbx0vjv3WWF9GXxA2zS16kNkLR0Nn9sdIfSUTIB7smfQbPhLRSX27P78OVFBJEPM9nJ9TQ/exec'

# Get receiving history (actual receiving dates)
recv = json.loads(urllib.request.urlopen(url + '?action=getReceivingHistory').read().decode('utf-8'))
recv_data = recv.get('data', [])

# Get order history
hist = json.loads(urllib.request.urlopen(url + '?action=getHistory').read().decode('utf-8'))
hist_data = hist.get('data', [])

# Get received POs
rpos = json.loads(urllib.request.urlopen(url + '?action=getReceivedPOs').read().decode('utf-8'))
received_pos = rpos.get('data', [])

# Build receiving map: PO -> list of {product, color, date}
recv_map = {}
for r in recv_data:
    po = r.get("Mã đơn hàng", "")
    if po not in recv_map:
        recv_map[po] = []
    recv_map[po].append({
        "product": r.get("Tên SP", ""),
        "color": r.get("Màu", ""),
        "recv_date": r.get("Ngày nhập", ""),
        "qty": r.get("Tổng SL nhận", 0),
        "dot": r.get("Đợt nhập", "")
    })

# Show a few received POs with their receiving dates
print("=== Receiving records by PO (first 5 POs) ===")
count = 0
for po, items in recv_map.items():
    if count >= 5:
        break
    order = next((o for o in hist_data if o.get('orderNo') == po), None)
    po_month = order.get('poMonth', '?') if order else '?'
    print(f"\nPO: {po} (poMonth: {po_month})")
    for it in items:
        print(f"  Product: {it['product']}, Recv Date: {it['recv_date']}, Qty: {it['qty']}, Dot: {it['dot']}")
    count += 1

# Compare planned vs actual dates
print("\n=== Comparing planned vs actual dates ===")
test_pos = list(recv_map.keys())[:3]
for po in test_pos:
    detail_res = json.loads(urllib.request.urlopen(url + '?action=getOrderDetails&orderNo=' + po).read().decode('utf-8'))
    details = detail_res.get('data', []) if detail_res.get('success') else []
    order = next((o for o in hist_data if o.get('orderNo') == po), None)
    po_month = order.get('poMonth', '?') if order else '?'
    print(f"\nPO: {po} (poMonth: {po_month})")
    for d in details:
        planned = d.get("T.Gian Giao", "N/A")
        product = d.get("Tên SP", "?")
        print(f"  [Detail] Product: {product}, Planned delivery: {planned}")
    print(f"  [Receiving]:")
    for it in recv_map[po]:
        print(f"    Product: {it['product']}, Recv Date: {it['recv_date']}")

# Check: which POs have poMonth in future (6,7,8,9...) but are marked received?
print("\n=== Future-month POs marked as received ===")
future_months = ['5/2026','6/2026','7/2026','8/2026','9/2026','10/2026','11/2026','12/2026']
for o in hist_data:
    pm = o.get('poMonth','')
    if pm in future_months and o.get('orderNo') in received_pos:
        print(f"PO: {o['orderNo']} poMonth={pm} -> marked received!")
        if o['orderNo'] in recv_map:
            for it in recv_map[o['orderNo']]:
                print(f"  Actual recv: {it['recv_date']} - {it['product']} ({it['qty']})")
