const fs = require('fs');
let html = fs.readFileSync('Index.html', 'utf8');

// The file was reset to main branch, we must inject our logic.
// 1. Add globals
if (!html.includes('let allPartnersData = [];')) {
    html = html.replace('let sizeConfigRows = [', 'let allPartnersData = [];\n      let allPOData = [];\n      let allImagesData = [];\n      let fabricMap = {};\n      let sizeConfigRows = [');
}

// 2. Add INIT listeners
if (!html.includes('loadPartnersFromSheet();')) {
    html = html.replace('loadInitData();\n      });', 'loadInitData();\n        loadPartnersFromSheet();\n        loadPODataFromSheet();\n        loadImagesFromSheet();\n        loadFactoryTabs();\n        document.getElementById("color").addEventListener("input", () => autoFillNPL(null));\n      });');
}

// 3. The massive block
const scriptText = `      function loadPartnersFromSheet() {
        const script = document.createElement("script");
        script.src = "https://docs.google.com/spreadsheets/d/1NbNxKCyZV_lTabuYwjLA27sqrANBZ55gVoLkKatVZOM/gviz/tq?gid=0&tqx=responseHandler:processSheetData";
        document.body.appendChild(script);
      }

      function processSheetData(json) {
        try {
          const rows = json.table.rows;
          const datalist = document.getElementById("partnerList");
          if (!datalist) return;
          let listHtml = "";
          allPartnersData = [];
          rows.forEach((row, i) => {
            if (i < 2 || !row) return; 
            try {
               const tradeName = row.c[2] ? row.c[2].v : ""; 
               const companyName = row.c[3] ? row.c[3].v : ""; 
               const address = row.c[4] ? row.c[4].v : "";     
               const representative = row.c[5] ? row.c[5].v : "";
               const contactName = row.c[6] ? row.c[6].v : ""; 
               const phone = row.c[7] ? row.c[7].v : "";       
               const paymentTerms = row.c[8] ? row.c[8].v : "";
               const vatRate = row.c[9] ? row.c[9].v : "";     
               if (!tradeName) return;
               
               allPartnersData.push({
                  tradeName: tradeName, companyName: companyName, address: address,
                  paymentTerms: paymentTerms, vatRate: vatRate, representative: representative
               });
               listHtml += \`<option value="\${tradeName}"></option>\`;
            } catch (e) { }
          });
          datalist.innerHTML = listHtml;
        } catch (err) { }
      }

      function onPartnerChange(value) {
         const partner = allPartnersData.find(p => p.tradeName === value);
         if (partner) {
            if (partner.companyName) document.getElementById("companyName").value = partner.companyName;
            if (partner.address) document.getElementById("partnerAddress").value = partner.address;
            if (partner.vatRate !== "") {
                let vat = parseFloat(partner.vatRate);
                if (!isNaN(vat)) {
                    if (vat < 1 && vat > 0) vat = vat * 100;
                    document.getElementById("vatRate").value = Math.round(vat);
                    if (typeof renderPreview === 'function') renderPreview();
                }
            }
         }
      }

      function loadPODataFromSheet() {
        const script = document.createElement("script");
        script.src = "https://docs.google.com/spreadsheets/d/1NbNxKCyZV_lTabuYwjLA27sqrANBZ55gVoLkKatVZOM/gviz/tq?gid=950766822&tqx=responseHandler:processPOData";
        document.body.appendChild(script);
      }

      function processPOData(json) {
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
      }

      function loadImagesFromSheet() {
        const script = document.createElement("script");
        script.src = "https://docs.google.com/spreadsheets/d/1NbNxKCyZV_lTabuYwjLA27sqrANBZ55gVoLkKatVZOM/gviz/tq?sheet=%E1%BA%A3nh%20s%E1%BA%A3n%20ph%E1%BA%A9m&tqx=responseHandler:processImagesData";
        document.body.appendChild(script);
      }

      function processImagesData(json) {
        try {
          const rows = json.table.rows;
          allImagesData = [];
          rows.forEach((row, i) => {
            if (i < 1 || !row || !row.c) return;
            try {
              const maSP = row.c[2] ? row.c[2].v.toString().trim() : "";
              const link = row.c[5] ? row.c[5].v : "";
              const mau = row.c[3] ? row.c[3].v.toString().trim().toUpperCase() : "";
              if (maSP && link) {
                 allImagesData.push({ maSP, link, mau });
              }
            } catch(e) {}
          });
        } catch(err) { }
      }

      function loadFactoryTabs() {
        const factoryTabs = ["TALYNO", "ANH THƯ", "AN NGUYÊN", "LC", "GLX", "GIFT"];
        let delay = 300; 
        factoryTabs.forEach((tab, index) => {
          window[\`processFactoryTab_\${index}\`] = function(json) {
            try {
              if (!json || !json.table) return;
              let styleNameIdx = -1, fabricIdx = -1, colorIdx = -1;
              if (json.table.cols) {
                  json.table.cols.forEach((col, idx) => {
                      if (col && col.label) {
                          const lbl = col.label.toUpperCase();
                          if ((lbl.includes('STYLE NAME') || lbl.includes('TÊN SP') || lbl.includes('TÊN MẪU')) && !lbl.includes('CODE') && !lbl.includes('MÃ')) styleNameIdx = idx;
                          if (lbl.includes('FABRIC') || lbl.replace(/\\s/g,'').includes('VẢI')) fabricIdx = idx;
                          if ((lbl.includes('COLOR') || lbl.includes('MÀU')) && !lbl.includes('CODE') && !lbl.includes('MÃ')) colorIdx = idx;
                      }
                  });
              }
              if (!json.table.rows) return;
              json.table.rows.forEach(row => {
                if (row && row.c) {
                  if (styleNameIdx === -1 || fabricIdx === -1 || colorIdx === -1) {
                    row.c.forEach((cell, idx) => {
                      if (cell && cell.v && typeof cell.v === 'string') {
                        const lbl = cell.v.toUpperCase();
                        if ((lbl.includes('STYLE NAME') || lbl.includes('TÊN SP') || lbl.includes('TÊN MẪU')) && !lbl.includes('CODE') && !lbl.includes('MÃ')) styleNameIdx = idx;
                        if (lbl.includes('FABRIC') || lbl.replace(/\\s/g,'').includes('VẢI')) fabricIdx = idx;
                        if ((lbl.includes('COLOR') || lbl.includes('MÀU')) && !lbl.includes('CODE') && !lbl.includes('MÃ')) colorIdx = idx;
                      }
                    });
                  }
                  if (styleNameIdx !== -1 && fabricIdx !== -1 && colorIdx !== -1) {
                    const styleNameCel = row.c[styleNameIdx];
                    const fabricCel = row.c[fabricIdx];
                    const colorCel = row.c[colorIdx];
                    if (styleNameCel && styleNameCel.v && fabricCel && fabricCel.v && colorCel && colorCel.v) {
                      const sName = styleNameCel.v.toString().trim().toUpperCase();
                      const fName = fabricCel.v.toString().trim();
                      const cName = colorCel.v.toString().trim().toUpperCase();
                      if (sName !== 'STYLE NAME' && sName !== 'TÊN SP' && sName !== 'TÊN MẪU') {
                        fabricMap[sName + '|' + cName] = fName;
                      }
                    }
                  }
                }
              });
            } catch(e) {}
          };
          
          setTimeout(() => {
              const script = document.createElement("script");
              script.src = \`https://docs.google.com/spreadsheets/d/1NbNxKCyZV_lTabuYwjLA27sqrANBZ55gVoLkKatVZOM/gviz/tq?sheet=\${encodeURIComponent(tab)}&tqx=responseHandler:processFactoryTab_\${index}\`;
              document.body.appendChild(script);
          }, delay);
          delay += 400;
        });
      }

      function autoFillNPL(poObj) {
         let po = poObj;
         if (!po || !po.maSP) {
           const inputVal = document.getElementById("artCode").value.trim();
           if (!inputVal) return;
           const searchCode = inputVal.split(" - ")[0].trim();
           po = allPOData.find(p => p.maSP.toUpperCase() === searchCode.toUpperCase());
         }
         
         if (!po) return;
         
         const colorInput = document.getElementById("color").value.trim().toUpperCase();
         const searchName = po.tenMau.toUpperCase();
         
         let isMapEmpty = Object.keys(fabricMap).length === 0;
         let matchedFabric = null;
         
         if (!isMapEmpty) {
             if (colorInput) {
                 const exactKey = searchName + "|" + colorInput;
                 if (fabricMap[exactKey]) {
                     matchedFabric = fabricMap[exactKey];
                 } else {
                     for (const key in fabricMap) {
                         const parts = key.split("|");
                         const kName = parts[0].trim().toUpperCase();
                         const kColor = parts[1].trim().toUpperCase();
                         const searchWords = searchName.split(/[-\\s]/);
                         
                         let nameMatch = searchName === kName || searchName.includes(kName) || kName.includes(searchName);
                         if (!nameMatch) {
                              const kWords = kName.split(/[-\\s]/);
                              nameMatch = searchWords.some(sw => sw.length > 2 && kWords.includes(sw));
                         }

                         if (nameMatch && (kColor === colorInput || kColor.includes(colorInput) || colorInput.includes(kColor))) {
                             matchedFabric = fabricMap[key];
                             break;
                         }
                     }
                 }
             } else {
                 for (const key in fabricMap) {
                     const parts = key.split("|");
                     const kName = parts[0].trim().toUpperCase();
                     let nameMatch = searchName === kName || searchName.includes(kName) || kName.includes(searchName);
                     if (nameMatch) {
                         matchedFabric = fabricMap[key];
                         break; 
                     }
                 }
             }
         }

         let finalVal = matchedFabric;
         if (!finalVal) {
             if (isMapEmpty) finalVal = po.note + " (Chưa tải xong data từ xưởng)";
             else finalVal = po.note + " (Không tìm thấy Tên Mẫu trong data xưởng)";
         }

         document.getElementById("nplInfo").value = finalVal;
      }

      function onArtCodeChange(value) {
         if (!value) return;
         
         let searchCode = value.split(" - ")[0].trim();
         
         const po = allPOData.find(p => p.maSP.toUpperCase() === searchCode.toUpperCase());
         if (po) {
            document.getElementById("artCode").value = po.maSP;
            document.getElementById("productName").value = po.tenMau;
            
            const inputPrice = document.getElementById("unitPriceDisplay");
            inputPrice.value = po.donGia.toString();
            if (typeof formatPriceInput === 'function') {
                formatPriceInput(inputPrice);
            }
            
            autoFillNPL(po);

            const imgUrlInput = document.getElementById("imageUrl");
            if (imgUrlInput) {
                const imgRecord = allImagesData.find(img => img.maSP.toUpperCase() === searchCode.toUpperCase() && img.mau === 'TRẮNG');
                if (imgRecord && imgRecord.link) {
                    imgUrlInput.value = imgRecord.link;
                }
            }
         }
      }

`;
if (!html.includes('function loadPartnersFromSheet()')) {
    html = html.replace('/* ================= TABS ================= */', scriptText + '      /* ================= TABS ================= */');
}

// Ensure the HTML inputs are updated!
html = html.replace('<input id="supplier" placeholder="VD: TALYNO" />', '<input id="supplier" list="partnerList" placeholder="VD: TALYNO" onchange="onPartnerChange(this.value)" />\n                <datalist id="partnerList"></datalist>');
html = html.replace('<label>Art (MÃ SP)</label>\n                <input id="artCode" placeholder="VD: PO88" />', '<label>Art (MÃ SP)</label>\n                <input id="artCode" list="poList" placeholder="VD: PO88" onchange="onArtCodeChange(this.value)" />\n                <datalist id="poList"></datalist>');

// Replace PDF Signature to inject representative
html = html.replace('<div style="font-weight:bold">${supplier}</div>', '<div style="font-weight:bold">${supplier}${allPartnersData.find(p => p.tradeName === supplier) && allPartnersData.find(p => p.tradeName === supplier).representative ? \'<br><span style="font-weight:normal;font-size:12px;">\' + allPartnersData.find(p => p.tradeName === supplier).representative.replace(/\\n/g, \'<br>\') + \'</span>\' : \'\'}</div>');

fs.writeFileSync('Index.html', html);
console.log('Successfully reconstructed Index.html');
