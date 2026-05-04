const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Update nplTab HTML to use Search-based UI
const nplTabMatch = /<div id="nplTab" class="tab-content">[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>/;
const nplTabNewContent = `
    <div id="nplTab" class="tab-content">
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-check-double"></i> PHÊ DUYỆT VẢI & NPL</h3>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label>Chọn Đơn Hàng (PO) <span style="color: var(--danger)">*</span></label>
            <input id="nplPOSearch" list="nplPOList" placeholder="Tìm mã PO..." onchange="onNplPOChange(this.value)">
            <datalist id="nplPOList"></datalist>
          </div>
        </div>

        <!-- PO Summary -->
        <div id="nplPOSummary" style="display:none; margin-top:20px;">
          <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:15px;">
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:12px;">
              <div>
                <span style="display:block; font-size:0.75rem; color:#166534; font-weight:600;">MÃ ĐƠN</span>
                <span id="nplSummaryPO" style="font-weight:700; color:#151c32;">-</span>
              </div>
              <div>
                <span style="display:block; font-size:0.75rem; color:#166534; font-weight:600;">NHÀ CUNG CẤP</span>
                <span id="nplSummaryPartner" style="font-weight:700; color:#151c32;">-</span>
              </div>
              <div>
                <span style="display:block; font-size:0.75rem; color:#166534; font-weight:600;">NGƯỜI LẬP</span>
                <span id="nplSummaryCreator" style="font-weight:700; color:#151c32;">-</span>
              </div>
              <div>
                <span style="display:block; font-size:0.75rem; color:#166534; font-weight:600;">TRẠNG THÁI</span>
                <span id="nplSummaryStatus" style="font-weight:700; color:#151c32;">-</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Approval Form Area -->
        <div id="nplApprovalFormArea" style="display:none; margin-top:30px;">
          <h4 style="margin-bottom:15px; border-bottom:1px solid #e2e8f0; padding-bottom:10px;"><i class="fas fa-edit"></i> Cập nhật trạng thái phê duyệt</h4>
          <div class="grid-2">
            <div class="form-group">
              <label>Duyệt Vải</label>
              <select id="nplInp_vai" class="form-control">
                <option value="Pending">Pending</option>
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
              </select>
            </div>
            <div class="form-group">
              <label>Duyệt Bo Dệt</label>
              <select id="nplInp_bo" class="form-control">
                <option value="Pending">Pending</option>
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
              </select>
            </div>
            <div class="form-group">
              <label>Đồng Bộ NPL</label>
              <select id="nplInp_npl" class="form-control">
                <option value="Pending">Pending</option>
                <option value="Synced">Đã Đồng Bộ</option>
                <option value="Delayed">Trễ NPL</option>
              </select>
            </div>
            <div class="form-group">
              <label>Ngày Đồng Bộ / Duyệt</label>
              <input type="date" id="nplInp_date" class="form-control">
            </div>
            <div class="form-group" style="grid-column: span 2;">
              <label>Ghi Chú / Sự Cố</label>
              <input type="text" id="nplInp_note" class="form-control" placeholder="Nhập ghi chú hoặc sự cố nếu có...">
            </div>
          </div>
          <div style="margin-top:25px; text-align:right;">
             <button class="btn btn-primary" id="btnNplSave" onclick="saveNplInTab()">
               <i class="fas fa-save"></i> Lưu Trạng Thái Phê Duyệt
             </button>
          </div>
        </div>
      </div>
    </div>
`;
html = html.replace(nplTabMatch, nplTabNewContent);

// 2. Implement JS logic
const nplTabJsMatch = /\/\* ================= NPL APPROVALS \(LIST VIEW\) ================= \*\/[\s\S]*?function loadNplApprovals\(\) \{[\s\S]*?area\.innerHTML = html;[\s\S]*?\}\)[\s\S]*?\.catch[\s\S]*?\};[\s\S]*?\}/;
const nplTabJsNew = `
    /* ================= NPL APPROVALS (SEARCH VIEW) ================= */
    function loadNplApprovals() {
      // Clear data and fetch newest history for search list
      document.getElementById("nplPOSearch").value = "";
      document.getElementById("nplPOSummary").style.display = "none";
      document.getElementById("nplApprovalFormArea").style.display = "none";
      
      fetch(WEB_APP_URL + "?action=getHistory")
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data) {
            allOrdersHistory = res.data;
            const dl = document.getElementById("nplPOList");
            dl.innerHTML = "";
            res.data.forEach(o => {
              const opt = document.createElement("option");
              opt.value = o.orderNo;
              opt.innerText = \`\${o.orderNo} - \${o.partnerName}\`;
              dl.appendChild(opt);
            });
          }
        });
    }

    function onNplPOChange(orderNo) {
      if (!orderNo) return;
      const order = allOrdersHistory.find(o => o.orderNo === orderNo);
      if (!order) {
        showToast("Không tìm thấy mã đơn hàng!", "error");
        return;
      }
      
      // Show Summary
      document.getElementById("nplSummaryPO").innerText = order.orderNo;
      document.getElementById("nplSummaryPartner").innerText = order.partnerName;
      document.getElementById("nplSummaryCreator").innerText = order.creatorName;
      document.getElementById("nplSummaryStatus").innerText = order.statusVai + " | " + order.statusBo;
      document.getElementById("nplPOSummary").style.display = "block";
      
      // Populate Form
      document.getElementById("nplInp_vai").value = order.statusVai || "Pending";
      document.getElementById("nplInp_bo").value = order.statusBo || "Pending";
      document.getElementById("nplInp_npl").value = order.statusNpl || "Pending";
      document.getElementById("nplInp_date").value = order.syncDate ? order.syncDate.split('T')[0] : "";
      document.getElementById("nplInp_note").value = order.syncNote || "";
      
      document.getElementById("nplApprovalFormArea").style.display = "block";
    }

    function saveNplInTab() {
      const orderNo = document.getElementById("nplSummaryPO").innerText;
      const vVai = document.getElementById("nplInp_vai").value;
      const vBo = document.getElementById("nplInp_bo").value;
      const vNpl = document.getElementById("nplInp_npl").value;
      const vDate = document.getElementById("nplInp_date").value;
      const vNote = document.getElementById("nplInp_note").value;
      
      const btn = document.getElementById("btnNplSave");
      btn.disabled = true;
      const oldHtml = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
      
      fetch(WEB_APP_URL, {
        method: "POST",
        body: JSON.stringify({ 
          action: "updateNplApprovalStatus", 
          data: { orderNo, statusVai: vVai, statusBo: vBo, statusNpl: vNpl, syncDate: vDate, syncNote: vNote } 
        })
      }).then(r => r.json()).then(res => {
        if (res.success) {
          showToast("Đã lưu trạng thái phê duyệt!", "success");
          loadNplApprovals(); // Reset tab
          loadDashboardData(); // Update dashboard stats
        } else {
          showToast("Lỗi: " + res.message, "error");
        }
      }).finally(() => {
        btn.disabled = false;
        btn.innerHTML = oldHtml;
      });
    }
`;
html = html.replace(nplTabJsMatch, nplTabJsNew);

fs.writeFileSync('index.html', html, 'utf8');
console.log("NPL Tab transformed to search-based UI!");
