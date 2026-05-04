import os

path = 'index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target1 = """        allOrders.forEach(order => {
          if (!order.details || order.details.length === 0) return;
          order.details.forEach((item, index) => {"""

replacement1 = """        allOrders.forEach(order => {
          if (!order.details || order.details.length === 0) return;
          
          let poTotalReceived = 0;
          if (window.dashReceiving && window.dashReceiving.length > 0) {
              window.dashReceiving.forEach(r => {
                  if (r["Mã đơn hàng"] === order.orderNo) poTotalReceived += (Number(r["Tổng SL nhận"]) || 0);
              });
          }

          order.details.forEach((item, index) => {"""

target2 = """            if (order.isReceived) {
              statusKey = 'Done';
            } else {"""

replacement2 = """            let isItemReceived = order.isReceived;
            // Xử lý đơn giao nhiều đợt: nếu PO chưa nhập đủ, và item này có ngày giao trong tương lai -> Chưa nhập
            if (isItemReceived && poTotalReceived < (order.total || 0) && d) {
                const nowD = new Date();
                const targetD = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                const daysDiff = (targetD.getTime() - nowD.getTime()) / (1000 * 3600 * 24);
                if (daysDiff > 0) {
                    isItemReceived = false;
                }
            }

            if (isItemReceived) {
              statusKey = 'Done';
            } else {"""

if target1 in content and target2 in content:
    content = content.replace(target1, replacement1)
    content = content.replace(target2, replacement2)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Targets not found!")
    if target1 not in content: print("target1 missing")
    if target2 not in content: print("target2 missing")
