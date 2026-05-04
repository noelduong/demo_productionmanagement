const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Remove menu item
const menuMatch = `    <div class="nav-item" onclick="switchTab('nplTab', this)" style="border-left: 4px solid transparent;">
      <i class="fas fa-check-double"></i> <span class="nav-text">Duyệt Vải & NPL</span>
    </div>`;
html = html.replace(menuMatch, '');

// 2. Remove nplTab div
const nplTabMatch = `    <!-- TAB: NPL & APPROVAL -->
    <div id="nplTab" class="tab-content">
      <div class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
          <h3><i class="fas fa-check-double"></i> Theo Dõi & Phê Duyệt Vải / NPL</h3>
          <button class="btn btn-outline" onclick="loadNplApprovals()"><i class="fas fa-sync-alt"></i> Làm mới</button>
        </div>
        <div class="card-body">
          <div id="nplApprovalArea">
            <div style="text-align:center; padding:30px; color:var(--text-light);">Đang tải dữ liệu <i class="fas fa-spinner fa-spin"></i></div>
          </div>
        </div>
      </div>
    </div>`;
html = html.replace(nplTabMatch, '');

// 3. Remove switchTab line
// We don't have this explicitly since my last replacement failed to inject it, or wait... did I?
// I will just use regex to remove it safely if it exists.
html = html.replace(/      if \(tabId === "nplTab"\) { loadNplApprovals\(\); }\n/, '');

// 4. Remove JS functions (renderNplApprovals, loadNplApprovals, saveNplApproval)
const jsMatchRegex = /\/\* ================= NPL APPROVALS ================= \*\/[\s\S]*?\/\* ================= HISTORY ================= \*\//;
html = html.replace(jsMatchRegex, `/* ================= HISTORY ================= */`);

// 5. Update loadOrderHistory loop to add "Duyệt NPL" button
const actionMatch = `<button class="btn btn-primary" style="padding:4px 8px; font-size:0.8rem; background: var(--accent); border: none; margin-left: 5px;" onclick="editOrder('\${order.orderNo}')">Sửa Đơn</button>`;
const actionReplace = actionMatch + `\n              <button class="btn btn-primary" style="padding:4px 8px; font-size:0.8rem; background: #22c55e; border: none; margin-left: 5px;" onclick="openNplModal('\${order.orderNo}')">Duyệt NPL</button>`;
html = html.replace(actionMatch, actionReplace);

// 6. Add Modal HTML and JS at the end
const modalHtml = `
  <!-- MODAL DUYỆT NPL -->
  <div id="nplModal" class="modal">
    <div class="modal-content" style="max-width: 500px;">
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

  <script>
    function openNplModal(orderNo) {
      const order = allOrdersHistory.find(o => o.orderNo === orderNo);
      if (!order) return;
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
  </script>
`;
html = html.replace(/<\/body>(?![\s\S]*<\/body>)/i, modalHtml + '\n</body>');

fs.writeFileSync('index.html', html, 'utf8');
console.log("Modal patched successfully");


