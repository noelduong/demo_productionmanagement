const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Chart.js & Luxon
const headMatch = '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />';
if (html.includes(headMatch) && !html.includes('chart.js')) {
    html = html.replace(headMatch, headMatch + `
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/luxon@3.3.0/build/global/luxon.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-luxon@1.3.1/dist/chartjs-adapter-luxon.min.js"></script>`);
}

// 2. Menu Items
const menuMatch = /<div class="nav-item active" onclick="switchTab\('createTab', this\)">/;
if (html.match(menuMatch) && !html.includes('dashboardTab')) {
    html = html.replace(menuMatch, (m) => `
    <div class="nav-item" onclick="switchTab('dashboardTab', this)" style="border-left: 4px solid transparent;">
      <i class="fas fa-chart-pie"></i> <span class="nav-text">Dashboard</span>
    </div>
    <div class="nav-item" onclick="switchTab('nplTab', this)" style="border-left: 4px solid transparent;">
      <i class="fas fa-check-double"></i> <span class="nav-text">Duyệt Vải & NPL</span>
    </div>
    ` + m);
}

// 3. HTML Tabs (Dashboard & Search-based NPL)
const tabsMatch = `<!-- TAB: HISTORY -->`;
if (html.includes(tabsMatch) && !html.includes('id="dashboardTab"')) {
    html = html.replace(tabsMatch, `
    <!-- TAB: DASHBOARD -->
    <div id="dashboardTab" class="tab-content">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
        <h2 style="margin: 0; color: var(--text-color); font-size: 1.8rem;"><i class="fas fa-chart-pie" style="color: var(--primary); margin-right: 10px;"></i> Tổng Quan Sản Xuất</h2>
        <button class="btn btn-outline" onclick="loadDashboardData()"><i class="fas fa-sync-alt"></i> Làm mới</button>
      </div>

      <div class="grid-3" style="gap: 20px; margin-bottom: 30px;">
        <div class="card" style="padding: 20px; display: flex; align-items: center; gap: 20px; background: linear-gradient(135deg, #eff6ff, #dbeafe); border-left: 5px solid #3b82f6;">
           <div style="background: #bfdbfe; color: #1d4ed8; width: 60px; height: 60px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 1.8rem;"><i class="fas fa-file-invoice"></i></div>
           <div>
              <div style="color: #475569; font-size: 0.95rem; font-weight: 600; text-transform: uppercase;">Tổng Đơn Đang Chạy</div>
              <div id="dashTotalPOs" style="font-size: 2.2rem; font-weight: 800; color: #1e293b; line-height: 1.2;">0</div>
           </div>
        </div>
        <div class="card" style="padding: 20px; display: flex; align-items: center; gap: 20px; background: linear-gradient(135deg, #fef2f2, #fee2e2); border-left: 5px solid #ef4444;">
           <div style="background: #fecaca; color: #b91c1c; width: 60px; height: 60px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 1.8rem;"><i class="fas fa-exclamation-triangle"></i></div>
           <div>
              <div style="color: #475569; font-size: 0.95rem; font-weight: 600; text-transform: uppercase;">PO Cảnh Báo Trễ</div>
              <div id="dashDelayedPOs" style="font-size: 2.2rem; font-weight: 800; color: #1e293b; line-height: 1.2;">0</div>
           </div>
        </div>
        <div class="card" style="padding: 20px; display: flex; align-items: center; gap: 20px; background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-left: 5px solid #22c55e;">
           <div style="background: #bbf7d0; color: #15803d; width: 60px; height: 60px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 1.8rem;"><i class="fas fa-box-open"></i></div>
           <div>
              <div style="color: #475569; font-size: 0.95rem; font-weight: 600; text-transform: uppercase;">Tổng SP Đã Nhập</div>
              <div id="dashTotalOutput" style="font-size: 2.2rem; font-weight: 800; color: #1e293b; line-height: 1.2;">0</div>
           </div>
        </div>
      </div>

      <div class="grid-2" style="gap: 20px; margin-bottom: 30px;">
        <div class="card" style="padding: 20px;">
          <h3 style="margin-top: 0; color: var(--primary); font-size: 1.1rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px;"><i class="fas fa-chart-pie"></i> Phân Loại Tiến Độ</h3>
          <div style="position: relative; height: 250px; width: 100%; display: flex; justify-content: center;"><canvas id="donutChart"></canvas></div>
        </div>
        <div class="card" style="padding: 20px;">
          <h3 style="margin-top: 0; color: var(--primary); font-size: 1.1rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px;"><i class="fas fa-chart-bar"></i> Sản Lượng Theo PO</h3>
          <div style="position: relative; height: 250px; width: 100%;"><canvas id="barChart"></canvas></div>
        </div>
      </div>
      
      <div class="card" style="padding: 20px; margin-bottom: 30px;">
        <h3 style="margin-top: 0; color: var(--primary); font-size: 1.1rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px;"><i class="fas fa-stream"></i> Bản Đồ Tiến Độ PO (Timeline D0 - D27)</h3>
        <div style="position: relative; height: 350px; width: 100%; overflow-x: auto;"><div style="min-width: 600px; height: 100%;"><canvas id="ganttChart"></canvas></div></div>
      </div>

      <div class="card">
        <div class="card-header" style="background: #fef2f2; border-bottom: 1px solid #fca5a5;">
          <h3 style="color: #dc2626; margin: 0;"><i class="fas fa-fire"></i> Top PO Cảnh Báo Trễ Hạn / Rủi Ro</h3>
        </div>
        <div id="dashAlertTableArea">
           <div style="text-align: center; padding: 40px; color: var(--text-light);">Đang tải dữ liệu <i class="fas fa-spinner fa-spin"></i></div>
        </div>
      </div>
    </div>

    <!-- TAB: NPL & APPROVAL -->
    <div id="nplTab" class="tab-content">
      <div class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
          <h3><i class="fas fa-check-double"></i> Phê Duyệt Vải / NPL</h3>
          <button class="btn btn-outline" onclick="loadNplApprovals()"><i class="fas fa-sync-alt"></i> Làm mới</button>
        </div>
        <div class="card-body">
          <div class="form-group" style="margin-bottom: 20px;">
            <label>Tìm Mã Đơn Hàng (PO) Cần Duyệt</label>
            <div style="display: flex; gap: 10px;">
              <input id="nplPOSearch" list="nplPOList" placeholder="Nhập mã PO để duyệt..." class="form-control" onchange="onNplPOChange(this.value)" style="flex: 1;">
              <datalist id="nplPOList"></datalist>
              <button class="btn btn-primary" onclick="loadNplApprovals()"><i class="fas fa-search"></i></button>
            </div>
          </div>
          <div id="nplApprovalArea">
            <div style="text-align:center; padding:30px; color:var(--text-light);">Nhập mã PO ở trên để bắt đầu phê duyệt.</div>
          </div>
        </div>
      </div>
    </div>

    ` + tabsMatch);
}

// 4. Receiving History UI restoration
const receivingActionsMatch = /<div class="floating-actions" id="receivingActions" style="display:none">/;
if (html.match(receivingActionsMatch) && !html.includes('id="receivingHistoryArea"')) {
    html = html.replace(receivingActionsMatch, (m) => m + `
        <button class="btn btn-primary" onclick="submitReceivingProcess()">
          <i class="fas fa-save"></i> Xác Nhận Nhập Hàng
        </button>
      </div>

      <!-- TAB: RECEIVING HISTORY -->
      <div class="card" style="margin-top: 30px;">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin:0;"><i class="fas fa-history"></i> LỊCH SỬ NHẬP HÀNG</h3>
          <button class="btn btn-outline" onclick="loadReceivingHistory()"><i class="fas fa-sync-alt"></i> Làm mới</button>
        </div>
        <div id="receivingHistoryArea">
          <div style="text-align: center; padding: 30px; color: var(--text-light);">Đang tải dữ liệu...</div>
        </div>
      </div>
    `);
}

// 5. switchTab triggers
const switchMatch = /if\s*\(tabId\s*===\s*"historyTab"\)\s*\{/;
if (html.match(switchMatch) && !html.includes('loadDashboardData()')) {
    html = html.replace(switchMatch, `if (tabId === "dashboardTab") { loadDashboardData(); }
      if (tabId === "nplTab") { loadNplApprovals(); }
      if (tabId === "receivingTab") { loadPOHistoryForReceiving(); loadReceivingHistory(); }
      ` + 'if (tabId === "historyTab") {');
}

// 6. Init logic
const initMatch = /loadPODataFromSheet\(\);/;
if (html.match(initMatch) && !html.includes('loadDashboardData()')) {
    html = html.replace(initMatch, (m) => m + `
      loadDashboardData();
      switchTab('dashboardTab', document.querySelector('.nav-item[onclick*="dashboardTab"]'));`);
}

// 7. Shortcut buttons in Order History
const actionCellMatch = /onclick="editOrder\('\$\{order.orderNo\}'\)">Sửa Đơn<\/button>/;
if (html.match(actionCellMatch) && !html.includes('goToNplApproval')) {
    html = html.replace(actionCellMatch, (m) => m + `
              <button class="btn btn-primary" style="padding:4px 8px; font-size:0.8rem; background: #22c55e; border: none; margin-left: 5px;" onclick="goToNplApproval('\${order.orderNo}')">Duyệt NPL</button>`);
}

// 8. Refresh triggers in submission
const submitReceivingSuccessMatch = /showToast\(res\.message,\s*"success"\);/;
if (html.includes('function submitReceivingProcess()') && html.match(submitReceivingSuccessMatch) && !html.includes('loadReceivingHistory(); // Refresh')) {
    const startIndex = html.indexOf('function submitReceivingProcess()');
    const partAfterFunc = html.substring(startIndex);
    const successIndex = partAfterFunc.search(submitReceivingSuccessMatch);
    if (successIndex > -1) {
        const fullSuccessMatch = partAfterFunc.match(submitReceivingSuccessMatch)[0];
        const newPart = partAfterFunc.replace(fullSuccessMatch, fullSuccessMatch + "\n            loadReceivingHistory();");
        html = html.substring(0, startIndex) + newPart;
    }
}

// 9. JS Funcs (Dashboard, Search-based NPL, Receiving History)
const jsMatch = /\/\* =+ HISTORY =+ \*\//;
if (html.match(jsMatch) && !html.includes('let dashChartInstances')) {
    html = html.replace(jsMatch, (m) => `
    /* ================= DASHBOARD ================= */
    let dashChartInstances = {};
    
    function renderDashboardCharts(historyData, receivingData) {
      Object.values(dashChartInstances).forEach(c => c && c.destroy());
      dashChartInstances = {};

      const today = new Date();
      today.setHours(0,0,0,0);

      let onTime = 0, minorDelay = 0, criticalDelay = 0;
      let ganttData = [], ganttLabels = [], ganttBgColors = [];

      historyData.forEach(order => {
         let isCritical = false;
         let isMinor = false;
         
         if (order.statusVai === 'Fail' || order.statusBo === 'Fail') {
            isCritical = true;
         } else if (order.benchmarkD27) {
            let d27 = new Date(order.benchmarkD27);
            if (!isNaN(d27.getTime()) && today > d27) isCritical = true;
         }
         
         if (!isCritical && (order.statusVai === 'Pending' || order.statusBo === 'Pending') && order.benchmarkD18) {
            let d18 = new Date(order.benchmarkD18);
            if (!isNaN(d18.getTime()) && today > d18) isMinor = true;
         }

         if (isCritical) criticalDelay++;
         else if (isMinor) minorDelay++;
         else onTime++;

         if (ganttLabels.length < 8 && order.orderDate && order.benchmarkD27) {
            let d0 = new Date(order.orderDate).getTime();
            let d27 = new Date(order.benchmarkD27).getTime();
            if (!isNaN(d0) && !isNaN(d27)) {
               ganttLabels.push(order.orderNo);
               ganttData.push([d0, d27]);
               ganttBgColors.push(isCritical ? 'rgba(239, 68, 68, 0.7)' : (isMinor ? 'rgba(245, 158, 11, 0.7)' : 'rgba(59, 130, 246, 0.7)'));
            }
         }
      });

      const donutCtx = document.getElementById('donutChart').getContext('2d');
      dashChartInstances.donut = new Chart(donutCtx, {
         type: 'doughnut',
         data: {
            labels: ['Đúng Hạn', 'Trễ Nhẹ (Duyệt Mẫu)', 'Trễ Nghiêm Trọng'],
            datasets: [{ data: [onTime, minorDelay, criticalDelay], backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'], borderWidth: 0 }]
         },
         options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
      });

      const ganttCtx = document.getElementById('ganttChart').getContext('2d');
      dashChartInstances.gantt = new Chart(ganttCtx, {
         type: 'bar',
         data: {
            labels: ganttLabels,
            datasets: [{ label: 'Thời gian (D0-D27)', data: ganttData, backgroundColor: ganttBgColors, borderRadius: 4, barPercentage: 0.6 }]
         },
         options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            scales: { x: { type: 'time', time: { unit: 'day', tooltipFormat: 'dd/MM/yyyy' } } },
            plugins: { legend: { display: false } }
         }
      });

      let outputByPO = {};
      receivingData.forEach(item => {
         let po = item["Mã đơn hàng"], qty = Number(item["Tổng SL nhận"]) || 0;
         if (po && qty > 0) outputByPO[po] = (outputByPO[po] || 0) + qty;
      });
      let sortedOutput = Object.entries(outputByPO).sort((a,b) => b[1] - a[1]).slice(0, 8);
      
      const barCtx = document.getElementById('barChart').getContext('2d');
      if (sortedOutput.length > 0) {
        dashChartInstances.bar = new Chart(barCtx, {
           type: 'bar',
           data: {
              labels: sortedOutput.map(x => x[0]),
              datasets: [{ label: 'Sản lượng đã nhập', data: sortedOutput.map(x => x[1]), backgroundColor: '#6366f1', borderRadius: 4 }]
           },
           options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
      }
    }

    function loadDashboardData() {
      const alertArea = document.getElementById('dashAlertTableArea');
      if (!alertArea) return;
      alertArea.innerHTML = \`<div style="text-align: center; padding: 40px;">Đang tải dữ liệu <i class="fas fa-spinner fa-spin"></i></div>\`;
      Promise.all([fetch(WEB_APP_URL + "?action=getHistory").then(r => r.json()), fetch(WEB_APP_URL + "?action=getReceivingHistory").then(r => r.json())])
      .then(([historyRes, receivingRes]) => {
         let totalPOs = 0, delayedPOs = 0, totalOutput = 0, alertHtml = \`<div class="table-responsive"><table><thead><tr><th>Mã Đơn</th><th>Trạng thái</th><th>Rủi ro / Trễ hạn</th></tr></thead><tbody>\`;
         let delayedList = [];
         const today = new Date(); today.setHours(0,0,0,0);

         if (historyRes.success && historyRes.data) {
            totalPOs = historyRes.data.length;
            historyRes.data.forEach(order => {
               let delayReason = "";
               if (order.statusVai === 'Fail' || order.statusBo === 'Fail') delayReason = \`<span style="color:#dc2626; font-weight:bold;"><i class="fas fa-ban"></i> NPL bị Reject (+15 ngày)</span>\`;
               else if ((order.statusVai === 'Pending' || order.statusBo === 'Pending') && order.benchmarkD18) {
                 let d18 = new Date(order.benchmarkD18);
                 if (!isNaN(d18) && today > d18) delayReason = \`<span style="color:#f59e0b; font-weight:bold;"><i class="fas fa-clock"></i> Trễ duyệt mẫu</span>\`;
               } else if (order.benchmarkD27) {
                 let d27 = new Date(order.benchmarkD27);
                 if (!isNaN(d27) && today > d27) delayReason = \`<span style="color:#ef4444; font-weight:bold;"><i class="fas fa-exclamation-circle"></i> Trễ giao hàng</span>\`;
               }
               if (delayReason !== "") {
                  delayedPOs++; delayedList.push({ orderNo: order.orderNo, status: order.statusVai === 'Fail' || order.statusBo === 'Fail' ? 'Fail' : 'Pending', reason: delayReason });
               }
            });
         }
         if (receivingRes.success && receivingRes.data) receivingRes.data.forEach(i => totalOutput += Number(i["Tổng SL nhận"]) || 0);

         const tpo = document.getElementById('dashTotalPOs'); if(tpo) tpo.innerText = totalPOs;
         const dpo = document.getElementById('dashDelayedPOs'); if(dpo) dpo.innerText = delayedPOs;
         const tou = document.getElementById('dashTotalOutput'); if(tou) tou.innerText = totalOutput.toLocaleString('vi-VN');

         if (delayedList.length > 0) {
            delayedList.slice(0, 5).forEach(alert => {
               let badge = alert.status === "Fail" ? \`<span class="status-badge" style="background:#fee2e2; color:#dc2626;">Fail</span>\` : \`<span class="status-badge" style="background:#fef3c7; color:#d97706;">Pending</span>\`;
               alertHtml += \`<tr><td style="font-weight:600; color:var(--primary);">\${alert.orderNo}</td><td>\${badge}</td><td>\${alert.reason}</td></tr>\`;
            });
         } else {
            alertHtml += \`<tr><td colspan="3" style="text-align:center;">Tất cả đơn hàng đều đúng tiến độ! 🎉</td></tr>\`;
         }
         alertHtml += \`</tbody></table></div>\`;
         alertArea.innerHTML = alertHtml;
         renderDashboardCharts(historyRes.data || [], receivingRes.data || []);
      })
      .catch(err => { if(alertArea) alertArea.innerHTML = \`<div style="text-align: center; color: #ef4444;">Lỗi tải dữ liệu: \${err.message}</div>\`; });
    }

    /* ================= NPL APPROVALS ================= */
    function loadNplApprovals() {
      const datalist = document.getElementById("nplPOList");
      if (!datalist) return;
      
      fetch(WEB_APP_URL + "?action=getHistory")
        .then(res => res.json())
        .then(res => {
          if (res.success && res.data) {
            allOrdersHistory = res.data;
            let html = "";
            res.data.forEach(order => {
              html += \`<option value="\${order.orderNo}">\${order.orderNo} - \${order.partnerName}</option>\`;
            });
            datalist.innerHTML = html;
          }
        });
    }

    function onNplPOChange(orderNo) {
      const order = allOrdersHistory.find(o => o.orderNo === orderNo);
      if (!order) {
        document.getElementById("nplApprovalArea").innerHTML = \`<div style="text-align:center; padding:30px; color:var(--danger);">Không tìm thấy mã PO: \${orderNo}</div>\`;
        return;
      }
      renderNplDetails(order);
    }

    function renderNplDetails(order) {
      const area = document.getElementById("nplApprovalArea");
      area.innerHTML = \`
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div>
              <label style="font-weight: 600; font-size: 0.8rem; color: #64748b;">MÃ ĐƠN HÀNG</label>
              <div style="font-size: 1.2rem; font-weight: 700; color: var(--primary);">\${order.orderNo}</div>
            </div>
            <div>
              <label style="font-weight: 600; font-size: 0.8rem; color: #64748b;">NHÀ CUNG CẤP</label>
              <div style="font-size: 1.1rem; font-weight: 600;">\${order.partnerName}</div>
            </div>
          </div>
          
          <div class="grid-2" style="gap: 15px;">
            <div class="form-group">
              <label>Trạng Thái Duyệt Vải</label>
              <select id="npl_vai_\${order.orderNo}" class="form-control">
                <option value="Pending" \${order.statusVai === 'Pending'?'selected':''}>Pending</option>
                <option value="Pass" \${order.statusVai === 'Pass'?'selected':''}>Pass</option>
                <option value="Fail" \${order.statusVai === 'Fail'?'selected':''}>Fail</option>
              </select>
            </div>
            <div class="form-group">
              <label>Trạng Thái Duyệt Bo Dệt</label>
              <select id="npl_bo_\${order.orderNo}" class="form-control">
                <option value="Pending" \${order.statusBo === 'Pending'?'selected':''}>Pending</option>
                <option value="Pass" \${order.statusBo === 'Pass'?'selected':''}>Pass</option>
                <option value="Fail" \${order.statusBo === 'Fail'?'selected':''}>Fail</option>
              </select>
            </div>
            <div class="form-group">
              <label>Trạng Thái Đồng Bộ NPL</label>
              <select id="npl_npl_\${order.orderNo}" class="form-control">
                <option value="Pending" \${order.statusNpl === 'Pending'?'selected':''}>Pending</option>
                <option value="Synced" \${order.statusNpl === 'Synced'?'selected':''}>Đã Đồng Bộ</option>
                <option value="Delayed" \${order.statusNpl === 'Delayed'?'selected':''}>Trễ NPL</option>
              </select>
            </div>
            <div class="form-group">
              <label>Ngày Đồng Bộ Dự Kiến</label>
              <input type="date" id="npl_date_\${order.orderNo}" class="form-control" value="\${order.syncDate ? order.syncDate.split('T')[0] : ''}">
            </div>
          </div>
          
          <div class="form-group" style="margin-top: 15px;">
            <label>Ghi Chú Phê Duyệt</label>
            <textarea id="npl_note_\${order.orderNo}" class="form-control" rows="2" placeholder="Nhập ghi chú...">\${order.syncNote || ''}</textarea>
          </div>
          
          <div style="text-align: right; margin-top: 20px;">
            <button class="btn btn-primary" onclick="saveNplApproval('\${order.orderNo}', this)" style="padding: 10px 25px;">
              <i class="fas fa-save"></i> Cập Nhật Trạng Thái
            </button>
          </div>
        </div>
      \`;
    }

    function saveNplApproval(orderNo, btn) {
      const vVai = document.getElementById(\`npl_vai_\${orderNo}\`).value;
      const vBo = document.getElementById(\`npl_bo_\${orderNo}\`).value;
      const vNpl = document.getElementById(\`npl_npl_\${orderNo}\`).value;
      const vDate = document.getElementById(\`npl_date_\${orderNo}\`).value;
      const vNote = document.getElementById(\`npl_note_\${orderNo}\`).value;

      btn.disabled = true; let origHtml = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

      fetch(WEB_APP_URL, {
        method: "POST",
        body: JSON.stringify({ action: "updateNplApprovalStatus", data: { orderNo: orderNo, statusVai: vVai, statusBo: vBo, statusNpl: vNpl, syncDate: vDate, syncNote: vNote } })
      }).then(r => r.json()).then(res => {
         if (res.success) { btn.innerHTML = '<i class="fas fa-check"></i>'; btn.style.backgroundColor = '#22c55e'; setTimeout(() => { btn.disabled = false; btn.innerHTML = origHtml; btn.style.backgroundColor = ''; }, 2000); }
         else { alert("Lỗi: " + res.message); btn.disabled = false; btn.innerHTML = origHtml; }
      }).catch(err => { alert("Lỗi kết nối: " + err.message); btn.disabled = false; btn.innerHTML = origHtml; });
    }

    function goToNplApproval(orderNo) {
      switchTab('nplTab', document.querySelector('.nav-item[onclick*="nplTab"]'));
      const searchInput = document.getElementById('nplPOSearch');
      if (searchInput) {
        searchInput.value = orderNo;
        onNplPOChange(orderNo);
      }
    }

    /* ================= RECEIVING HISTORY ================= */
    function loadReceivingHistory() {
      const area = document.getElementById("receivingHistoryArea");
      if (!area) return;
      area.innerHTML = \`<div style="text-align:center; padding:30px;">Đang tải dữ liệu <i class="fas fa-spinner fa-spin"></i></div>\`;

      fetch(WEB_APP_URL + "?action=getReceivingHistory")
        .then(r => r.json())
        .then(res => {
          if (!res.success || !res.data || res.data.length === 0) {
            area.innerHTML = \`<div style="text-align:center; padding:20px;">Chưa có lịch sử nhập hàng.</div>\`;
            return;
          }
          renderReceivingHistory(res.data);
        })
        .catch(err => area.innerHTML = \`<div style="text-align:center; color:var(--danger); padding:20px;">Lỗi: \${err.message}</div>\`);
    }

    function renderReceivingHistory(data) {
      const area = document.getElementById("receivingHistoryArea");
      if (!area) return;
      // Limit to last 50 for performance
      const displayData = data.slice(-50).reverse();
      
      let html = \`<div class="table-responsive"><table><thead><tr>
        <th>Ngày Nhập</th><th>Mã PO</th><th>Sản Phẩm</th><th>Màu</th><th>Size</th><th>SL Nhận</th><th>Người Nhận</th><th>Đợt</th>
      </tr></thead><tbody>\`;
      
      displayData.forEach(row => {
        html += \`<tr>
          <td>\${row["Ngày nhập kho"] || "-"}</td>
          <td style="font-weight:600; color:var(--primary);">\${row["Mã đơn hàng"] || "-"}</td>
          <td>\${row["Tên sản phẩm"] || "-"}</td>
          <td>\${row["Màu"] || "-"}</td>
          <td>\${row["Size"] || "-"}</td>
          <td style="font-weight:700;">\${row["Tổng SL nhận"] || 0}</td>
          <td>\${row["Người nhận"] || "-"}</td>
          <td>\${row["Đợt nhập"] || "-"}</td>
        </tr>\`;
      });
      html += "</tbody></table></div>";
      area.innerHTML = html;
    }

    ` + m);
}

fs.writeFileSync('index.html', html, 'utf8');
console.log("Patch applied!");
