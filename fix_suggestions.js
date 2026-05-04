const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Ensure loadDashboardData populates allOrdersHistory
const dashHistoryMatch = /if \(historyRes\.success && historyRes\.data\) \{[\s\S]*?totalPOs = historyRes\.data\.length;/;
if (html.match(dashHistoryMatch)) {
    html = html.replace(dashHistoryMatch, (match) => match + '\n            allOrdersHistory = historyRes.data;');
    console.log("loadDashboardData patched to save cache!");
}

// 2. Add an explicit "Load Data" button or message in NPL tab if cache is empty
const nplTabSearchMatch = '<input id="nplPOSearch" list="nplPOList" placeholder="Tìm mã PO..." onchange="onNplPOChange(this.value)">';
const nplTabSearchNew = '<input id="nplPOSearch" list="nplPOList" placeholder="Nhập mã PO để tìm..." onchange="onNplPOChange(this.value)">\n            <div id="nplLoadMsg" style="font-size:0.8rem; color:var(--accent); margin-top:5px; display:none;">Đang tải danh sách PO...</div>';
html = html.replace(nplTabSearchMatch, nplTabSearchNew);

// 3. Update loadNplApprovals to show/hide the loading message
const nplLoadJsMatch = /function loadNplApprovals\(\) \{[\s\S]*?document\.getElementById\("nplPOSummary"\)\.style\.display = "none";/;
const nplLoadJsNew = `function loadNplApprovals() {
      const msg = document.getElementById("nplLoadMsg");
      if (msg) msg.style.display = "block";
      
      document.getElementById("nplPOSummary").style.display = "none";`;
html = html.replace(nplLoadJsMatch, nplLoadJsNew);

const nplLoadFinishMatch = /populateNplDatalist\(res\.data\);[\s\S]*?\}/;
const nplLoadFinishNew = `populateNplDatalist(res.data);
            if (msg) msg.style.display = "none";
          }`;
html = html.replace(nplLoadFinishMatch, nplLoadFinishNew);

fs.writeFileSync('index.html', html, 'utf8');
console.log("PO suggestions fixed!");
