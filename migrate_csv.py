import csv
import json
import urllib.request
import urllib.parse
from datetime import datetime, timedelta
import ssl

csv_file = 'PP_ KHSX TOTAL 26 - DATA Đặt Hàng 2026.csv'
url = 'https://script.google.com/macros/s/AKfycbx0vjv3WWF9GXxA2zS16kNkLR0Nn9sdIfSUTIB7smfQbPhLRSX27P78OVFBJEPM9nJ9TQ/exec'

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

success_count = 0
error_count = 0

with open(csv_file, 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    rows = list(reader)

# Data starts at row index 9 (line 10)
data_rows = rows[9:]

for row_idx, row in enumerate(data_rows):
    if not row or not row[0].strip() or len(row) < 28:
        continue
    
    try:
        stt = row[0].strip()
        stt_padded = stt.zfill(4)
        partner = row[17].strip()
        
        # orderNo: 0001/2026/PLMR-TLN
        order_no = f"{stt_padded}/2026/PLMR-{partner}"
        
        product_name = row[3].strip()
        art_code = row[5].strip()
        color = row[6].strip()
        
        # Parse sizes
        sizeData = {}
        # S(9), M(10), L(11), XL(12), XXL(13)
        for s_idx, size_name in [(9, 'S'), (10, 'M'), (11, 'L'), (12, 'XL'), (13, 'XXL')]:
            val = row[s_idx].strip().replace('.', '')
            if val and val.isdigit():
                sizeData[size_name] = int(val)
                
        qty_str = row[14].strip().replace('.', '')
        qty = int(qty_str) if qty_str else 0
        if not sizeData and qty > 0:
            sizeData['FREE'] = qty
        
        price_str = row[15].strip().replace('.', '').replace(',', '.').replace(' đ', '').replace('đ', '')
        unit_price = float(price_str) if price_str else 0
        
        total_str = row[16].strip().replace('.', '').replace(',', '.').replace(' đ', '').replace('đ', '')
        total_val = float(total_str) if total_str else 0
        
        delivery_str = row[26].strip()
        if not delivery_str or delivery_str == '31/12/1899':
            delivery_str = row[20].strip()
            
        delivery_date = None
        if delivery_str:
            try:
                delivery_date = datetime.strptime(delivery_str, '%d/%m/%Y')
            except:
                pass
                
        if not delivery_date:
            delivery_date = datetime(2026, 5, 31) # Fallback
            
        order_date = delivery_date - timedelta(days=27)
        
        po_month_str = row[18].strip() # e.g. "Tháng 3"
        po_month = "2026-05"
        for p in po_month_str.split():
            if p.isdigit():
                po_month = f"2026-{int(p):02d}"
                break
                
        status = row[25].strip()
        note = row[1].strip() + " - " + row[2].strip()
        if status.lower() == 'cancel':
            note = "[CANCELLED] " + note
        
        payload = {
            "action": "saveOrder",
            "data": {
                "orderNo": order_no,
                "orderDate": order_date.strftime('%Y-%m-%d'),
                "creatorName": "System Import",
                "companyName": "POLOMANOR",
                "partnerName": partner,
                "partnerAddress": "",
                "vatRate": 0,
                "subtotal": total_val,
                "vatAmount": 0,
                "total": total_val,
                "poMonth": po_month,
                "items": [
                    {
                        "productName": product_name,
                        "artCode": art_code,
                        "color": color,
                        "totalQty": qty,
                        "unitPrice": unit_price,
                        "nplInfo": "",
                        "deliveryDate": delivery_date.strftime('%Y-%m-%d'),
                        "note": note,
                        "sizeData": sizeData
                    }
                ]
            }
        }
        
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
        
        with urllib.request.urlopen(req, context=ctx) as response:
            res_body = response.read().decode('utf-8')
            res_json = json.loads(res_body)
            if res_json.get('success'):
                success_count += 1
                print(f"Success: {order_no}")
            else:
                error_count += 1
                print(f"Failed {order_no}: {res_json.get('message')}")
                
    except Exception as e:
        error_count += 1
        print(f"Error processing row {row_idx + 10} STT {row[0] if len(row)>0 else '?'}: {e}")

print(f"Migration completed. Success: {success_count}, Errors: {error_count}")
