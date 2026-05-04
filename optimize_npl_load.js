const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Correct WEB_APP_URL to the one provided by user
const oldUrl = 'const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzXHijHR98omLDJ0I6KbSw7j489SoNE_N0S_GuOFYCbsJ3L6gvQA-pbiATQLqzqZDf9tg/exec";';
const newUrl = 'const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxzUt949bhCG8HtMnUnfs_DBYeb47MalIPHTHqRJgXxl1SU-lx7eylaK5FtYoHVxxUabg/exec";';
html = html.replace(oldUrl, newUrl);

// 2. Optimize loadNplApprovals to reuse cache and be faster
const nplJsMatch = /\/\* ================= NPL APPROVALS \(SEARCH VIEW\) ================= \*\/[\s\S]*?function loadNplApprovals\(\) \{[\s\S]*?\}\);[\s\S]*?\}\s*function onNplPOChange/;
const nplJsNew = `
    /* ================= NPL APPROVALS (SEARCH VIEW) ================= */
    function loadNplApprovals() {
      // Clear UI
      document.getElementById("nplPOSummary").style.display = "none";
      document.getElementById("nplApprovalFormArea").style.display = "none";
      
      // 1. If we already have data in cache, populate search list immediately
      if (typeof allOrdersHistory !== "undefined" && allOrdersHistory.length > 0) {
        populateNplDatalist(allOrdersHistory);
      }
      
      // 2. Fetch fresh data in background to keep search list updated
      fetch(WEB_APP_URL + "?action=getHistory")
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data) {
            allOrdersHistory = res.data; // Update global cache
            populateNplDatalist(res.data);
          }
        }).catch(err => console.error("NPL Load Error:", err));
    }

    function populateNplDatalist(data) {
      const dl = document.getElementById("nplPOList");
      if (!dl) return;
      dl.innerHTML = "";
      data.forEach(o => {
        const opt = document.createElement("option");
        opt.value = o.orderNo;
        opt.innerText = \`\${o.orderNo} - \${o.partnerName}\`;
        dl.appendChild(opt);
      });
    }

    function onNplPOChange`;
html = html.replace(nplJsMatch, nplJsNew);

// 3. Ensure allOrdersHistory is globally defined early
if (!html.includes('let allOrdersHistory = [];')) {
    html = html.replace('const WEB_APP_URL', 'let allOrdersHistory = [];\n    const WEB_APP_URL');
}

fs.writeFileSync('index.html', html, 'utf8');
console.log("NPL loading optimized and URL corrected!");
