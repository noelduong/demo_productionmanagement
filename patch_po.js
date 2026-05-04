const fs = require('fs');
let html = fs.readFileSync('Index.html', 'utf8');

const regexPO = /function loadPODataFromSheet[^}]*}/;
const newLoadPO = `function loadPODataFromSheet() {
        const script = document.createElement("script");
        script.src = "https://docs.google.com/spreadsheets/d/1NbNxKCyZV_lTabuYwjLA27sqrANBZ55gVoLkKatVZOM/gviz/tq?sheet=" + encodeURIComponent("mã PO") + "&tqx=responseHandler:processPOData";
        document.body.appendChild(script);
      }`;
html = html.replace(regexPO, newLoadPO);

const oldProcessPO = `      function processPOData(json) {
        try {
          const rows = json.table.rows;
          const datalist = document.getElementById("poList");
          if (!datalist) return;
          let listHtml = "";
          allPOData = [];
          
          rows.forEach((row) => {
            if (!row || !row.c) return;
            try {
              const tenMau = row.c[2] ? row.c[2].v : "";
              const maSP = row.c[3] ? row.c[3].v : "";
              let donGia = row.c[10] ? row.c[10].v : 0;
              const danhMuc = row.c[8] ? row.c[8].v : "";
              const kieuDang = row.c[5] ? row.c[5].v : "";
              const form = row.c[6] ? row.c[6].v : "";
              
              donGia = parseFloat(donGia);
              if (isNaN(donGia) || donGia < 1000) return; 
              if (!maSP || !tenMau || maSP === "MA SP" || maSP === "Mã SP") return;

              let noteStr = [];
              if (danhMuc && danhMuc !== "n.a") noteStr.push(danhMuc);
              if (kieuDang && kieuDang !== "n.a") noteStr.push(kieuDang);
              if (form && form !== "n.a") noteStr.push(form);

              allPOData.push({
                 maSP: maSP.toString().trim(),
                 tenMau: tenMau.toString().trim(),
                 donGia: donGia,
                 note: noteStr.join(" - ")
              });
            } catch (e) { }
          });

          allPOData.sort((a, b) => a.maSP.localeCompare(b.maSP));
          allPOData.forEach(po => {
             listHtml += \`<option value="\${po.maSP} - \${po.tenMau}"></option>\`;
          });
          datalist.innerHTML = listHtml;
        } catch (err) { }
      }`;

const newProcessPO = `      function processPOData(json) {
        try {
          const rows = json.table.rows;
          const datalist = document.getElementById("poList");
          if (!datalist) return;
          let listHtml = "";
          allPOData = [];
          
          rows.forEach((row) => {
            if (!row || !row.c) return;
            try {
              const tenGhep = row.c[2] ? row.c[2].v : ""; // PO88-BE-XXL
              const maSP = row.c[3] ? row.c[3].v : ""; // PO88
              const mau = row.c[4] ? row.c[4].v : ""; // BE
              const size = row.c[5] ? row.c[5].v : ""; // XXL
              
              if (!maSP || !tenGhep || maSP === "MA SP" || maSP === "Mã SP") return;

              // Since price is not available in "mã PO", keep it 0 or ask user to fill
              allPOData.push({
                 maSP: maSP.toString().trim(),
                 tenMau: tenGhep.toString().trim(), // we will use this as product name to keep structure compatible
                 donGia: 0,
                 mau: mau? mau.toString().trim() : "",
                 note: ""
              });
            } catch (e) { }
          });

          // Uniq by maSP + tenMau
          const seen = new Set();
          const uniquePO = [];
          allPOData.forEach(p => {
              const k = p.maSP + '|' + p.tenMau;
              if (!seen.has(k)) {
                  seen.add(k);
                  uniquePO.push(p);
              }
          });
          allPOData = uniquePO;

          allPOData.sort((a, b) => a.maSP.localeCompare(b.maSP));
          allPOData.forEach(po => {
             listHtml += \`<option value="\${po.maSP} - \${po.tenMau}"></option>\`;
          });
          datalist.innerHTML = listHtml;
        } catch (err) { }
      }`;

if (html.includes('if (isNaN(donGia) || donGia < 1000) return;')) {
    html = html.replace(oldProcessPO, newProcessPO);
}

fs.writeFileSync('Index.html', html);
console.log('Fixed PO parsing logic for new Google Sheet format');
