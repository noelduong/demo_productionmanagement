import csv
import json
import urllib.request
import urllib.parse
from datetime import datetime
import ssl

csv_file = 'PP_ KHSX TOTAL 26 - DATA Đặt Hàng 2026.csv'
url = 'https://script.google.com/macros/s/AKfycbxXe57opBzPLN8M7TwA_bI0qPtq4ZwLe8N2bAwGQ_bXzdbszB-zZ1oDhBQ2fRJ3xAPIag/exec'

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

success_count = 0
error_count = 0

with open(csv_file, 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    rows = list(reader)

data_rows = rows[9:]

for row_idx, row in enumerate(data_rows):
    if not row or not row[0].strip() or len(row) < 30:
        continue
    
    try:
        sl_nhap_str = row[28].strip().replace('.', '')
        if not sl_nhap_str or not sl_nhap_str.isdigit():
            continue
            
        sl_nhap = int(sl_nhap_str)
        if sl_nhap <= 0:
            continue
            
        ngay_giao_str = row[27].strip()
        if not ngay_giao_str or ngay_giao_str == '31/12/1899':
            continue
            
        try:
            ngay_giao_date = datetime.strptime(ngay_giao_str, '%d/%m/%Y')
            ngay_giao_fmt = ngay_giao_date.strftime('%Y-%m-%d')
        except:
            continue
            
        stt = row[0].strip()
        stt_padded = stt.zfill(4)
        partner = row[17].strip()
        order_no = f"{stt_padded}/2026/PLMR-{partner}"
        
        product_name = row[3].strip()
        art_code = row[5].strip()
        color = row[6].strip()
        
        po_month_str = row[18].strip()
        po_month = "2026-05"
        for p in po_month_str.split():
            if p.isdigit():
                po_month = f"2026-{int(p):02d}"
                break
                
        status = row[25].strip()
        if status.lower() == 'cancel':
            # Skip cancelled POs entirely
            continue
                
        payload = {
            "action": "saveReceiving",
            "data": {
                "orderNo": order_no,
                "poMonth": po_month,
                "receiverName": "System Import",
                "receivingDate": ngay_giao_fmt,
                "receiveBatch": "Lần 1",
                "items": [
                    {
                        "productName": product_name,
                        "artCode": art_code,
                        "color": color,
                        "note": "Nhập từ CSV",
                        "sizeData": {
                            "FREE": sl_nhap
                        }
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
                print(f"Success Receiving: {order_no}")
            else:
                error_count += 1
                print(f"Failed Receiving {order_no}: {res_json.get('message')}")
                
    except Exception as e:
        error_count += 1
        print(f"Error processing row {row_idx + 10} STT {row[0]}: {e}")

print(f"Receiving Migration completed. Success: {success_count}, Errors: {error_count}")
