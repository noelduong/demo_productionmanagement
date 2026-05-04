const fs = require('fs');
const path = 'd:\\placement\\Index.html';
let content = fs.readFileSync(path, 'utf8');

const url = "https://script.google.com/macros/s/AKfycbxsZ0ZrQM_fVh1gD4uKQuXyaXiPHYVdZxPrXUbGc8jdIcZAHld6TZcfftVMc8rUf1rD8Q/exec";

// 1. Replace the submit logic
const submitRegex = /if\s*\(typeof\s*google\s*!==\s*"undefined"\)\s*\{[\s\S]*?\.submitOrder\(payload\);\s*\}\s*else\s*\{[\s\S]*?\}\s*\}/;

const fetchSubmitCode = `
        const WEB_APP_URL = "${url}";
        
        fetch(WEB_APP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'saveOrder', data: payload })
        })
        .then(response => response.json())
        .then(res => {
          hideSpinner();
          if (res.success) {
            showToast(res.message, "success");
            setTimeout(() => {
              if (confirm("Lưu thành công! Bạn có muốn làm mới form để tạo đơn mới?")) {
                window.top.location.href = window.top.location.href;
              }
            }, 1500);
          } else {
            showToast(res.message, "error");
          }
        })
        .catch(err => {
          hideSpinner();
          showToast("Lỗi kết nối: " + err.message, "error");
        });
`;

if (submitRegex.test(content)) {
    content = content.replace(submitRegex, fetchSubmitCode);
    console.log("Updated submitOrderProcess");
}

// 2. Replace the history logic
const historyRegex = /if\s*\(typeof\s*google\s*===\s*"undefined"\)\s*\{[\s\S]*?\}\s*google\.script\.run[\s\S]*?\.getOrderHistory\(\);/;

const fetchHistoryCode = `
        const WEB_APP_URL = "${url}";
        
        fetch(WEB_APP_URL + "?action=getHistory")
          .then(response => response.json())
          .then(res => {
            if (!res.success || !res.data || res.data.length === 0) {
              area.innerHTML = \`<div style="text-align:center; padding:30px; color:var(--text-light);">Chưa có đơn hàng nào trong hệ thống.</div>\`;
              return;
            }
            
            const data = res.data;
`;

if (historyRegex.test(content)) {
    content = content.replace(historyRegex, fetchHistoryCode);
    console.log("Updated loadOrderHistory");
}

fs.writeFileSync(path, content, 'utf8');
