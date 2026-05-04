const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Restore nplTab menu item
const dashboardMenuMatch = `<div class="nav-item" onclick="switchTab('dashboardTab', this)" style="border-left: 4px solid transparent;">
      <i class="fas fa-chart-pie"></i> <span class="nav-text">Dashboard</span>
    </div>`;
const nplMenu = `
    <div class="nav-item" onclick="switchTab('nplTab', this)" style="border-left: 4px solid transparent;">
      <i class="fas fa-check-double"></i> <span class="nav-text">Duyệt Vải & NPL</span>
    </div>`;
if (!html.includes("switchTab('nplTab'")) {
    html = html.replace(dashboardMenuMatch, dashboardMenuMatch + nplMenu);
}

// 2. Update nplTab content to be a list instead of a heavy table
const nplTabContent = `
    <!-- TAB: NPL & APPROVAL -->
    <div id="nplTab" class="tab-content">
      <div class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
          <h3><i class="fas fa-check-double"></i> Danh Sách Phê Duyệt Vải & NPL</h3>
          <button class="btn btn-outline" onclick="loadNplApprovals()"><i class="fas fa-sync-alt"></i> Làm mới</button>
        </div>
        <div class="card-body">
          <div id="nplApprovalArea">
            <div style="text-align:center; padding:30px; color:var(--text-light);">Đang tải danh sách... <i class="fas fa-spinner fa-spin"></i></div>
          </div>
        </div>
      </div>
    </div>
`;
// Replace the existing hidden nplTab if it exists
if (html.includes('id="nplTab"')) {
    html = html.replace(/<div id="nplTab"[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>/, nplTabContent);
}

// 3. Update switchTab logic to call loadNplApprovals
const switchMatch = `if (tabId === "dashboardTab") { loadDashboardData(); }`;
if (html.includes(switchMatch) && !html.includes('if (tabId === "nplTab")')) {
    html = html.replace(switchMatch, switchMatch + `\n      if (tabId === "nplTab") { loadNplApprovals(); }`);
}

// 4. Implement loadNplApprovals (Performant list version)
const nplJsFuncs = `
    /* ================= NPL APPROVALS (LIST VIEW) ================= */
    function loadNplApprovals() {
      const area = document.getElementById("nplApprovalArea");
      area.innerHTML = '<div style="text-align:center; padding:30px;">Đang tải dữ liệu <i class="fas fa-spinner fa-spin"></i></div>';

      fetch(WEB_APP_URL + "?action=getHistory")
        .then(r => r.json())
        .then(res => {
          if (!res.success || !res.data || res.data.length === 0) {
            area.innerHTML = '<div style="text-align:center; padding:30px;">Chưa có đơn hàng nào cần duyệt.</div>';
            return;
          }
          allOrdersHistory = res.data;
          let html = \`<div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Mã PO</th>
                  <th>Nhà Cung Cấp</th>
                  <th>Vải</th>
                  <th>Bo</th>
                  <th>NPL</th>
                  <th>Hành Động</th>
                </tr>
              </thead>
              <tbody>\`;
          
          res.data.forEach(order => {
            const vVai = order.statusVai || "Pending";
            const vBo = order.statusBo || "Pending";
            const vNpl = order.statusNpl || "Pending";
            
            const getBadge = (val) => {
              if (val === 'Pass' || val === 'Synced') return \`<span class="status-badge" style="background:#dcfce7; color:#166534;">\${val}</span>\`;
              if (val === 'Fail' || val === 'Delayed') return \`<span class="status-badge" style="background:#fee2e2; color:#dc2626;">\${val}</span>\`;
              return \`<span class="status-badge" style="background:#f1f5f9; color:#64748b;">\${val}</span>\`;
            };

            html += \`<tr>
              <td style="font-weight:600; color:var(--primary);">\${order.orderNo}</td>
              <td>\${order.partnerName}</td>
              <td>\${getBadge(vVai)}</td>
              <td>\${getBadge(vBo)}</td>
              <td>\${getBadge(vNpl)}</td>
              <td>
                <button class="btn btn-primary" style="padding:4px 10px; background:#22c55e; border:none;" onclick="openNplModal('\${order.orderNo}')">
                  <i class="fas fa-check-double"></i> Duyệt
                </button>
              </td>
            </tr>\`;
          });
          
          html += '</tbody></table></div>';
          area.innerHTML = html;
        })
        .catch(err => {
          area.innerHTML = \`<div style="text-align:center; color:var(--danger);">Lỗi: \${err.message}</div>\`;
        });
    }

`;
// Insert before NPL MODAL FUNCTIONS
const modalJsMatch = '/* ================= NPL MODAL FUNCTIONS ================= */';
if (html.includes(modalJsMatch) && !html.includes('function loadNplApprovals')) {
    html = html.replace(modalJsMatch, nplJsFuncs + modalJsMatch);
}

fs.writeFileSync('index.html', html, 'utf8');
console.log("NPL Tab restored with performant list view!");
