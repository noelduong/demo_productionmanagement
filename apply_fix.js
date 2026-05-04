const fs = require('fs');
const path = 'd:\\placement\\Index.html';
let content = fs.readFileSync(path, 'utf8');

// The broken loadInitData looks like this:
const brokenInitDataRegex = /function loadInitData\(\) \{[\s\S]*?showToast\("Lỗi kết nối: " \+ err\.message, "error"\);\s*\}\);\s*\}/s;

const newCode = `      function loadInitData() {
        // Just show spinner for 1.5s to wait for data load
        showSpinner("Đang tải dữ liệu...");
        setTimeout(() => {
          hideSpinner();
        }, 1500);
      }

      function loadPartnersFromSheet() {
        const script = document.createElement("script");
        script.src = "https://docs.google.com/spreadsheets/d/1NbNxKCyZV_lTabuYwjLA27sqrANBZ55gVoLkKatVZOM/gviz/tq?sheet=" + encodeURIComponent("Partners") + "&tqx=responseHandler:processSheetData";
        document.body.appendChild(script);
      }

      function processSheetData(json) {
        try {
          const rows = json.table.rows;
          const datalist = document.getElementById("partnerList");
          if (!datalist) return;
          let listHtml = "";
          allPartnersData = [];

          rows.forEach((row) => {
            // Column C (index 2) is Trade Name
            if (!row || !row.c || !row.c[2] || !row.c[2].v) return;
            const tradeName = row.c[2].v;
            
            // Column B (index 1) is Company Name
            const companyName = row.c[1] && row.c[1].v ? row.c[1].v : "";
            
            // Column E (index 4) is Representative
            const rep = row.c[4] && row.c[4].v ? row.c[4].v : "";
            
            // Column H (index 7) is Address
            const address = row.c[7] && row.c[7].v ? row.c[7].v : "";
            
            // Column O (index 14) payment terms, Column P (index 15) delivery terms
            const paymentTerms = row.c[14] && row.c[14].v ? row.c[14].v : (row.c[13] && row.c[13].v ? row.c[13].v : "");
            const deliveryTerms = row.c[15] && row.c[15].v ? row.c[15].v : (row.c[14] && row.c[14].v ? row.c[14].v : "");

            allPartnersData.push({
              tradeName: tradeName,
              companyName: companyName,
              representative: rep,
              address: address,
              paymentTermsOrder: paymentTerms,
              deliveryTerms: deliveryTerms
            });

            listHtml += \`<option value="\${tradeName}"></option>\`;
          });

          datalist.innerHTML = listHtml;
        } catch (e) {
          console.error("Lỗi parse dữ liệu Partners:", e);
        }
      }

      function onPartnerChange(val) {
        const pd = allPartnersData.find(p => p.tradeName === val);
        if (pd) {
          document.getElementById("companyName").value = pd.companyName || "";
          document.getElementById("partnerAddress").value = pd.address || "";
        } else {
          document.getElementById("companyName").value = "";
          document.getElementById("partnerAddress").value = "";
        }
      }`;

if (brokenInitDataRegex.test(content)) {
    content = content.replace(brokenInitDataRegex, newCode);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Successfully fixed loadInitData, processSheetData, and onPartnerChange!");
} else {
    console.log("Regex did not match.");
}
