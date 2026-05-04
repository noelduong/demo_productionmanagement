import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update updateMonthDisplay to call renderDashboardCharts
new_month_display = r'''function updateMonthDisplay() {
    document.getElementById('monthLabel').textContent = `Tháng ${currentMonth} · ${currentYear}`;
    document.getElementById('dropYear').textContent = currentYear;
    document.querySelectorAll('.month-cell').forEach(c => {
      c.classList.toggle('active', parseInt(c.dataset.m) === currentMonth);
    });
    if (typeof renderDashboardCharts === 'function') {
        renderDashboardCharts(currentMonth, currentYear);
    }
  }'''
content = re.sub(r'function updateMonthDisplay\(\) \{.*?\n  \}', new_month_display, content, flags=re.DOTALL)

# 2. Rewrite loadDashboardData
old_load_func = r'function loadDashboardData\(\) \{.*?\n    \}'

new_load_func = r'''window.dashHistory = [];
window.dashReceiving = [];

function loadDashboardData() {
      let elPoActive = document.getElementById('dyn-active-po'); if(elPoActive) elPoActive.innerText = '...';
      Promise.all([fetch(WEB_APP_URL + "?action=getHistory").then(r => r.json()), fetch(WEB_APP_URL + "?action=getReceivingHistory").then(r => r.json())])
      .then(([historyRes, receivingRes]) => {
         window.dashHistory = historyRes.data || [];
         window.dashReceiving = receivingRes.data || [];
         renderDashboardCharts(currentMonth, currentYear);
      })
      .catch(err => { console.error("Lỗi tải dashboard: ", err); });
}

function renderDashboardCharts(month, year) {
      if (!window.dashHistory) return;
      
      let mm = month < 10 ? '0' + month : '' + month;
      let targetMonth = year + '-' + mm;
      
      let filteredHistory = window.dashHistory.filter(o => o.poMonth === targetMonth);
      
      const today = new Date(); today.setHours(0,0,0,0);
      
      let totalPOs = filteredHistory.length;
      let totalOutput = 0;
      let totalValue = 0;
      let alertsCount = 0;
      let onTimeCount = 0;
      
      let factoryStats = {}; // { partnerName: { poCount, value, onTimeCount, totalOutput } }
      let alertsList = [];
      let topPOProblems = [];
      
      let validPOs = new Set(filteredHistory.map(o => o.orderNo));
      let filteredReceiving = window.dashReceiving.filter(r => validPOs.has(r["Mã đơn hàng"]));
      
      filteredReceiving.forEach(i => totalOutput += Number(i["Tổng SL nhận"]) || 0);

      filteredHistory.forEach(order => {
          totalValue += Number(order.total) || 0;
          let partner = order.partnerName || "Khác";
          if(!factoryStats[partner]) factoryStats[partner] = { poCount: 0, value: 0, onTimeCount: 0, totalOutput: 0 };
          
          factoryStats[partner].poCount++;
          factoryStats[partner].value += Number(order.total) || 0;
          
          let delayReason = "";
          let isCritical = false;
          let isWarning = false;
          let diffDays = 0;
          let statusBadge = "Pending";
          
          if (order.statusVai === 'Fail' || order.statusBo === 'Fail') {
              isCritical = true;
              delayReason = "Reject NPL";
              statusBadge = "Fail";
          } else if (order.benchmarkD27) {
              let d27 = new Date(order.benchmarkD27);
              if (!isNaN(d27)) {
                  diffDays = Math.round((today - d27) / (1000 * 60 * 60 * 24));
                  if (diffDays > 0) { isCritical = true; delayReason = "Trễ giao hàng"; statusBadge = "Delayed"; }
                  else if (diffDays > -10) { isWarning = true; delayReason = "Sắp trễ giao"; statusBadge = "Warning"; }
              }
          }
          
          if (!isCritical && !isWarning && (order.statusVai === 'Pending' || order.statusBo === 'Pending') && order.benchmarkD18) {
              let d18 = new Date(order.benchmarkD18);
              if (!isNaN(d18)) {
                  diffDays = Math.round((today - d18) / (1000 * 60 * 60 * 24));
                  if (diffDays > 0) { isWarning = true; delayReason = "Trễ duyệt mẫu"; statusBadge = "Warning"; }
              }
          }

          if (isCritical || isWarning) {
              alertsCount++;
              alertsList.push({
                  orderNo: order.orderNo,
                  partner: partner,
                  product: order.productSummary || "Sản phẩm",
                  qty: order.totalQty || 0,
                  val: order.total || 0,
                  reason: delayReason,
                  isCritical: isCritical,
                  diffDays: diffDays,
                  statusBadge: statusBadge
              });
              if(isCritical) topPOProblems.push({ po: order.orderNo, partner: partner, diffDays: diffDays, type: 'crit' });
              else topPOProblems.push({ po: order.orderNo, partner: partner, diffDays: diffDays, type: 'warn' });
          } else {
              onTimeCount++;
              factoryStats[partner].onTimeCount++;
          }
      });

      filteredReceiving.forEach(row => {
          let po = row["Mã đơn hàng"];
          let order = filteredHistory.find(o => o.orderNo === po);
          if (order) {
              let partner = order.partnerName || "Khác";
              if(factoryStats[partner]) factoryStats[partner].totalOutput += Number(row["Tổng SL nhận"]) || 0;
          }
      });

      let elPoActive = document.getElementById('dyn-active-po'); if(elPoActive) elPoActive.innerText = totalPOs;
      let elOnTime = document.getElementById('dyn-ontime-rate'); if(elOnTime) elOnTime.innerHTML = totalPOs ? Math.round((onTimeCount/totalPOs)*100 || 0) + '<small>%</small>' : '0<small>%</small>';
      let elOTD = document.getElementById('dyn-otd-rate'); if(elOTD) elOTD.innerHTML = totalPOs ? Math.round((onTimeCount/totalPOs)*100 || 0) + '<small>%</small>' : '0<small>%</small>';
      
      let elKpi1 = document.getElementById('dyn-kpi-1'); if(elKpi1) elKpi1.innerText = totalPOs;
      let elKpi2 = document.getElementById('dyn-kpi-2'); if(elKpi2) elKpi2.innerText = totalOutput.toLocaleString('vi-VN');
      let elKpi3 = document.getElementById('dyn-kpi-3'); if(elKpi3) elKpi3.innerHTML = (totalValue / 1000000000).toFixed(2) + '<small>B ₫</small>';
      let elKpi4 = document.getElementById('dyn-kpi-4'); if(elKpi4) elKpi4.innerText = alertsCount;

      let factoryArr = Object.keys(factoryStats).map(name => ({
          name: name,
          ...factoryStats[name]
      })).sort((a, b) => b.poCount - a.poCount);

      let donutSvg = '<svg viewBox="0 0 140 140" width="140" height="140">';
      donutSvg += '<circle cx="70" cy="70" r="48" fill="none" stroke="#EEEDE8" stroke-width="20"/>';
      let currentOffset = 0;
      const C = 2 * Math.PI * 48;
      let legendHtml = '';
      
      factoryArr.forEach((f, idx) => {
          let color = COLORS[idx % COLORS.length];
          let pct = f.poCount / (totalPOs || 1);
          let dash = pct * C;
          let gap = C - dash;
          if (pct > 0) {
              donutSvg += `<circle cx="70" cy="70" r="48" fill="none" stroke="${color}" stroke-width="20"
               stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-currentOffset}" transform="rotate(-90 70 70)"/>`;
              currentOffset += dash;
              legendHtml += `<div class="item"><span class="swatch" style="background:${color}"></span><span class="name">${f.name}</span><span class="pct">${Math.round(pct*100)}%</span></div>`;
          }
      });
      donutSvg += '</svg>';
      
      let elDonutWrap = document.getElementById('dyn-donut-wrap'); if(elDonutWrap) {
          let centerHtml = `<div class="donut-center"><div class="num" id="dyn-donut-num">${totalPOs}</div><div class="lbl">PO Active</div></div>`;
          elDonutWrap.innerHTML = donutSvg + centerHtml;
      }
      let elLegend = document.getElementById('dyn-factory-legend'); if(elLegend) elLegend.innerHTML = legendHtml || '<div style="font-size:11px;">Không có dữ liệu</div>';

      let maxPo = Math.max(...factoryArr.map(f => f.poCount), 1);
      let barHtml = '';
      factoryArr.slice(0, 5).forEach((f, idx) => {
          let color = COLORS[idx % COLORS.length];
          let hPct = (f.poCount / maxPo) * 80 + 10;
          barHtml += `
          <div class="bar-col">
            <div class="bar" style="height: ${hPct}%; background: ${color};">
              <span class="bar-value">${f.poCount}</span>
            </div>
            <span class="bar-label" style="font-size:9px;">${f.name.substring(0,8)}</span>
          </div>`;
      });
      let elBar = document.getElementById('dyn-bar-chart-container'); if(elBar) elBar.innerHTML = barHtml || '<div style="font-size:11px;">Không có dữ liệu</div>';

      let hBarHtml = '';
      factoryArr.forEach((f) => {
          let otdPct = f.poCount > 0 ? Math.round((f.onTimeCount / f.poCount) * 100) : 0;
          let statusClass = otdPct >= 90 ? 'excellent' : (otdPct >= 80 ? 'good' : (otdPct >= 70 ? 'warn' : 'poor'));
          hBarHtml += `
          <div class="h-bar-row">
            <span class="h-bar-label">${f.name.substring(0,10)}</span>
            <div class="h-bar-track">
              <div class="h-bar-fill ${statusClass}" style="width: ${otdPct}%;"><span class="pct">${otdPct}%</span></div>
            </div>
            <span class="h-bar-meta">${f.poCount} PO · ${(f.totalOutput/1000).toFixed(1)}K</span>
          </div>`;
      });
      hBarHtml += '<div class="h-bar-axis"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>';
      let elHBar = document.getElementById('dyn-hbar-chart'); if(elHBar) elHBar.innerHTML = factoryArr.length ? hBarHtml : '<div style="font-size:11px;">Không có dữ liệu</div>';

      let valHtml = '';
      let sortedByVal = [...factoryArr].sort((a,b) => b.value - a.value);
      sortedByVal.forEach(f => {
          valHtml += `<div class="row-detail"><span class="row-detail-label">${f.name}</span><span class="pill">${(f.value/1000000).toFixed(0)}M ₫</span></div>`;
      });
      let elValList = document.getElementById('dyn-value-list'); if(elValList) elValList.innerHTML = valHtml || '<div style="font-size:11px;">Không có dữ liệu</div>';

      let warnHtml = '';
      let critHtml = '';
      alertsList.forEach(a => {
          let sign = a.diffDays > 0 ? '+' : '';
          let itemHtml = `
          <div class="alert-item">
            <div class="head">
              <span class="po">${a.orderNo}</span>
              <span class="time">${sign}${a.diffDays}d</span>
            </div>
            <div class="desc">${a.partner} · ${a.reason}</div>
          </div>`;
          if (a.isCritical) critHtml += itemHtml;
          else warnHtml += itemHtml;
      });
      let elWarn = document.getElementById('dyn-alert-warning'); if(elWarn) elWarn.innerHTML = warnHtml || '<div style="font-size:11px; padding-top:10px;">Không có PO sắp trễ</div>';
      let elCrit = document.getElementById('dyn-alert-critical'); if(elCrit) elCrit.innerHTML = critHtml || '<div style="font-size:11px; padding-top:10px;">Không có PO trễ hạn</div>';

      let topPoHtml = '';
      topPOProblems.sort((a,b) => Math.abs(b.diffDays) - Math.abs(a.diffDays)).slice(0, 5).forEach(p => {
          let sign = p.diffDays > 0 ? '+' : '';
          topPoHtml += `<div class="row-detail"><span class="row-detail-label">${p.po} · ${p.partner}</span><span class="pill ${p.type}">${sign}${p.diffDays}d</span></div>`;
      });
      let elTopPo = document.getElementById('dyn-top-po'); if(elTopPo) elTopPo.innerHTML = topPoHtml || '<div style="font-size:11px;">Mọi thứ đang ổn định</div>';

      let actionHtml = '';
      alertsList.sort((a,b) => Math.abs(b.diffDays) - Math.abs(a.diffDays)).slice(0, 10).forEach(a => {
          let pillClass = a.isCritical ? 'crit' : 'warn';
          let sign = a.diffDays > 0 ? '+' : '';
          actionHtml += `
          <tr>
            <td><span class="po-link">${a.orderNo}</span></td>
            <td>${a.product}</td>
            <td><span class="factory-tag">${a.partner.substring(0,8)}</span></td>
            <td>${a.reason}</td>
            <td>${(a.qty).toLocaleString()} pcs</td>
            <td>${(a.val/1000000).toFixed(0)}M ₫</td>
            <td><span class="pill ${pillClass}">${sign}${a.diffDays} ngày</span></td>
            <td style="text-align:right;"><span style="color: var(--blue-accent); font-weight:600; font-size:11px; cursor:pointer;" onclick="goToNplApproval('${a.orderNo}')">Xử lý →</span></td>
          </tr>`;
      });
      let elAction = document.getElementById('dyn-action-queue'); if(elAction) elAction.innerHTML = actionHtml || '<tr><td colspan="8" style="text-align:center; padding: 20px;">Không có công việc nào cần xử lý gấp. 🎉</td></tr>';
}'''

content = re.sub(old_load_func, new_load_func, content, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
