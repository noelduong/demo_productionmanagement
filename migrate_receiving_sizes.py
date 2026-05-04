import csv
import json
import urllib.request
import urllib.parse
from datetime import datetime
import ssl

csv_file = 'PP_ KHSX TOTAL 26 - DATA NHẬP PO 2026 chi tiết nhập size.CSV'
url = 'https://script.google.com/macros/s/AKfycbxXe57opBzPLN8M7TwA_bI0qPtq4ZwLe8N2bAwGQ_bXzdbszB-zZ1oDhBQ2fRJ3xAPIag/exec'

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

success_count = 0
error_count = 0

with open(csv_file, 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    rows = list(reader)

# Data starts at row index 2 (line 3)
data_rows = rows[2:]

for row_idx, row in enumerate(data_rows):
    if not row or len(row) < 17 or not row[0].strip():
        continue
    
    try:
        ma_don = row[0].strip() # 66_PO166_TRẮNG
        stt_str = ma_don.split('_')[0]
        if not stt_str.isdigit():
            continue
            
        stt_padded = stt_str.zfill(4)
        partner = row[12].strip()
        order_no = f"{stt_padded}/2026/PLMR-{partner}"
        
        status = row[10].strip()
        if 'cancel' in status.lower():
            # Skip cancelled POs entirely
            continue
        
        product_name = row[1].strip()
        batch_name = row[2].strip() # LẦN 1
        
        sizeData = {}
        for s_idx, size_name in [(3, 'S'), (4, 'M'), (5, 'L'), (6, 'XL'), (7, 'XXL')]:
            val = row[s_idx].strip().replace('.', '')
            if val and val.isdigit():
                sizeData[size_name] = int(val)
                
        total_nhap_str = row[8].strip().replace('.', '')
        if not sizeData and total_nhap_str and total_nhap_str.isdigit():
            sizeData['FREE'] = int(total_nhap_str)
            
        if not sizeData:
            continue
            
        ngay_nhap_str = row[9].strip()
        if not ngay_nhap_str:
            continue
            
        try:
            ngay_nhap_date = datetime.strptime(ngay_nhap_str, '%d/%m/%Y')
            ngay_nhap_fmt = ngay_nhap_date.strftime('%Y-%m-%d')
        except:
            continue
            
        po_month_str = row[13].strip() # e.g. "Tháng 3"
        po_month = "2026-05"
        for p in po_month_str.split():
            if p.isdigit():
                po_month = f"2026-{int(p):02d}"
                break
                
        payload = {
            "action": "saveReceiving",
            "data": {
                "orderNo": order_no,
                "poMonth": po_month,
                "receiverName": "System Import",
                "receivingDate": ngay_nhap_fmt,
                "receiveBatch": batch_name,
                "items": [
                    {
                        "productName": product_name,
                        "artCode": "", # Not in this CSV
                        "color": "", # Not in this CSV (extracted from ma_don maybe, but not strictly needed for receiving)
                        "note": "Nhập chi tiết Size",
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
                print(f"Success Receiving Size: {order_no}")
            else:
                error_count += 1
                print(f"Failed Receiving Size {order_no}: {res_json.get('message')}")
                
    except Exception as e:
        error_count += 1
        print(f"Error processing row {row_idx + 3}: {e}")

print(f"Receiving Size Migration completed. Success: {success_count}, Errors: {error_count}")
