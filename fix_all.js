const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Hide nplTab menu item (Duyệt Vải & NPL)
const nplMenuMatch = `<div class="nav-item" onclick="switchTab('nplTab', this)" style="border-left: 4px solid transparent;">
      <i class="fas fa-check-double"></i> <span class="nav-text">Duyệt Vải & NPL</span>
    </div>`;
html = html.replace(nplMenuMatch, '');

// 2. Hide nplTab content
const nplTabContentMatch = /<!-- TAB: NPL & APPROVAL -->[\s\S]*?<div id="nplTab" class="tab-content">[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>/;
// Wait, I will just hide it via CSS to be safer
html = html.replace('id="nplTab"', 'id="nplTab" style="display:none;"');

// 3. Add Modal CSS
const styleEndMatch = '</style>';
const modalCss = `
    /* Modal Styles */
    .modal {
      display: none;
      position: fixed;
      z-index: 3000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      overflow: auto;
      background-color: rgba(0,0,0,0.5);
      align-items: center;
      justify-content: center;
    }
    .modal-content {
      background-color: #fefefe;
      margin: auto;
      padding: 0;
      border: none;
      width: 90%;
      max-width: 500px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      animation: modalSlideDown 0.3s ease;
    }
    @keyframes modalSlideDown {
      from { transform: translateY(-50px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .modal-header {
      padding: 15px 20px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      border-radius: 12px 12px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-body {
      padding: 20px;
    }
    .close {
      color: #64748b;
      font-size: 24px;
      font-weight: bold;
      cursor: pointer;
    }
    .close:hover { color: #1e293b; }
`;
// Replace the FIRST </style>
html = html.replace(styleEndMatch, modalCss + '\n' + styleEndMatch);

// 4. Add Modal HTML (at the end of body, but before script)
const modalHtml = `
  <!-- MODAL DUYỆT NPL -->
  <div id="nplModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h3 style="margin: 0; color: var(--primary);"><i class="fas fa-check-double"></i> Duyệt Vải & NPL</h3>
        <span class="close" onclick="closeNplModal()">&times;</span>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Mã PO</label>
          <input type="text" id="nplModal_po" readonly style="background: #f1f5f9; font-weight: bold; border: 1px solid #e2e8f0; padding: 10px; width: 100%; border-radius: 6px;" />
        </div>
        <div class="grid-2" style="margin-top: 15px; gap: 15px;">
          <div class="form-group">
            <label>Duyệt Vải</label>
            <select id="nplModal_vai" class="form-control" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <option value="Pending">Pending</option>
              <option value="Pass">Pass</option>
              <option value="Fail">Fail</option>
            </select>
          </div>
          <div class="form-group">
            <label>Duyệt Bo Dệt</label>
            <select id="nplModal_bo" class="form-control" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <option value="Pending">Pending</option>
              <option value="Pass">Pass</option>
              <option value="Fail">Fail</option>
            </select>
          </div>
        </div>
        <div class="grid-2" style="margin-top: 15px; gap: 15px;">
          <div class="form-group">
            <label>Đồng Bộ NPL</label>
            <select id="nplModal_npl" class="form-control" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <option value="Pending">Pending</option>
              <option value="Synced">Đã Đồng Bộ</option>
              <option value="Delayed">Trễ NPL</option>
            </select>
          </div>
          <div class="form-group">
            <label>Ngày Đồng Bộ</label>
            <input type="date" id="nplModal_date" class="form-control" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;" />
          </div>
        </div>
        <div class="form-group" style="margin-top: 15px;">
          <label>Ghi Chú (Sự cố)</label>
          <input type="text" id="nplModal_note" class="form-control" placeholder="Ghi chú sự cố..." style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;" />
        </div>
        <div style="margin-top: 25px; text-align: right;">
          <button class="btn btn-outline" style="margin-right: 10px;" onclick="closeNplModal()">Hủy</button>
          <button class="btn btn-primary" id="btnSubmitNpl" onclick="submitNplApproval()">
            <i class="fas fa-save"></i> Lưu Trạng Thái
          </button>
        </div>
      </div>
    </div>
  </div>
`;
html = html.replace('</body>', modalHtml + '\n</body>');

// 5. Add JavaScript functions for the Modal
const scriptEndMatch = '/* ================= HISTORY ================= */';
const modalJs = `
    /* ================= NPL MODAL FUNCTIONS ================= */
    function openNplModal(orderNo) {
      const order = allOrdersHistory.find(o => o.orderNo === orderNo);
      if (!order) {
         showToast("Không tìm thấy dữ liệu đơn hàng trong bộ nhớ!", "error");
         return;
      }
      document.getElementById('nplModal_po').value = order.orderNo;
      document.getElementById('nplModal_vai').value = order.statusVai || "Pending";
      document.getElementById('nplModal_bo').value = order.statusBo || "Pending";
      document.getElementById('nplModal_npl').value = order.statusNpl || "Pending";
      document.getElementById('nplModal_date').value = order.syncDate ? order.syncDate.split('T')[0] : "";
      document.getElementById('nplModal_note').value = order.syncNote || "";
      document.getElementById('nplModal').style.display = 'flex';
    }

    function closeNplModal() {
      document.getElementById('nplModal').style.display = 'none';
    }

    function submitNplApproval() {
      const orderNo = document.getElementById('nplModal_po').value;
      const vVai = document.getElementById('nplModal_vai').value;
      const vBo = document.getElementById('nplModal_bo').value;
      const vNpl = document.getElementById('nplModal_npl').value;
      const vDate = document.getElementById('nplModal_date').value;
      const vNote = document.getElementById('nplModal_note').value;
      
      const btn = document.getElementById('btnSubmitNpl');
      btn.disabled = true; 
      let origHtml = btn.innerHTML; 
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';

      fetch(WEB_APP_URL, {
        method: "POST",
        body: JSON.stringify({ action: "updateNplApprovalStatus", data: { orderNo: orderNo, statusVai: vVai, statusBo: vBo, statusNpl: vNpl, syncDate: vDate, syncNote: vNote } })
      }).then(r => r.json()).then(res => {
         if (res.success) { 
           showToast("Đã lưu trạng thái NPL thành công!", "success");
           closeNplModal();
           loadOrderHistory(); // Refresh history table
           loadDashboardData(); // Refresh dashboard stats
         } else { 
           showToast("Lỗi: " + res.message, "error"); 
         }
      }).catch(err => { 
         showToast("Lỗi kết nối: " + err.message, "error"); 
      }).finally(() => {
         btn.disabled = false; 
         btn.innerHTML = origHtml;
      });
    }

`;
html = html.replace(scriptEndMatch, modalJs + scriptEndMatch);

// 6. Add Duyệt NPL button to History table
const editBtnMatch = `<button class="btn btn-primary" style="padding:4px 8px; font-size:0.8rem; background: var(--accent); border: none; margin-left: 5px;" onclick="editOrder('\${order.orderNo}')">Sửa Đơn</button>`;
const nplBtn = `<button class="btn btn-primary" style="padding:4px 8px; font-size:0.8rem; background: #22c55e; border: none; margin-left: 5px;" onclick="openNplModal('\${order.orderNo}')">Duyệt NPL</button>`;
if (!html.includes('openNplModal')) {
    html = html.replace(editBtnMatch, editBtnMatch + nplBtn);
}

fs.writeFileSync('index.html', html, 'utf8');
console.log("Fix applied successfully!");
