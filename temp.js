
      /* ================= GLOBAL STATE ================= */
      let orderItems = [];
      let allPartnersData = [];
      let allPOData = [];
      let allImagesData = [];
      let fabricMap = {};
      // priceMap: key = STYLE NAME (uppercase), value = { orgCost, vatCost, factory, tabName }
      let priceMap = {};
      let sizeConfigRows = [
        { size: "S", qty: 0 },
        { size: "M", qty: 0 },
        { size: "L", qty: 0 },
        { size: "XL", qty: 0 },
      ];

      /* ================= INIT ================= */
      document.addEventListener("DOMContentLoaded", function () {
        initDateFields();
        renderSizeRows();
        loadInitData();
        loadPartnersFromSheet();
        loadPODataFromSheet();
        loadImagesFromSheet();
        loadFactoryTabs();
        document.getElementById("color").addEventListener("input", function() { 
          autoFillNPL(null);
          if (typeof autoFillImage === 'function') autoFillImage(null, this.value);
        });
      });

      function initDateFields() {
        const today = new Date().toISOString().split("T")[0];
        document.getElementById("orderDate").value = today;
      }

            function loadInitData() {
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

            listHtml += `<option value="${tradeName}"></option>`;
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
      }

      /* ================= HISTORY ================= */

      function loadPODataFromSheet() {
        const script = document.createElement("script");
        script.src = "https://docs.google.com/spreadsheets/d/1NbNxKCyZV_lTabuYwjLA27sqrANBZ55gVoLkKatVZOM/gviz/tq?sheet=" + encodeURIComponent("mã PO") + "&tqx=responseHandler:processPOData";
        document.body.appendChild(script);
      }

      function processPOData(json) {
        // Sheet "mã PO" columns (NEW structure after update):
        // c[0]=null (checkbox/marker), c[1]=STT (số hoặc mã PO nhóm e.g. VO5, PO88),
        // c[2]=TÊN MẪU (tên sản phẩm e.g. "BASIC SYMBOL", "UGO", "VỚ CỔ CAO"),
        // c[3]=MÃ SP (e.g. PO88, VO5, PO15),
        // c[4]=XƯỞNG / MÀU (dòng header nhóm = tên xưởng; dòng SKU = tên màu),
        // c[5]=KIỂU DÁNG / SIZE (dòng header nhóm = kiểu; dòng SKU = size)
        try {
          const rows = json.table.rows;
          const datalist = document.getElementById("poList");
          if (!datalist) return;
          let listHtml = "";
          allPOData = [];

          // Build a lookup: maSP -> tenMau from HEADER rows only
          // Header rows: c[1] is a numeric STT (e.g. 1, 2, 15)
          // SKU rows: c[1] = PO code (same as c[3]), c[2] = variant code like PO103-TRANG-M
          const tenMauMap = {};

          // First pass: collect product names from header rows only
          rows.forEach((row) => {
            if (!row || !row.c) return;
            try {
              const c1Raw = row.c[1] ? row.c[1].v : null;
              const c2 = row.c[2] ? row.c[2].v : "";
              const c3 = row.c[3] ? row.c[3].v : "";
              if (!c3 || c3.toString().trim() === '' || c3.toString().trim() === 'MÃ SP') return;
              const maSP = c3.toString().trim();
              // A header row has c[1] as a NUMBER (the STT index like 1, 2, 15...)
              const isSTTRow = (c1Raw !== null && !isNaN(Number(c1Raw)) && Number(c1Raw) === Math.floor(Number(c1Raw)));
              if (isSTTRow && c2 && c2.toString().trim() !== '') {
                tenMauMap[maSP] = c2.toString().trim();
              }
            } catch(e) {}
          });

          rows.forEach((row) => {
            if (!row || !row.c) return;
            try {
              const c1 = row.c[1] ? row.c[1].v : "";   // STT or PO group code
              const c2 = row.c[2] ? row.c[2].v : "";   // TÊN MẪU or variant code
              const c3 = row.c[3] ? row.c[3].v : "";   // MÃ SP
              const c4 = row.c[4] ? row.c[4].v : "";   // MÀU (on SKU rows)
              const c5 = row.c[5] ? row.c[5].v : "";   // SIZE (on SKU rows)

              // Skip header/sub-header rows: c[3] = "MÃ SP" or empty
              if (!c3 || c3.toString().trim() === '' || c3.toString().trim() === 'MÃ SP') return;

              const maSP = c3.toString().trim();

              // SKU rows: c[4] is color, c[5] is size — skip if no color
              const mau = c4 ? c4.toString().trim() : '';
              const size = c5 ? c5.toString().trim() : '';
              if (!mau) return;

              allPOData.push({
                maSP: maSP,
                mau: mau,
                size: size,
                tenMau: maSP + ' - ' + mau,
                productName: '' // will be filled below
              });
            } catch (e) { }
          });

          // Attach product names from the first-pass map
          allPOData.forEach(p => {
            p.productName = tenMauMap[p.maSP] || '';
          });

          // Unique records by maSP only (one entry per product, not per color)
          const seenProducts = new Set();
          const uniqueProducts = [];
          allPOData.forEach(p => {
            if (!seenProducts.has(p.maSP)) {
              seenProducts.add(p.maSP);
              uniqueProducts.push(p);
            }
          });
          // allPOData keeps all color variants for lookup purposes
          // but datalist only shows one entry per product
          uniqueProducts.sort((a, b) => a.maSP.localeCompare(b.maSP));
          uniqueProducts.forEach(po => {
            // Show "PO88 - BASIC SYMBOL" format
            const label = po.productName ? `${po.maSP} - ${po.productName}` : po.maSP;
            listHtml += `<option value="${label}"></option>`;
          });
          datalist.innerHTML = listHtml;
        } catch (err) { console.error('processPOData error:', err); }
      }

      function loadImagesFromSheet() {
        const script = document.createElement("script");
        script.src = "https://docs.google.com/spreadsheets/d/1NbNxKCyZV_lTabuYwjLA27sqrANBZ55gVoLkKatVZOM/gviz/tq?sheet=%E1%BA%A3nh%20s%E1%BA%A3n%20ph%E1%BA%A9m&tqx=responseHandler:processImagesData";
        document.body.appendChild(script);
      }

      function driveViewToThumb(url) {
        // Convert Google Drive uc?export=view or /file/d/ links to thumbnail URL
        // which is reliably embeddable without login restrictions
        if (!url) return url;
        let fileId = null;
        // Pattern 1: uc?export=view&id=FILE_ID
        const m1 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (m1) fileId = m1[1];
        // Pattern 2: /file/d/FILE_ID/
        if (!fileId) {
          const m2 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
          if (m2) fileId = m2[1];
        }
        if (fileId) {
          // Use Google's thumbnail endpoint — works without login for shared files
          return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
        }
        return url; // fallback, return as-is
      }

      function processImagesData(json) {
        // Sheet "ảnh sản phẩm" columns:
        // c[0]=STT, c[1]=Style Name (SYMBOL), c[2]=Mã PO (PO88), c[3]=Màu,
        // c[4]=Drive /file/d/ link, c[5]=uc?export=view link
        try {
          const rows = json.table.rows;
          allImagesData = [];
          rows.forEach((row, i) => {
            if (!row || !row.c) return;
            try {
              const maSP = row.c[2] ? row.c[2].v.toString().trim() : "";  // PO code
              const mau = row.c[3] ? row.c[3].v.toString().trim().toUpperCase() : "";  // Color
              // Prefer c[5] (direct link), fallback to c[4] (view link)
              const rawLink = (row.c[5] && row.c[5].v) ? row.c[5].v : (row.c[4] && row.c[4].v) ? row.c[4].v : "";
              const link = driveViewToThumb(rawLink);
              if (maSP && link && maSP !== 'MÃ PO') {
                 allImagesData.push({ maSP, link, mau });
              }
            } catch(e) {}
          });
        } catch(err) { console.error('processImagesData error:', err); }
      }

      function loadFactoryTabs() {
        // Factory tab columns:
        // c[0]=STT, c[1]=PO Code, c[2]=PO Type, c[3]=STYLE NAME, c[4]=Style Code,
        // c[5]=Category, c[6]=FABRIC, c[7]=COLOR, c[8]=Color Code,
        // c[9]=FOB/Factory, c[10]=ORG COST (giá thuần), c[11]=COST+VAT
        const factoryTabs = ["TALYNO", "ANH THƯ", "AN NGUYÊN", "LC", "GLX", "GIFT"];
        let delay = 300;
        factoryTabs.forEach((tab, index) => {
          window[`processFactoryTab_${index}`] = function(json) {
            try {
              if (!json || !json.table || !json.table.rows) return;
              const STYLE_NAME_IDX = 3;
              const FABRIC_IDX     = 6;
              const COLOR_IDX      = 7;
              const FACTORY_IDX    = 9;   // FOB / Nhà máy
              const ORG_COST_IDX   = 10;  // Giá thuần (chưa VAT)
              const VAT_COST_IDX   = 11;  // Giá gồm VAT

              json.table.rows.forEach(row => {
                if (!row || !row.c) return;
                const styleNameCel = row.c[STYLE_NAME_IDX];
                const fabricCel    = row.c[FABRIC_IDX];
                const colorCel     = row.c[COLOR_IDX];
                const factoryCel   = row.c[FACTORY_IDX];
                const orgCostCel   = row.c[ORG_COST_IDX];
                const vatCostCel   = row.c[VAT_COST_IDX];

                if (!styleNameCel || !styleNameCel.v) return;
                const sName = styleNameCel.v.toString().trim().toUpperCase();
                if (sName === 'STYLE NAME' || sName === 'TÊN SP' || sName === 'TÊN MẪU') return;

                // Update fabricMap
                if (fabricCel && fabricCel.v && colorCel && colorCel.v) {
                  const fName = fabricCel.v.toString().trim();
                  const cName = colorCel.v.toString().trim().toUpperCase();
                  fabricMap[sName + '|' + cName] = fName;
                }

                // Update priceMap — keep LAST seen price for this style name per tab
                // (last row = most recent order in the sheet)
                const orgCost = orgCostCel && orgCostCel.v !== null && orgCostCel.v !== '' ? orgCostCel.v : null;
                const vatCost = vatCostCel && vatCostCel.v !== null && vatCostCel.v !== '' ? vatCostCel.v : null;
                if (orgCost !== null || vatCost !== null) {
                  priceMap[sName] = {
                    orgCost:  orgCost,
                    vatCost:  vatCost,
                    factory:  factoryCel && factoryCel.v ? factoryCel.v.toString().trim() : tab,
                    tabName:  tab
                  };
                }
              });
            } catch(e) { console.error('Factory tab error (' + tab + '):', e); }
          };

          setTimeout(() => {
            const script = document.createElement("script");
            script.src = `https://docs.google.com/spreadsheets/d/1NbNxKCyZV_lTabuYwjLA27sqrANBZ55gVoLkKatVZOM/gviz/tq?sheet=${encodeURIComponent(tab)}&tqx=responseHandler:processFactoryTab_${index}`;
            document.body.appendChild(script);
          }, delay);
          delay += 400;
        });
      }

      function autoFillImage(poCode, colorName) {
        const imgUrlInput = document.getElementById("imageUrl");
        if (!imgUrlInput || allImagesData.length === 0) return;

        let code = poCode ? poCode.toString().toUpperCase().trim() : "";
        if (!code) {
           const artVal = document.getElementById("artCode").value.trim();
           code = artVal.split(" - ")[0].trim().toUpperCase();
        }

        let col = colorName ? colorName.toString().toUpperCase().trim() : "";
        if (!col) {
           col = document.getElementById("color").value.trim().toUpperCase();
        }

        if (!code) return;

        let imgRecord = null;
        if (col) {
           imgRecord = allImagesData.find(img => img.maSP.toUpperCase() === code && img.mau === col);
        }

        if (!imgRecord) {
           imgRecord = allImagesData.find(img => img.maSP.toUpperCase() === code && img.mau === 'TRẮNG');
        }

        if (!imgRecord) {
           imgRecord = allImagesData.find(img => img.maSP.toUpperCase() === code);
        }

        if (imgRecord && imgRecord.link) {
           imgUrlInput.value = imgRecord.link;
        }
      }

      function autoFillNPL(poObj) {
         let po = poObj;
         // If no po object, try to look it up from the artCode field
         if (!po || !po.maSP) {
           const inputVal = document.getElementById("artCode").value.trim();
           if (!inputVal) return;
           const parts = inputVal.split(" - ");
           const searchCode = parts[0].trim();
           const searchColor = parts.length > 1 ? parts[1].trim().toUpperCase() : '';
           if (searchColor) {
             po = allPOData.find(p => p.maSP.toUpperCase() === searchCode.toUpperCase() && p.mau.toUpperCase() === searchColor);
           }
           if (!po) po = allPOData.find(p => p.maSP.toUpperCase() === searchCode.toUpperCase());
         }
         if (!po) return;

         // Color to search: from color field, or from po.mau from mã PO sheet
         const colorFieldVal = document.getElementById("color").value.trim().toUpperCase();
         const colorToSearch = colorFieldVal || (po.mau ? po.mau.toUpperCase() : '');

         let isMapEmpty = Object.keys(fabricMap).length === 0;
         let matchedFabric = null;

         if (!isMapEmpty && colorToSearch) {
             // Try exact match: STYLE NAME | COLOR
             for (const key in fabricMap) {
                 const pipeIdx = key.lastIndexOf('|');
                 const kName = key.substring(0, pipeIdx).trim().toUpperCase();
                 const kColor = key.substring(pipeIdx + 1).trim().toUpperCase();

                 // Color fuzzy match: contains each other
                 const colorMatch = kColor === colorToSearch ||
                                    kColor.includes(colorToSearch) ||
                                    colorToSearch.includes(kColor);

                 if (colorMatch) {
                     matchedFabric = fabricMap[key];
                     break;
                 }
             }
         } else if (!isMapEmpty) {
             // No color: just return first fabric entry (will be overridden when color typed)
             const firstKey = Object.keys(fabricMap)[0];
             if (firstKey) matchedFabric = fabricMap[firstKey];
         }

         let finalVal = matchedFabric;
         if (!finalVal) {
             if (isMapEmpty) finalVal = "(Đang tải data vải từ xưởng, vui lòng thử lại sau ít giây)";
             else finalVal = "(Chưa tìm thấy thông tin vải - nhập tay)";
         }
         document.getElementById("nplInfo").value = finalVal;
      }

      function autoFillPrice(productName) {
        const box = document.getElementById('priceRefBox');
        const txt = document.getElementById('priceRefText');
        if (!box || !txt) return;

        if (!productName) {
          txt.innerHTML = '— Chọn sản phẩm để xem giá tham chiếu';
          txt.style.color = 'var(--text-light)';
          return;
        }

        const key = productName.toString().trim().toUpperCase();
        const priceInfo = priceMap[key];

        if (!priceInfo) {
          // Try partial match
          const partialKey = Object.keys(priceMap).find(k => k.includes(key) || key.includes(k));
          if (partialKey) {
            return autoFillPrice(partialKey); // recurse with matched key
          }
          txt.innerHTML = '<i class="fas fa-info-circle"></i> Chưa có giá trong dữ liệu nhà máy';
          txt.style.color = 'var(--text-light)';
          return;
        }

        const fmt = (v) => {
          if (v === null || v === undefined || v === '') return '—';
          const num = parseFloat(v.toString().replace(/[^\d.]/g, ''));
          if (isNaN(num)) return v;
          return num.toLocaleString('vi-VN') + ' đ';
        };

        txt.innerHTML = [
          `<span style="background:var(--primary);color:white;padding:2px 8px;border-radius:4px;font-size:0.8rem;font-weight:600">${priceInfo.tabName}</span>`,
          `<span style="color:var(--text)">Giá thuần: <strong style="color:var(--primary)">${fmt(priceInfo.orgCost)}</strong></span>`,
          `<span style="color:var(--text-light)">|</span>`,
          `<span style="color:var(--text)">Giá + VAT: <strong style="color:var(--accent)">${fmt(priceInfo.vatCost)}</strong></span>`
        ].join(' ');
        txt.style.color = 'inherit';

        // Auto-fill the unit price field with the VAT included price ONLY if it's currently empty
        if (priceInfo.vatCost !== null && priceInfo.vatCost !== undefined && priceInfo.vatCost !== '') {
           const num = parseFloat(priceInfo.vatCost.toString().replace(/[^\d.]/g, ''));
           if (!isNaN(num)) {
               const priceInput = document.getElementById('unitPriceDisplay');
               if (priceInput && (!priceInput.value || priceInput.value.trim() === '')) {
                   priceInput.value = num; // formatPriceInput will format it
                   if (typeof formatPriceInput === 'function') {
                       formatPriceInput(priceInput);
                   }
               }
           }
        }
      }

      function onArtCodeChange(value) {
         if (!value) return;

         // The dropdown value is now "PO88 - BASIC SYMBOL" (maSP - productName)
         // Extract just the PO code (the part before the first " - ")
         const parts = value.split(" - ");
         const searchCode = parts[0].trim();

         // Find by maSP only (get first color variant for lookup purposes)
         const po = allPOData.find(p => p.maSP.toUpperCase() === searchCode.toUpperCase());

         if (po) {
            // Fill Art Code field with just the PO code
            document.getElementById("artCode").value = po.maSP;
            // Auto-fill product name from TÊN MẪU (e.g. "BASIC SYMBOL", "UGO")
            // Only auto-fill if the field is currently empty
            if (!document.getElementById("productName").value) {
               document.getElementById("productName").value = po.productName || po.maSP;
            }
            // Auto-fill price reference from factory data
            autoFillPrice(po.productName || '');
            // NOTE: Color field is left empty — user enters it manually
            // NPL will auto-fill when user types color (color input event listener)

            // Auto-fill NPL if color already typed (pass po for maSP lookup)
            autoFillNPL(po);

            // Auto-fill image based on PO and current color
            if (typeof autoFillImage === 'function') autoFillImage(po.maSP, null);
         }
      }

      /* ================= TABS ================= */
      function switchTab(tabId, el) {
        document
          .querySelectorAll(".tab-content")
          .forEach((t) => t.classList.remove("active"));
        document
          .querySelectorAll(".nav-item")
          .forEach((t) => t.classList.remove("active"));

        document.getElementById(tabId).classList.add("active");
        el.classList.add("active");

        if (tabId === "historyTab") {
          loadOrderHistory();
        }
      }

      /* ================= UI UTILS ================= */
      function sortSizes(sizes) {
        // Predefined garment size order
        const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL', 'XXXL', '4XL', '5XL', 'FREE'];
        function getSizeRank(s) {
          const upper = s.toUpperCase().trim();
          const idx = sizeOrder.indexOf(upper);
          if (idx >= 0) return idx; // known garment size
          const num = parseFloat(s);
          if (!isNaN(num)) return 100 + num; // numeric size (28, 29, 30...)
          return 200; // unknown → sort last
        }
        return sizes.slice().sort((a, b) => getSizeRank(a) - getSizeRank(b));
      }

      function formatMoney(v) {
        return Number(v || 0).toLocaleString("vi-VN");
      }

      function formatPriceInput(el) {
        let val = el.value.replace(/[^0-9]/g, "");
        document.getElementById("unitPrice").value = val;
        el.value = val ? Number(val).toLocaleString("vi-VN") : "";
      }

      function showToast(msg, type = "success") {
        const container = document.getElementById("toastContainer");
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;

        const icon =
          type === "success" ? "fa-check-circle" : "fa-exclamation-circle";
        toast.innerHTML = `<i class="fas ${icon}"></i> <span>${msg}</span>`;

        container.appendChild(toast);

        setTimeout(() => toast.classList.add("show"), 10);
        setTimeout(() => {
          toast.classList.remove("show");
          setTimeout(() => toast.remove(), 300);
        }, 3000);
      }

      function showSpinner(text) {
        document.getElementById("spinnerText").innerText =
          text || "Đang xử lý...";
        document.getElementById("spinner").style.display = "flex";
      }
      function hideSpinner() {
        document.getElementById("spinner").style.display = "none";
      }

      /* ================= SIZE MANAGEMENT ================= */
      function addSizeRow() {
        sizeConfigRows.push({ size: "", qty: 0 });
        renderSizeRows();
      }

      function removeSizeRow(index) {
        sizeConfigRows.splice(index, 1);
        renderSizeRows();
      }

      function renderSizeRows() {
        const container = document.getElementById("sizeRows");
        container.innerHTML = sizeConfigRows
          .map(
            (r, i) => `
    <div class="size-row">
      <input type="text" placeholder="Tên Size (S, M, 28, 29...)" value="${r.size}" oninput="sizeConfigRows[${i}].size=this.value">
      <input type="number" placeholder="Số lượng" value="${r.qty || ""}" oninput="sizeConfigRows[${i}].qty=Number(this.value||0)" min="0">
      <button class="btn btn-outline btn-danger btn-icon" onclick="removeSizeRow(${i})"><i class="fas fa-times"></i></button>
    </div>
  `,
          )
          .join("");
      }

      /* ================= PRODUCT FORM ================= */
      function clearProductForm() {
        document.getElementById("productName").value = "";
        document.getElementById("imageUrl").value = "";
        document.getElementById("artCode").value = "";
        document.getElementById("color").value = "";
        document.getElementById("note").value = "";
        document.getElementById("nplInfo").value = "";
        document.getElementById("deliveryDate").value = "";
        document.getElementById("unitPrice").value = "";
        document.getElementById("unitPriceDisplay").value = "";

        sizeConfigRows = [
          { size: "S", qty: 0 },
          { size: "M", qty: 0 },
          { size: "L", qty: 0 },
          { size: "XL", qty: 0 },
        ];
        renderSizeRows();

        document.getElementById("editIndex").value = "-1";
        document.getElementById("formTitle").innerHTML =
          "2. THÔNG TIN SẢN PHẨM";
        document.getElementById("saveProductBtnText").innerText =
          "Lưu Sản Phẩm Vào Đơn";

        document.getElementById("productName").classList.remove("invalid");
        document.getElementById("unitPriceDisplay").classList.remove("invalid");
      }

      function saveProduct() {
        // Validation
        const name = document.getElementById("productName").value.trim();
        const price = document.getElementById("unitPrice").value;
        let isValid = true;

        if (!name) {
          document.getElementById("productName").classList.add("invalid");
          isValid = false;
        } else {
          document.getElementById("productName").classList.remove("invalid");
        }

        if (!price || Number(price) <= 0) {
          document.getElementById("unitPriceDisplay").classList.add("invalid");
          isValid = false;
        } else {
          document
            .getElementById("unitPriceDisplay")
            .classList.remove("invalid");
        }

        if (!isValid) {
          showToast("Vui lòng điền các trường bắt buộc (*)", "error");
          return;
        }

        // Parse sizes
        const sizeData = {};
        let totalQty = 0;
        sizeConfigRows.forEach((r) => {
          if (r.size && r.size.trim() !== "" && r.qty > 0) {
            const q = parseInt(r.qty);
            sizeData[r.size.trim()] = q;
            totalQty += q;
          }
        });

        if (totalQty === 0) {
          showToast("Vui lòng nhập số lượng cho ít nhất 1 size!", "error");
          return;
        }

        const product = {
          productName: name,
          imageUrl: document.getElementById("imageUrl").value.trim(),
          artCode: document.getElementById("artCode").value.trim(),
          color: document.getElementById("color").value.trim(),
          sizeData: sizeData,
          totalQty: totalQty,
          unitPrice: Number(price),
          note: document.getElementById("note").value.trim(),
          nplInfo: document.getElementById("nplInfo").value.trim(),
          deliveryDate: document.getElementById("deliveryDate").value,
        };

        const editIndex = parseInt(document.getElementById("editIndex").value);
        if (editIndex >= 0) {
          orderItems[editIndex] = product;
          showToast("Cập nhật sản phẩm thành công!");
        } else {
          orderItems.push(product);
          showToast("Đã thêm sản phẩm vào đơn!");
        }

        clearProductForm();
        renderPreview();

        // Scroll to preview
        document
          .getElementById("previewArea")
          .scrollIntoView({ behavior: "smooth", block: "center" });
      }

      function editProduct(index) {
        const p = orderItems[index];
        document.getElementById("productName").value = p.productName;
        document.getElementById("imageUrl").value = p.imageUrl;
        document.getElementById("artCode").value = p.artCode;
        document.getElementById("color").value = p.color;
        document.getElementById("note").value = p.note;
        document.getElementById("nplInfo").value = p.nplInfo;
        document.getElementById("deliveryDate").value = p.deliveryDate || "";

        document.getElementById("unitPrice").value = p.unitPrice;
        document.getElementById("unitPriceDisplay").value = formatMoney(
          p.unitPrice,
        );

        sizeConfigRows = [];
        for (let size in p.sizeData) {
          sizeConfigRows.push({ size: size, qty: p.sizeData[size] });
        }
        // Add empty row for expansion
        sizeConfigRows.push({ size: "", qty: 0 });
        renderSizeRows();

        document.getElementById("editIndex").value = index;
        document.getElementById("formTitle").innerHTML =
          "2. SỬA THÔNG TIN SẢN PHẨM (Dòng " + (index + 1) + ")";
        document.getElementById("saveProductBtnText").innerText =
          "Cập Nhật Thay Đổi";

        document
          .getElementById("productFormCard")
          .scrollIntoView({ behavior: "smooth", block: "center" });
      }

      function deleteProduct(index) {
        if (confirm("Bạn có chắc muốn xóa sản phẩm này khỏi đơn?")) {
          orderItems.splice(index, 1);
          renderPreview();
          showToast("Đã xóa sản phẩm");
        }
      }

      /* ================= PREVIEW ================= */
      function renderPreview() {
        const area = document.getElementById("previewArea");

        if (orderItems.length === 0) {
          area.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-light); font-style:italic;">
             Chưa có sản phẩm nào. Vui lòng thêm sản phẩm ở form phía trên.
          </div>`;
          return;
        }

        const vatRate = Number(document.getElementById("vatRate").value || 0);
        const subtotal = orderItems.reduce(
          (s, it) => s + it.totalQty * it.unitPrice,
          0,
        );
        const vatTotal = subtotal * (vatRate / 100);
        const grandTotal = subtotal + vatTotal;

        // Extract all unique sizes across all items to build dynamic headers
        const allSizesSet = new Set();
        orderItems.forEach((it) => {
          Object.keys(it.sizeData).forEach((s) => allSizesSet.add(s));
        });
        // Sort sizes logically if possible, or just alphabetically
        const allSizes = Array.from(allSizesSet).sort();

        let html = `
    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            <th rowspan="2" style="width:50px">STT</th>
            <th rowspan="2" style="width:80px">Action</th>
            <th colspan="3">Mô Tả Sản Phẩm</th>
            <th rowspan="2">Màu</th>
            ${allSizes.length > 0 ? `<th colspan="${allSizes.length}">Tỉ Lệ Size</th>` : ""}
            <th rowspan="2">SL</th>
            <th rowspan="2">Đơn Giá</th>
            <th rowspan="2">VAT (${vatRate}%)</th>
            <th rowspan="2">Thành tiền</th>
            <th rowspan="2">Thông tin NPL</th>
            <th rowspan="2">Ghi Chú</th>
          </tr>
          <tr>
            <th>Tên gọi / Mã PT</th>
            <th>Hình Ảnh</th>
            <th>Art code</th>
            ${allSizes.map((s) => `<th>${s}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
  `;

        orderItems.forEach((it, i) => {
          const lineSubtotal = it.totalQty * it.unitPrice;
          const unitVat = it.unitPrice * (vatRate / 100);
          const lineTotal = lineSubtotal + (lineSubtotal * (vatRate / 100));

          html += `
      <tr>
        <td>${i + 1}</td>
        <td>
          <button class="btn-icon btn-outline" title="Sửa" onclick="editProduct(${i})"><i class="fas fa-edit" style="color:#d97706"></i></button>
          <button class="btn-icon btn-outline" style="border-color:var(--danger)" title="Xóa" onclick="deleteProduct(${i})"><i class="fas fa-trash" style="color:var(--danger)"></i></button>
        </td>
        <td class="text-left" style="font-weight:600">${it.productName}</td>
        <td>
          ${it.imageUrl ? `<img src="${it.imageUrl}" style="max-height:60px; border-radius:4px;" onerror="this.style.display='none'">` : "-"}
        </td>
        <td>${it.artCode || "-"}</td>
        <td>${it.color || "-"}</td>
        ${allSizes.map((s) => `<td>${it.sizeData[s] ? `<b>${it.sizeData[s]}</b>` : `<span style="color:#ccc">-</span>`}</td>`).join("")}
        <td style="font-weight:bold; color:var(--primary)">${it.totalQty}</td>
        <td class="text-right">${formatMoney(it.unitPrice)}</td>
        <td class="text-right">${formatMoney(unitVat)}</td>
        <td class="text-right" style="font-weight:bold; color:var(--accent)">${formatMoney(lineTotal)}</td>
        <td>${it.nplInfo || "-"}</td>
        <td class="text-left" style="max-width:200px; white-space:normal;">${it.note || "-"}</td>
      </tr>
    `;
        });

        html += `
        </tbody>
        <tfoot>
          <tr style="background-color: var(--primary); color: white;">
            <td colspan="${6 + allSizes.length}" class="text-right" style="font-size:1.1rem"><strong>TỔNG CỘNG</strong></td>
            <td style="font-size:1.1rem"><strong>${orderItems.reduce((a, b) => a + b.totalQty, 0)}</strong></td>
            <td class="text-right" style="font-size:1.1rem"><strong>${formatMoney(subtotal)}</strong></td>
            <td class="text-right" style="font-size:1.1rem"><strong>${formatMoney(vatTotal)}</strong></td>
            <td class="text-left" colspan="3" style="font-size:1.2rem; color:var(--accent); white-space:nowrap;"><strong>${formatMoney(grandTotal)} đ</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;

        area.innerHTML = html;
      }

      /* ================= SUBMIT ================= */
      function submitOrderProcess() {
        if (orderItems.length === 0) {
          showToast("Đơn hàng phải có ít nhất 1 sản phẩm!", "error");
          return;
        }

        const company = document.getElementById("companyName").value.trim();
        const partner = document.getElementById("partnerName").value.trim();
        if (!company || !partner) {
          if (!company)
            document.getElementById("companyName").classList.add("invalid");
          if (!partner)
            document.getElementById("partnerName").classList.add("invalid");
          showToast("Vui lòng nhập đủ Tên Công Ty và Tên NCC!", "error");
          return;
        }

        document.getElementById("companyName").classList.remove("invalid");
        document.getElementById("partnerName").classList.remove("invalid");

        const vatRateNum = Number(
          document.getElementById("vatRate").value || 0,
        );
        const subtotal = orderItems.reduce(
          (s, it) => s + it.totalQty * it.unitPrice,
          0,
        );
        const vatAmount = subtotal * (vatRateNum / 100);
        const total = subtotal + vatAmount;

        const payload = {
          orderNo: document.getElementById("orderNo").value,
          orderDate: document.getElementById("orderDate").value,
          creatorName: document.getElementById("creatorName").value,
          companyName: company,
          partnerName: partner,
          partnerAddress: document.getElementById("partnerAddress").value,
          vatRate: vatRateNum,
          subtotal: subtotal,
          vatAmount: vatAmount,
          total: total,
          items: orderItems,
        };

        showSpinner("Đang lưu đơn hàng lên hệ thống...");

        
        const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxsZ0ZrQM_fVh1gD4uKQuXyaXiPHYVdZxPrXUbGc8jdIcZAHld6TZcfftVMc8rUf1rD8Q/exec";
        
        fetch(WEB_APP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'saveOrder', data: payload })
        })
        .then(response => response.json())
        .then(res => {
          hideSpinner();
          if (res.success) {
            showToast(res.message, "success");
            setTimeout(() => {
              if (confirm("Lưu thành công! Bạn có muốn làm mới form để tạo đơn mới?")) {
                window.top.location.href = window.top.location.href;
              }
            }, 1500);
          } else {
            showToast(res.message, "error");
          }
        })
        .catch(err => {
          hideSpinner();
          showToast("Lỗi kết nối: " + err.message, "error");
        });
      }

      /* ================= HISTORY ================= */
      function loadOrderHistory() {
        const area = document.getElementById("historyArea");
        area.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-light);">Đang tải dữ liệu <i class="fas fa-spinner fa-spin"></i></div>`;

        const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxsZ0ZrQM_fVh1gD4uKQuXyaXiPHYVdZxPrXUbGc8jdIcZAHld6TZcfftVMc8rUf1rD8Q/exec";
        
        fetch(WEB_APP_URL + "?action=getHistory")
          .then(response => response.json())
          .then(res => {
            if (!res.success || !res.data || res.data.length === 0) {
              area.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-light);">Chưa có đơn hàng nào trong hệ thống.</div>`;
              return;
            }
            
            const data = res.data;

            let html = `
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Ngày Tạo</th>
                <th>Mã Đơn</th>
                <th>Nhà Cung Cấp</th>
                <th>Tổng Tiền</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
      `;

            data.forEach((order) => {
              let dateStr = "";
              try {
                const d = new Date(order.timestamp);
                dateStr =
                  d.toLocaleDateString("vi-VN") +
                  " " +
                  d.toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
              } catch (e) {}

              html += `
          <tr>
            <td>${dateStr}</td>
            <td style="font-weight:600">${order.orderNo}</td>
            <td class="text-left">${order.partnerName}</td>
            <td class="text-right" style="font-weight:bold; color:var(--primary)">${formatMoney(order.total)} đ</td>
            <td><button class="btn btn-outline" style="padding:4px 8px; font-size:0.8rem">Không Hỗ Trợ Xem Item</button></td>
          </tr>
        `;
            });

            html += `</tbody></table></div>`;
            area.innerHTML = html;
          })
          .catch(err => {
            area.innerHTML = `<div style="text-align:center; padding:30px; color:var(--danger);">Lỗi tải dữ liệu: ${err.message}</div>`;
          });
      }

      /* ================= PDF EXPORT ================= */
      function exportPDF() {
        if (orderItems.length === 0) {
          showToast("Không có thông tin để xem bản in / xuất PDF!", "error");
          return;
        }

        const company =
          document.getElementById("companyName").value || "..................";
        const supplier =
          document.getElementById("partnerName").value || "..................";
        const address =
          document.getElementById("partnerAddress").value ||
          "..................";
        const orderCode = document.getElementById("orderNo").value;
        const creator = document.getElementById("creatorName").value || "..................";

        const partnerData = allPartnersData.find(p => p.tradeName === supplier);
        const repName = partnerData && partnerData.representative ? partnerData.representative.replace(/\\n/g, '<br>') : "..................";

        // Format order date dynamically
        const dtVal = document.getElementById("orderDate").value;
        let dateObj = new Date();
        if (dtVal) dateObj = new Date(dtVal);
        const dateStr = `Ngày ${String(dateObj.getDate()).padStart(2, "0")} tháng ${String(dateObj.getMonth() + 1).padStart(2, "0")} năm ${dateObj.getFullYear()}`;
        const yearStr = String(dateObj.getFullYear());
        const issueDateStr = String(dateObj.getDate()).padStart(2, "0") + "/" + String(dateObj.getMonth() + 1).padStart(2, "0") + "/" + dateObj.getFullYear();

        const vatRateNum = Number(
          document.getElementById("vatRate").value || 0,
        );

        const subtotal = orderItems.reduce(
          (s, it) => s + it.totalQty * it.unitPrice,
          0,
        );
        const vatTotal = subtotal * (vatRateNum / 100);
        const grandTotal = subtotal + vatTotal;

        const allSizesSet = new Set();
        orderItems.forEach((it) => {
          Object.keys(it.sizeData).forEach((s) => allSizesSet.add(s));
        });
        const allSizes = sortSizes(Array.from(allSizesSet));

        let tableRows = "";
        orderItems.forEach((it, i) => {
          const lineSubtotal = it.totalQty * it.unitPrice;
          const unitVat = it.unitPrice * (vatRateNum / 100);
          const lineVatAmt = lineSubtotal * (vatRateNum / 100);
          const lineTotal = lineSubtotal + lineVatAmt;

          // Convert delivery date
          let delStr = "";
          if (it.deliveryDate) {
            delStr = new Date(it.deliveryDate).toLocaleDateString("vi-VN");
          }

          tableRows += `
      <tr>
        <td>${i + 1}</td>
        <td class="text-left"><b>${it.productName}</b></td>
        <td>${it.imageUrl ? `<img src="${it.imageUrl}" class="td-img">` : ""}</td>
        <td>${it.artCode || ""}</td>
        <td>${it.color || ""}</td>
        ${allSizes.map((s) => `<td class="${it.sizeData[s] ? "" : "empty-td"}">${it.sizeData[s] || ""}</td>`).join("")}
        <td><b>${it.totalQty}</b></td>
        <td class="text-right">${formatMoney(it.unitPrice)}</td>
        <td class="text-right">${formatMoney(unitVat)}</td>
        <td class="text-right" style="font-weight:bold">${formatMoney(lineTotal)}</td>
        <td>${it.nplInfo || ""}</td>
        <td>${delStr}</td>
        <td class="text-left note-td">${it.note || ""}</td>
      </tr>
    `;
        });

        const printWindow = window.open("", "_blank");

        printWindow.document.write(`
  <!DOCTYPE html>
  <html>
  <head>
  <meta charset="utf-8">
  <title>${orderCode} - ĐƠN ĐẶT HÀNG</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800&display=swap');
    
    @page { 
      size: landscape; 
      margin: 10mm 10mm; 
    }
    
    body {
      font-family: 'Lexend', sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #000;
      background: #fff;
      padding: 0;
      margin: 0;
    }

    .doc-container {
      width: 100%;
      max-width: 1300px;
      margin: 0 auto;
    }

    /* HEADER */
    .header {
      display: grid;
      grid-template-columns: 109px 1fr 109px;
      align-items: center;
      margin-bottom: 20px;
      background-color: #151c32;
      padding: 10px 20px;
      border-radius: 4px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .logo-box {
      justify-self: start;
      background-color: #151c32;
      padding: 0;
      border-radius: 0;
      border: none;
      box-shadow: none;
      overflow: hidden;
      width: 68px;
      height: 68px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      left: -10px;
      margin-left: 0;
    }
    .logo-box img {
      border: none;
      box-shadow: none;
      display: block;
      width: auto;
      height: 100%;
      max-height: none;
      object-fit: contain;
      object-position: center;
      transform: scale(1.0);
      transform-origin: center center;
      background: transparent;
    }

    .company-center {
      justify-self: center;
      text-align: center;
    }
    .company-center .dept-name {
      font-family: 'Lexend', sans-serif;
      font-size: 11px;
      font-weight: 500;
      color: #ffffff;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin: 0 0 2px 0;
    }
    .company-center h1 {
      font-family: 'Lexend', sans-serif;
      font-size: 19px;
      font-weight: 700;
      margin: 0 0 2px 0;
      color: #ffffff;
      letter-spacing: 3px;
      text-transform: uppercase;
    }
    .company-center .order-code {
      font-family: 'Lexend', sans-serif;
      font-size: 11px;
      font-weight: 600;
      color: #ffffff;
      letter-spacing: 1px;
    }

    .company-right {
      justify-self: end;
      text-align: right;
      color: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .company-right .year-text {
      font-family: 'Lexend', sans-serif;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1px;
      line-height: 1;
      margin-bottom: 5px;
    }
    .company-right .order-code-right {
      font-family: 'Lexend', sans-serif;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1px;
      white-space: nowrap;
    }

    /* FOOTER */
    .footer {
      display: grid;
      grid-template-columns: 1fr 1.5fr 1fr;
      align-items: center;
      margin-top: 40px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
      font-size: 9px;
      color: #555;
      page-break-inside: avoid;
    }
    .footer-left { text-align: left; line-height: 1.6; }
    .footer-center { text-align: center; line-height: 1.4; }
    .footer-right { text-align: right; font-size: 10px; font-weight: 600; }
    .footer-left strong, .footer-center strong { color: #333; }

    /* TITLE - now integrated into header */

    /* INFO */
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      font-size: 12px;
    }
    .supplier-info { width: 70%; line-height: 1.6; }
    
    .intro-text {
      margin-bottom: 15px;
      font-style: italic;
    }

    /* TABLE */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      table-layout: auto; /* allows flexible column sizing */
    }
    th, td {
      border: 1px solid #757575;
      padding: 6px 4px;
      text-align: center;
      word-wrap: break-word;
    }
    th {
      background-color: #f0f0f0 !important;
      font-weight: bold;
      -webkit-print-color-adjust: exact;
    }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .td-img { max-width: 45px; max-height: 60px; object-fit: contain; }
    .empty-td { color: #ccc; }
    .note-td { font-size: 9px; line-height: 1.2; word-break: break-word; }
    
    /* COL WIDTHS */
    thead tr:first-child th:nth-child(1) { width: 4%; } /* STT */
    thead tr:first-child th:nth-child(3) { width: 5%; } /* Màu */
    thead tr:nth-child(2) th:nth-child(1) { width: 15%; } /* Tên SP */
    thead tr:nth-child(2) th:nth-child(2) { width: 7%; } /* Hình */
    thead tr:nth-child(2) th:nth-child(3) { width: 8%; } /* Art Code */
    /* Dynamic sizes get remaining equal width */
    
    tr:nth-child(even) { background-color: #fafafa !important; -webkit-print-color-adjust: exact; }

    /* TERMS */
    .terms {
      margin-bottom: 30px;
      line-height: 1.6;
    }
    .terms p { margin: 5px 0; }
    .highlight-term { font-weight: bold; text-decoration: underline; }

    /* SIGS */
    .signature-area {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
      page-break-inside: avoid;
    }
    .sig-box {
      flex: 1;
      padding: 0 5px;
      text-align: center;
    }
    .sig-role {
      font-weight: bold;
      margin-bottom: 80px;
      font-size: 12px;
    }
    .sig-date {
      font-style: italic;
      margin-bottom: 5px;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
  </head>

  <body onload="setTimeout(function(){window.print();}, 500)">
  <div class="doc-container">

    <div class="header">
      <div class="logo-box" style="width: 109px; height: 109px; overflow: hidden; display: flex; align-items: center; justify-content: center; margin-left: 10px;">
         <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA+gAAAPoCAYAAABNo9TkAAAAtGVYSWZJSSoACAAAAAYAEgEDAAEAAAABAAAAGgEFAAEAAABWAAAAGwEFAAEAAABeAAAAKAEDAAEAAAACAAAAEwIDAAEAAAABAAAAaYcEAAEAAABmAAAAAAAAADwAAAABAAAAPAAAAAEAAAAGAACQBwAEAAAAMDIxMAGRBwAEAAAAAQIDAACgBwAEAAAAMDEwMAGgAwABAAAA//8AAAKgBAABAAAA6AMAAAOgBAABAAAA6AMAAAAAAADQzAofAAAACXBIWXMAAAk6AAAJOgHwZJJKAAAFYGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSfvu78nIGlkPSdXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQnPz4KPHg6eG1wbWV0YSB4bWxuczp4PSdhZG9iZTpuczptZXRhLyc+CjxyZGY6UkRGIHhtbG5zOnJkZj0naHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyc+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpBdHRyaWI9J2h0dHA6Ly9ucy5hdHRyaWJ1dGlvbi5jb20vYWRzLzEuMC8nPgogIDxBdHRyaWI6QWRzPgogICA8cmRmOlNlcT4KICAgIDxyZGY6bGkgcmRmOnBhcnNlVHlwZT0nUmVzb3VyY2UnPgogICAgIDxBdHRyaWI6Q3JlYXRlZD4yMDI2LTA0LTAzPC9BdHRyaWI6Q3JlYXRlZD4KICAgICA8QXR0cmliOkRhdGE+eyZxdW90O2RvYyZxdW90OzomcXVvdDtEQUc1cXlRbU9rUSZxdW90OywmcXVvdDt1c2VyJnF1b3Q7OiZxdW90O1VBR0doU0J6cnpvJnF1b3Q7LCZxdW90O2JyYW5kJnF1b3Q7OiZxdW90O0JBR0doVGVKSmlRJnF1b3Q7fTwvQXR0cmliOkRhdGE+CiAgICAgPEF0dHJpYjpFeHRJZD4yYTY3YmY0NS1hNzNhLTQ5MjEtOTVhYi1hYjE1YzVmNWM2OTU8L0F0dHJpYjpFeHRJZD4KICAgICA8QXR0cmliOkZiSWQ+NTI1MjY1OTE0MTc5NTgwPC9BdHRyaWI6RmJJZD4KICAgICA8QXR0cmliOlRvdWNoVHlwZT4yPC9BdHRyaWI6VG91Y2hUeXBlPgogICAgPC9yZGY6bGk+CiAgIDwvcmRmOlNlcT4KICA8L0F0dHJpYjpBZHM+CiA8L3JkZjpEZXNjcmlwdGlvbj4KCiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0nJwogIHhtbG5zOmRjPSdodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyc+CiAgPGRjOnRpdGxlPgogICA8cmRmOkFsdD4KICAgIDxyZGY6bGkgeG1sOmxhbmc9J3gtZGVmYXVsdCc+TuG7mWkgZHVuZyDEkW/huqFuIHbEg24gYuG6o24gY+G7p2EgYuG6oW4gLSAxPC9yZGY6bGk+CiAgIDwvcmRmOkFsdD4KICA8L2RjOnRpdGxlPgogPC9yZGY6RGVzY3JpcHRpb24+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpwZGY9J2h0dHA6Ly9ucy5hZG9iZS5jb20vcGRmLzEuMy8nPgogIDxwZGY6QXV0aG9yPkR1eSBExrDGoW5nIEzDqjwvcGRmOkF1dGhvcj4KIDwvcmRmOkRlc2NyaXB0aW9uPgoKIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PScnCiAgeG1sbnM6eG1wPSdodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvJz4KICA8eG1wOkNyZWF0b3JUb29sPkNhbnZhIGRvYz1EQUc1cXlRbU9rUSB1c2VyPVVBR0doU0J6cnpvIGJyYW5kPUJBR0doVGVKSmlRPC94bXA6Q3JlYXRvclRvb2w+CiA8L3JkZjpEZXNjcmlwdGlvbj4KPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KPD94cGFja2V0IGVuZD0ncic/PiM/m+IAACAASURBVHic7N13uGxnWTdgk3PSE0ggAUJJ6EIIECAiUkNRuuJHFwSpHygqioggHRGRqlSR3hH8kCIgiLFQjCACQkJCCSSkF9LLOWfP8z3vedfKzNk5J2dm9sysmT33fV2/a4eQvfdaa2b/8Zu3/dzPAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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hBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBD/3x4cEAAAAAAI+f+6IQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAG4CD+lsqYVNIhsAAAAASUVORK5CYII="
              referrerpolicy="no-referrer" onerror="this.style.display='none'"
              style="width: auto; height: 80%; max-width: 100%; max-height: 100%; object-fit: contain; object-position: center; transform: none;">
      </div>
      <div class="company-center">
        <div class="dept-name">PHÒNG NGHIÊN CỨU & PHÁT TRIỂN SẢN PHẨM POLOMANOR</div>
        <h1>ĐƠN ĐẶT HÀNG</h1>
      </div>
      <div class="company-right">
        <div class="year-text">${yearStr}</div>
        <div class="order-code-right">MÃ ĐƠN: ${orderCode}</div>
      </div>
    </div>

    <div class="info-section">
      <div class="supplier-info">
        <table style="border:none; margin:0;" width="100%">
           <tr><td style="border:none; text-align:left; width:100px; padding:2px"><b>Kính gửi Cty:</b></td><td style="border:none; text-align:left; padding:2px; font-weight:bold">${company}</td></tr>
           <tr><td style="border:none; text-align:left; padding:2px"><b>Người đại diện:</b></td><td style="border:none; text-align:left; padding:2px">${repName}</td></tr>
           <tr><td style="border:none; text-align:left; padding:2px"><b>Địa chỉ:</b></td><td style="border:none; text-align:left; padding:2px">${address}</td></tr>
        </table>
      </div>
    </div>

    <div class="intro-text">
       Chúng tôi chân thành cảm ơn sự hợp tác của Quý công ty trong thời gian vừa qua.<br>
       Hiện nay, Polomanor có nhu cầu đặt hàng sản xuất các sản phẩm với thông tin chi tiết như sau:
    </div>

    <table>
      <thead>
        <tr>
          <th rowspan="2">STT</th>
          <th colspan="3">Mô Tả Sản Phẩm</th>
          <th rowspan="2">Màu</th>
          ${allSizes.length > 0 ? `<th colspan="${allSizes.length}">Tỉ Lệ Size</th>` : ""}
          <th rowspan="2">SL</th>
          <th rowspan="2">Đơn Giá</th>
          <th rowspan="2">VAT (${vatRateNum}%)</th>
          <th rowspan="2">Thành tiền</th>
          <th rowspan="2">Thông tin NPL</th>
          <th rowspan="2">T.Gian Giao</th>
          <th rowspan="2">Ghi Chú</th>
        </tr>
        <tr>
          <th>Tên gọi SP / Mã PT</th>
          <th>Hình SP</th>
          <th>Art Code</th>
          ${allSizes.map((s) => `<th>${s}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="${5 + allSizes.length}" class="text-right"><strong>TỔNG CỘNG</strong></td>
          <td><strong>${orderItems.reduce((a, b) => a + b.totalQty, 0)}</strong></td>
          <td class="text-right"><strong>${formatMoney(subtotal)}</strong></td>
          <td class="text-right"><strong>${formatMoney(vatTotal)}</strong></td>
          <td class="text-left" colspan="4" style="font-weight:bold; font-size:12px; white-space:nowrap;"><strong>${formatMoney(grandTotal)} đ</strong></td>
        </tr>
      </tfoot>
    </table>

    <div class="terms">
      <p><span class="highlight-term">1. Giá cả và Phương thức thanh toán:</span></p>
      ${(function() {
        // Look up partner-specific payment terms from column O
        const pd = allPartnersData.find(p => p.tradeName === supplier);
        if (pd && pd.paymentTermsOrder && pd.paymentTermsOrder.trim()) {
          // Convert newlines to <br> for proper HTML rendering
          return pd.paymentTermsOrder.split('\n').map(line => '<p>' + line.trim() + '</p>').join('');
        }
        // Fallback generic terms if no data found
        return '<p>- Đơn giá đã bao gồm chi phí vận chuyển nội thành TP.HCM, chưa bao gồm VAT.</p>' +
               '<p>- Hình thức thanh toán: Chuyển khoản (Được thanh toán theo mức công nợ gối đầu đã thỏa thuận).</p>';
      })()}
      
      <p style="margin-top:15px"><span class="highlight-term">2. Điều kiện giao hàng & Chất lượng:</span></p>
      ${(function() {
        // Look up partner-specific delivery terms from column P
        const pd = allPartnersData.find(p => p.tradeName === supplier);
        if (pd && pd.deliveryTerms && pd.deliveryTerms.trim()) {
          return pd.deliveryTerms.split('\n').map(line => {
            const trimmed = line.trim();
            if (!trimmed) return '';
            // Italicize lines starting with "**" (Lưu ý) or "- Đơn đặt hàng này"
            if (trimmed.startsWith('**') || trimmed.startsWith('- Đơn đặt hàng này')) {
              return '<p><em>' + trimmed + '</em></p>';
            }
            return '<p>' + trimmed + '</p>';
          }).join('');
        }
        // Fallback generic terms if no data found
        return '<p>- Giao đúng tiến độ theo đơn đặt hàng.</p>' +
               '<p>- Địa điểm giao: Kho Polomanor số 131/100D Đường 26/3 P.Bình Hưng Hoà, Quận Bình Tân, TPHCM.</p>' +
               '<p>- Hàng hóa giao phải đúng thiết kế, tài liệu kỹ thuật rập, thông số, đáp ứng 100% tiêu chuẩn chất lượng và quy cách đóng gói của Polomanor.</p>' +
               '<p>- Các lô hàng phát sinh lỗi do nhà sản xuất sẽ được xử lý bồi thường theo Điều khoản Hợp đồng Nguyên tắc đã ký kết.</p>';
      })()}
    </div>

    <div class="signature-area">
      <div class="sig-box">
        <div class="sig-date">&nbsp;</div>
        <div class="sig-role">ĐẠI DIỆN NHÀ CUNG CẤP<br><span style="font-weight:normal;font-size:11px">(Ký, ghi rõ họ tên và đóng dấu)</span></div>
        <div style="font-weight:bold; font-size:12px;">${repName}</div>
      </div>

      <div class="sig-box">
        <div class="sig-date">${dateStr}</div>
        <div class="sig-role">ĐẠI DIỆN POLOMANOR<br><span style="font-weight:normal;font-size:11px">(Người lập đơn ký và ghi rõ họ tên)</span></div>
        <div style="font-weight:bold; font-size:12px;">${creator}</div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-left">
        <strong>VPDD:</strong> 42/60/78 Hồ Đắc Di, P.Tây Thạnh, Q.Tân Phú, TPHCM<br>
        <strong>Kho:</strong> 131/100D Đường 26/3, P.Bình Hưng Hoà, Q.Bình Tân, TPHCM<br>
        <strong>Email:</strong> product@polomanor.vn
      </div>
      <div class="footer-center">
        <strong>© Polomanor</strong><br>
        Đơn hàng này thuộc phạm vi trao đổi và lưu trữ giữa Polomanor và nhà máy sản xuất.<br>
        Nghiêm cấm cung cấp, chia sẻ hoặc phát tán ra ngoài tổ chức dưới mọi hình thức.
      </div>
      <div class="footer-right">
        Issued Date: ${issueDateStr}
      </div>
    </div>

  </div>
  </body>
  </html>
  `);

        printWindow.document.close();
      }
    