const SPREADSHEET_ID = '1tH11Kr6tlG1sChsjMfP9LUN_aRfbqer0Gm9U2n7HK94';

/**
 * Kiểm tra đăng nhập
 */
function checkLogin(username, password) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let userSheet = ss.getSheetByName("users");
    
    // Khởi tạo sheet users nếu chưa có
    if (!userSheet) {
      userSheet = ss.insertSheet("users");
      userSheet.getRange(1, 1, 1, 3).setValues([["Username", "Password", "Role"]]);
      userSheet.getRange("A1:C1").setFontWeight("bold").setBackground("#ead1dc");
      // Tạo tài khoản mặc định
      userSheet.appendRow(["admin", "admin", "admin"]);
      userSheet.setFrozenRows(1);
    } else {
       // Kiểm tra xem đã có cột Role chưa, nếu chưa thì thêm
       const lastCol = userSheet.getLastColumn();
       if (lastCol < 3) {
         userSheet.getRange(1, 3).setValue("Role");
         userSheet.getRange(1, 3).setFontWeight("bold").setBackground("#ead1dc");
         // Gán mặc định là admin cho các user cũ
         const lastRow = userSheet.getLastRow();
         if (lastRow > 1) {
            const roles = [];
            for(let i=0; i<lastRow-1; i++) roles.push(["admin"]);
            userSheet.getRange(2, 3, lastRow-1, 1).setValues(roles);
         }
       }
    }
    
    const data = userSheet.getDataRange().getValues();
    const u = String(username).trim();
    const p = String(password).trim();

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === u && String(data[i][1]).trim() === p) {
        return {
          success: true,
          username: data[i][0],
          role: data[i][2] || 'admin' // Mặc định là admin nếu trống
        };
      }
    }
    return { success: false, message: "Sai tài khoản hoặc mật khẩu!" };
  } catch (err) {
    return { success: false, message: "Lỗi Server: " + err.toString() };
  }
}

function saveOrderData(payload) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 1. Lưu thông tin chung vào tab data_order
    let orderSheet = ss.getSheetByName("data_order");
    const ORDER_HEADERS = ["Thời gian lưu", "Mã đơn hàng", "Ngày đặt hàng", "Người tạo", "Công ty", "Nhà cung cấp", "Địa chỉ NCC", "Thuế VAT (%)", "Tổng tạm tính", "Tiền VAT", "Tổng cộng", "PO Tháng", "Trạng thái Vải", "Hạn Duyệt (D+18)", "Hạn Cắt Vải (D+21)", "Hạn Lên Chuyền (D+22)", "Hạn Hoàn Thành (D+27)", "Trạng thái Bo", "Trạng thái NPL", "Ngày Đồng Bộ", "Ghi Chú", "Tổng SL", "Danh sách SP", "Danh sách Màu"];
    if (!orderSheet) {
      orderSheet = ss.insertSheet("data_order");
    }
    
    // Always update headers
    orderSheet.getRange(1, 1, 1, ORDER_HEADERS.length).setValues([ORDER_HEADERS]);
    orderSheet.getRange(1, 1, 1, ORDER_HEADERS.length).setFontWeight("bold").setBackground("#d0e0e3");
    orderSheet.setFrozenRows(1);
    
    const timestamp = new Date();
    const orderDataRange = orderSheet.getDataRange().getValues();
    let orderRowIndex = -1;
    for (let i = 1; i < orderDataRange.length; i++) {
      if (String(orderDataRange[i][1]).trim() === String(payload.orderNo).trim()) {
        orderRowIndex = i + 1;
        break;
      }
    }
    
    let d18 = "", d21 = "", d22 = "", d27 = "";
    if (payload.orderDate) {
      let baseDate = new Date(payload.orderDate);
      if (!isNaN(baseDate.getTime())) {
         let calc = (days) => {
             let d = new Date(baseDate);
             d.setDate(d.getDate() + days);
             return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
         };
         d18 = calc(18); d21 = calc(21); d22 = calc(22); d27 = calc(27);
      }
    }

    let statusVai = "Pending", statusBo = "Pending", statusNpl = "Pending";
    if (orderRowIndex !== -1) {
       let existingData = orderDataRange[orderRowIndex - 1];
       if (existingData[12]) statusVai = existingData[12];
       if (existingData[13]) d18 = existingData[13];
       if (existingData[14]) d21 = existingData[14];
       if (existingData[15]) d22 = existingData[15];
       if (existingData[16]) d27 = existingData[16];
       if (existingData[17]) statusBo = existingData[17];
       if (existingData[18]) statusNpl = existingData[18];
    }

    // Tính tổng số lượng, danh sách sản phẩm và chi tiết màu
    let totalQty = 0;
    let products = [];
    let colorCombos = [];
    if (payload.items) {
      payload.items.forEach(it => {
        totalQty += (Number(it.totalQty) || 0);
        const p = it.productName || "SP";
        const c = it.color || "Không màu";
        if (!products.includes(p)) products.push(p);
        const combo = `${p} (${c})`;
        if (!colorCombos.includes(combo)) colorCombos.push(combo);
      });
    }
    const productSummary = products.join(", ");
    const colorSummary = colorCombos.join(", ");

    const orderRowValues = [
      timestamp, payload.orderNo, payload.orderDate, payload.creatorName, payload.companyName,
      payload.partnerName, payload.partnerAddress, payload.vatRate, payload.subtotal,
      payload.vatAmount, payload.total, payload.poMonth || "",
      statusVai, d18, d21, d22, d27, statusBo, statusNpl,
      orderRowIndex !== -1 && orderDataRange[orderRowIndex - 1][19] ? orderDataRange[orderRowIndex - 1][19] : "",
      orderRowIndex !== -1 && orderDataRange[orderRowIndex - 1][20] ? orderDataRange[orderRowIndex - 1][20] : "",
      totalQty, productSummary, colorSummary
    ];
    
    if (orderRowIndex !== -1) {
      orderSheet.getRange(orderRowIndex, 1, 1, orderRowValues.length).setValues([orderRowValues]);
    } else {
      orderSheet.appendRow(orderRowValues);
    }
    
    // 2. Lưu thông tin chi tiết từng sản phẩm
    let detailSheet = ss.getSheetByName("data_order_details");
    const FIXED_HEADERS = ["Mã đơn hàng", "Tên SP", "Art Code", "Màu", "Tổng SL", "Đơn giá", "Thành tiền (trước VAT)", "Thông tin NPL", "T.Gian Giao", "Ghi Chú", "Trạng thái Vải", "Trạng thái Bo", "Đồng bộ NPL", "Ngày đồng bộ", "Ghi chú duyệt"];
    if (!detailSheet) {
      detailSheet = ss.insertSheet("data_order_details");
      detailSheet.getRange(1, 1, 1, FIXED_HEADERS.length).setValues([FIXED_HEADERS]);
      detailSheet.getRange(1, 1, 1, FIXED_HEADERS.length).setFontWeight("bold").setBackground("#fff2cc");
      detailSheet.setFrozenRows(1);
    }
    
    // Đọc header hiện tại để hỗ trợ cột size động
    let lastCol = detailSheet.getLastColumn();
    let currentHeaders = [];
    let headerChanged = false;

    if (lastCol === 0) {
        // Sheet mới tinh hoặc đã bị xóa trắng
        currentHeaders = [...FIXED_HEADERS];
        headerChanged = true;
    } else {
        lastCol = Math.max(lastCol, FIXED_HEADERS.length);
        currentHeaders = detailSheet.getRange(1, 1, 1, lastCol).getValues()[0];
        
        // Cứu vãn trường hợp người dùng xóa mất dòng header đầu tiên
        if (currentHeaders[0] === "") {
            for (let i = 0; i < FIXED_HEADERS.length; i++) {
                currentHeaders[i] = FIXED_HEADERS[i];
            }
            headerChanged = true;
        }
        
        // Loại bỏ các cột trống ở cuối (nếu có)
        while(currentHeaders.length > FIXED_HEADERS.length && currentHeaders[currentHeaders.length - 1] === "") {
            currentHeaders.pop();
        }
    }
    
    const items = payload.items || [];
    const rowsToAppend = [];
    
    // Nếu là edit, xóa toàn bộ các dòng chi tiết cũ của PO này
    const detailsDataRange = detailSheet.getDataRange().getValues();
    for (let i = detailsDataRange.length - 1; i >= 1; i--) {
      if (String(detailsDataRange[i][0]).trim() === String(payload.orderNo).trim()) {
        detailSheet.deleteRow(i + 1);
      }
    }
    
    // Hàm chuẩn hóa size - gộp size chữ và size số vào cùng cột
    // Kết quả: S, M/29, L/30, XL/31, XXL/32, 34
    function normalizeSize(size) {
      let s = String(size).toUpperCase().trim();
      s = s.replace(/\.0$/, '');
      if (s === 'S') return 'S';
      if (s === 'M' || s === '29') return 'M/29';
      if (s === 'L' || s === '30') return 'L/30';
      if (s === 'XL' || s === '31') return 'XL/31';
      if (s === 'XXL' || s === '2XL' || s === '32') return 'XXL/32';
      if (s === '34') return '34';
      if (s === 'FREESIZE') return 'FREE';
      return s;
    }

    // Thứ tự cột size cố định
    const SIZE_ORDER = ['S', 'M/29', 'L/30', 'XL/31', 'XXL/32', '34', 'FREE'];

    // Quét qua tất cả các size để thêm cột mới vào header nếu cần
    const neededSizes = new Set();
    items.forEach(it => {
       if (it.sizeData) {
           Object.keys(it.sizeData).forEach(sizeName => {
               neededSizes.add(normalizeSize(sizeName));
           });
       }
    });

    // Thêm các size mới theo đúng thứ tự cố định
    SIZE_ORDER.forEach(sizeKey => {
        const colName = "Size " + sizeKey;
        if (neededSizes.has(sizeKey) && !currentHeaders.includes(colName)) {
            currentHeaders.push(colName);
            headerChanged = true;
        }
    });
    // Size ngoại lệ (không nằm trong bộ chuẩn) thêm vào cuối
    neededSizes.forEach(sizeKey => {
        const colName = "Size " + sizeKey;
        if (!currentHeaders.includes(colName)) {
            currentHeaders.push(colName);
            headerChanged = true;
        }
    });
    
    if (headerChanged) {
        detailSheet.getRange(1, 1, 1, currentHeaders.length).setValues([currentHeaders]);
        detailSheet.getRange(1, 1, 1, currentHeaders.length).setFontWeight("bold").setBackground("#fff2cc");
    }
    
    items.forEach(it => {
      const lineSubtotal = it.totalQty * it.unitPrice;
      
      // Định dạng ngày giao hàng nếu có
      let deliveryDateStr = it.deliveryDate;
      if (it.deliveryDate) {
         try { 
            deliveryDateStr = Utilities.formatDate(new Date(it.deliveryDate), "GMT+7", "yyyy-MM-dd");
         } catch(e) {}
      }

      // Khởi tạo dòng dữ liệu tương ứng với số lượng cột hiện tại
      const rowData = new Array(currentHeaders.length).fill("");
      
      // Điền thông tin cố định
      rowData[0] = payload.orderNo;
      rowData[1] = it.productName;
      rowData[2] = it.artCode;
      rowData[3] = it.color;
      rowData[4] = it.totalQty;
      rowData[5] = it.unitPrice;
      rowData[6] = lineSubtotal;
      rowData[7] = it.nplInfo;
      rowData[8] = deliveryDateStr;
      rowData[9] = it.note;
      
      // Mặc định các cột duyệt là Pending
      if (currentHeaders.indexOf("Trạng thái Vải") >= 0) rowData[currentHeaders.indexOf("Trạng thái Vải")] = "Pending";
      if (currentHeaders.indexOf("Trạng thái Bo") >= 0) rowData[currentHeaders.indexOf("Trạng thái Bo")] = "Pending";
      if (currentHeaders.indexOf("Đồng bộ NPL") >= 0) rowData[currentHeaders.indexOf("Đồng bộ NPL")] = "Pending";
      
      // Điền thông tin size vào đúng cột tương ứng
      if (it.sizeData) {
          Object.keys(it.sizeData).forEach(sizeName => {
              const normSize = normalizeSize(sizeName);
              const colName = "Size " + normSize;
              const idx = currentHeaders.indexOf(colName);
              if (idx !== -1) {
                  rowData[idx] = it.sizeData[sizeName];
              }
          });
      }
      
      rowsToAppend.push(rowData);
    });
    
    if (rowsToAppend.length > 0) {
      detailSheet.getRange(detailSheet.getLastRow() + 1, 1, rowsToAppend.length, currentHeaders.length).setValues(rowsToAppend);
    }
    
    return {
      success: true,
      message: "Lưu đơn hàng thành công!"
    };
    
  } catch (error) {
    return {
      success: false,
      message: error.message || String(error)
    };
  }
}

function getOrderHistory() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const orderSheet = ss.getSheetByName("data_order");
    if (!orderSheet) return [];
    
    const data = orderSheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    const results = [];
    const seenOrders = new Set();
    
    for (let i = data.length - 1; i > 0; i--) {
      const orderNo = String(data[i][1]).trim();
      if (!orderNo || seenOrders.has(orderNo)) continue;
      seenOrders.add(orderNo);
      
      // Xử lý định dạng tháng (nếu là Date object từ Sheet)
      let m = data[i][11] || "";
      if (m instanceof Date) {
        m = (m.getMonth() + 1) + "/" + m.getFullYear();
      } else if (String(m).includes("T") && !isNaN(Date.parse(m))) {
        let d = new Date(m);
        m = (d.getMonth() + 1) + "/" + d.getFullYear();
      }

      results.push({
        timestamp: data[i][0],
        orderNo: orderNo,
        orderDate: data[i][2],
        creatorName: data[i][3],
        companyName: data[i][4],
        partnerName: data[i][5],
        total: data[i][10] || 0,
        poMonth: m,
        statusVai: data[i][12] || "Pending",
        benchmarkD18: data[i][13] || "",
        benchmarkD21: data[i][14] || "",
        benchmarkD22: data[i][15] || "",
        benchmarkD27: data[i][16] || "",
        statusBo: data[i][17] || "Pending",
        statusNpl: data[i][18] || "Pending",
        syncDate: data[i][19] || "",
        syncNote: data[i][20] || "",
        totalQty: data[i][21] || 0,
        productSummary: data[i][22] || "",
        colorSummary: data[i][23] || ""
      });
    }
    return results;
  } catch (err) {
    return [];
  }
}

/**
 * HÀM CHẠY 1 LẦN: Cập nhật thông tin tổng hợp cho các đơn hàng cũ
 * Bạn hãy chọn hàm này trong danh sách và bấm "Chạy" trong trình soạn thảo Apps Script.
 */
function migrateOrderSummaries() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const orderSheet = ss.getSheetByName("data_order");
  const detailSheet = ss.getSheetByName("data_order_details");
  if (!orderSheet || !detailSheet) return "Không tìm thấy sheet";
  
  const orderData = orderSheet.getDataRange().getValues();
  const detailData = detailSheet.getDataRange().getValues();
  
  const headers = orderData[0];
  if (headers.length < 24) {
    orderSheet.getRange(1, 22).setValue("Tổng SL");
    orderSheet.getRange(1, 23).setValue("Danh sách SP");
    orderSheet.getRange(1, 24).setValue("Danh sách Màu");
  }
  
  for (let i = 1; i < orderData.length; i++) {
    const orderNo = orderData[i][1];
    let totalQty = 0;
    let products = [];
    let colorCombos = [];
    
    // Tìm các dòng chi tiết của PO này
    for (let j = 1; j < detailData.length; j++) {
      if (String(detailData[j][0]).trim() === String(orderNo).trim()) {
        totalQty += (Number(detailData[j][4]) || 0);
        const p = detailData[j][1] || "SP";
        const c = detailData[j][3] || "Không màu";
        if (!products.includes(p)) products.push(p);
        const combo = `${p} (${c})`;
        if (!colorCombos.includes(combo)) colorCombos.push(combo);
      }
    }
    
    orderSheet.getRange(i + 1, 22).setValue(totalQty);
    orderSheet.getRange(i + 1, 23).setValue(products.join(", "));
    orderSheet.getRange(i + 1, 24).setValue(colorCombos.join(", "));
  }
  return "Cập nhật thành công " + (orderData.length - 1) + " đơn hàng!";
}

function getOrderDetails(orderNo) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const detailSheet = ss.getSheetByName("data_order_details");
    if (!detailSheet) return [];
    
    const data = detailSheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    const headers = data[0];
    const results = [];
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(orderNo)) {
        let rowObj = {};
        for (let j = 0; j < headers.length; j++) {
           if (headers[j]) {
             rowObj[headers[j]] = data[i][j];
           }
        }
        results.push(rowObj);
      }
    }
    
    return results;
  } catch (err) {
    return [];
  }
}

function getAllOrderDetails() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const detailSheet = ss.getSheetByName("data_order_details");
    if (!detailSheet) return [];
    
    const data = detailSheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    const headers = data[0];
    const results = [];
    
    for (let i = 1; i < data.length; i++) {
      let rowObj = {};
      for (let j = 0; j < headers.length; j++) {
         if (headers[j]) {
           rowObj[headers[j]] = data[i][j];
         }
      }
      results.push(rowObj);
    }
    
    return results;
  } catch (err) {
    return [];
  }
}


/**
 * HÀM CHẠY 1 LẦN: Sửa lỗi ngày tháng bị đảo ngược (MM/DD thay vì DD/MM) do Google Sheets
 * Chọn hàm này và bấm "Chạy" để tự động tìm và sửa các ngày bị sai.
 */
function fixAllSwappedDates() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const detailSheet = ss.getSheetByName("data_order_details");
  const data = detailSheet.getDataRange().getValues();
  let updated = 0;
  
  for (let i = 1; i < data.length; i++) {
    const rawVal = data[i][8]; // T.Gian Giao
    if (rawVal instanceof Date) {
      // Ví dụ: Nhập 05/06/2026 (5 tháng 6) nhưng bị Sheets hiểu là May 6 (mùng 6 tháng 5).
      // Nếu ngày < 12 và tháng < 12, có khả năng bị ngược.
      // Tuy nhiên an toàn nhất là đồng bộ lại từ chuỗi ban đầu nếu có.
      // Hoặc ta format lại:
      // Nhưng ta không biết chắc nó có bị ngược không nếu Day và Month đều < 12.
    }
  }
}


function saveNplApproval(payload) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const detailSheet = ss.getSheetByName("data_order_details");
    if (!detailSheet) return { success: false, message: "Không tìm thấy tab chi tiết đơn hàng." };
    
    const headers = detailSheet.getRange(1, 1, 1, detailSheet.getLastColumn()).getValues()[0];
    const data = detailSheet.getDataRange().getValues();
    let targetRow = -1;
    
    // Tìm đúng dòng khớp Mã PO + Tên SP + Màu
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(payload.orderNo).trim() && 
          String(data[i][1]).trim() === String(payload.productName).trim() && 
          String(data[i][3]).trim() === String(payload.color).trim()) {
        targetRow = i + 1;
        break;
      }
    }
    
    if (targetRow === -1) {
      return { success: false, message: "Không tìm thấy sản phẩm/màu sắc này trong đơn hàng." };
    }
    
    // Xác định vị trí các cột duyệt
    const colVai = headers.indexOf("Trạng thái Vải") + 1;
    const colBo = headers.indexOf("Trạng thái Bo") + 1;
    const colNpl = headers.indexOf("Đồng bộ NPL") + 1;
    const colDate = headers.indexOf("Ngày đồng bộ") + 1;
    const colNote = headers.indexOf("Ghi chú duyệt") + 1;
    
    // Cập nhật các cột trạng thái duyệt
    if (payload.statusVai !== undefined && colVai > 0) detailSheet.getRange(targetRow, colVai).setValue(payload.statusVai);
    if (payload.statusBo !== undefined && colBo > 0) detailSheet.getRange(targetRow, colBo).setValue(payload.statusBo);
    if (payload.statusNpl !== undefined && colNpl > 0) detailSheet.getRange(targetRow, colNpl).setValue(payload.statusNpl);
    if (payload.syncDate !== undefined && colDate > 0) detailSheet.getRange(targetRow, colDate).setValue(payload.syncDate);
    if (payload.syncNote !== undefined && colNote > 0) detailSheet.getRange(targetRow, colNote).setValue(payload.syncNote);
    
    return { success: true, message: "Cập nhật trạng thái duyệt SP thành công." };
    
  } catch (err) {
    return { success: false, message: "Lỗi Server: " + err.toString() };
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    
    if (payload.action === 'login') {
      const result = checkLogin(payload.username, payload.password);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }

    if (payload.action === 'saveOrder' || payload.action === 'updateOrder') {
      const result = saveOrderData(payload.data);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }

    if (payload.action === 'saveReceiving') {
      const result = saveReceivingData(payload.data);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }

    if (payload.action === 'saveNplApproval') {
      const result = saveNplApproval(payload.payload);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (payload.action === 'fixDates') {
      const result = fixDates(payload.data);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({success: false, message: "Invalid action"})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({success: false, message: err.message || String(err)})).setMimeType(ContentService.MimeType.JSON);
  }
}

function saveReceivingData(payload) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let receivingSheet = ss.getSheetByName("data_receiving");
    const FIXED_HEADERS = ["Thời gian lưu", "Mã đơn hàng", "PO Tháng", "Người nhập", "Ngày nhập", "Đợt nhập", "Tên SP", "Art Code", "Màu", "Tổng SL nhận", "Ghi chú"];
    
    if (!receivingSheet) {
      receivingSheet = ss.insertSheet("data_receiving");
      receivingSheet.getRange(1, 1, 1, FIXED_HEADERS.length).setValues([FIXED_HEADERS]);
      receivingSheet.getRange(1, 1, 1, FIXED_HEADERS.length).setFontWeight("bold").setBackground("#d9ead3");
      receivingSheet.setFrozenRows(1);
    }
    
    let lastCol = receivingSheet.getLastColumn();
    let currentHeaders = [];
    let headerChanged = false;

    if (lastCol === 0) {
        currentHeaders = [...FIXED_HEADERS];
        headerChanged = true;
    } else {
        lastCol = Math.max(lastCol, FIXED_HEADERS.length);
        currentHeaders = receivingSheet.getRange(1, 1, 1, lastCol).getValues()[0];
        if (currentHeaders[0] === "") {
            for (let i = 0; i < FIXED_HEADERS.length; i++) {
                currentHeaders[i] = FIXED_HEADERS[i];
            }
            headerChanged = true;
        }
        while(currentHeaders.length > FIXED_HEADERS.length && currentHeaders[currentHeaders.length - 1] === "") {
            currentHeaders.pop();
        }
    }
    
    const timestamp = new Date();
    const rowsToAppend = [];
    const items = payload.items || [];
    
    function normalizeSize(size) {
      let s = String(size).toUpperCase().trim();
      s = s.replace(/\.0$/, '');
      if (s === 'S') return 'S';
      if (s === 'M' || s === '29') return 'M/29';
      if (s === 'L' || s === '30') return 'L/30';
      if (s === 'XL' || s === '31') return 'XL/31';
      if (s === 'XXL' || s === '2XL' || s === '32') return 'XXL/32';
      if (s === '34') return '34';
      if (s === 'FREESIZE') return 'FREE';
      return s;
    }

    const SIZE_ORDER = ['S', 'M/29', 'L/30', 'XL/31', 'XXL/32', '34', 'FREE'];
    const neededSizes = new Set();
    
    items.forEach(it => {
       if (it.sizeData) {
           Object.keys(it.sizeData).forEach(sizeName => {
               neededSizes.add(normalizeSize(sizeName));
           });
       }
    });

    SIZE_ORDER.forEach(sizeKey => {
        const colName = "Size " + sizeKey;
        if (neededSizes.has(sizeKey) && !currentHeaders.includes(colName)) {
            currentHeaders.push(colName);
            headerChanged = true;
        }
    });

    Array.from(neededSizes).forEach(sizeKey => {
        if (!SIZE_ORDER.includes(sizeKey)) {
            const colName = "Size " + sizeKey;
            if (!currentHeaders.includes(colName)) {
                currentHeaders.push(colName);
                headerChanged = true;
            }
        }
    });

    if (headerChanged) {
        receivingSheet.getRange(1, 1, 1, currentHeaders.length).setValues([currentHeaders]);
        receivingSheet.getRange(1, 1, 1, currentHeaders.length).setFontWeight("bold").setBackground("#d9ead3");
    }

    items.forEach(it => {
      const rowData = new Array(currentHeaders.length).fill("");
      let totalQty = 0;
      if (it.sizeData) {
         Object.values(it.sizeData).forEach(qty => {
            totalQty += Number(qty) || 0;
         });
      }

      rowData[currentHeaders.indexOf("Thời gian lưu")] = timestamp;
      rowData[currentHeaders.indexOf("Mã đơn hàng")] = payload.orderNo || "";
      rowData[currentHeaders.indexOf("PO Tháng")] = payload.poMonth || "";
      rowData[currentHeaders.indexOf("Người nhập")] = payload.receiverName || "";
      rowData[currentHeaders.indexOf("Ngày nhập")] = payload.receivingDate || "";
      rowData[currentHeaders.indexOf("Đợt nhập")] = payload.receiveBatch || "";
      rowData[currentHeaders.indexOf("Tên SP")] = it.productName || "";
      rowData[currentHeaders.indexOf("Art Code")] = it.artCode || "";
      rowData[currentHeaders.indexOf("Màu")] = it.color || "";
      rowData[currentHeaders.indexOf("Tổng SL nhận")] = totalQty;
      rowData[currentHeaders.indexOf("Ghi chú")] = it.note || "";

      if (it.sizeData) {
         Object.keys(it.sizeData).forEach(sizeName => {
             const colName = "Size " + normalizeSize(sizeName);
             const colIdx = currentHeaders.indexOf(colName);
             if (colIdx >= 0) {
                 rowData[colIdx] = it.sizeData[sizeName];
             }
         });
      }
      rowsToAppend.push(rowData);
    });
    
    if (rowsToAppend.length > 0) {
      receivingSheet.getRange(receivingSheet.getLastRow() + 1, 1, rowsToAppend.length, currentHeaders.length).setValues(rowsToAppend);
    }
    
    return { success: true, message: "Lưu thông tin nhập hàng thành công!" };
  } catch (error) {
    return { success: false, message: error.message || String(error) };
  }
}

function getReceivedPOs() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const receivingSheet = ss.getSheetByName("data_receiving");
    if (!receivingSheet) return [];
    const data = receivingSheet.getDataRange().getValues();
    const poSet = new Set();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1]) poSet.add(String(data[i][1]).trim());
    }
    return Array.from(poSet);
  } catch(e) { return []; }
}

function getReceivingHistory() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName("data_receiving");
    if (!sheet) return [];
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    const headers = data[0];
    const results = [];
    // Read from bottom to top for newest first
    for(let i = data.length - 1; i > 0; i--) {
       let obj = {};
       for(let j = 0; j < headers.length; j++) {
           obj[headers[j]] = data[i][j];
       }
       results.push(obj);
    }
    return results;
  } catch(err) { return []; }
}

function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.action === 'getHistory') {
      const result = getOrderHistory();
      return ContentService.createTextOutput(JSON.stringify({success: true, data: result})).setMimeType(ContentService.MimeType.JSON);
    }
    if (e && e.parameter && e.parameter.action === 'getOrderDetails') {
      const result = getOrderDetails(e.parameter.orderNo);
      return ContentService.createTextOutput(JSON.stringify({success: true, data: result})).setMimeType(ContentService.MimeType.JSON);
    }
    if (e && e.parameter && e.parameter.action === 'getAllOrderDetails') {
      const result = getAllOrderDetails();
      return ContentService.createTextOutput(JSON.stringify({success: true, data: result})).setMimeType(ContentService.MimeType.JSON);
    }
    if (e && e.parameter && e.parameter.action === 'getReceivedPOs') {
      const result = getReceivedPOs();
      return ContentService.createTextOutput(JSON.stringify({success: true, data: result})).setMimeType(ContentService.MimeType.JSON);
    }
    if (e && e.parameter && e.parameter.action === 'getReceivingHistory') {
      const result = getReceivingHistory();
      return ContentService.createTextOutput(JSON.stringify({success: true, data: result})).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput("Backend is running").setMimeType(ContentService.MimeType.TEXT);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({success: false, message: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * HÀM CHẠY 1 LẦN: Dọn dẹp các đơn hàng bị Cancel do lỗi import trước đó
 * Hãy chọn hàm này trong danh sách và bấm "Chạy" trong trình soạn thảo Apps Script.
 */
function cleanCancelledData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const cancelledPOs = new Set();
  
  // 1. Dọn dẹp trong data_order
  const orderSheet = ss.getSheetByName("data_order");
  if (orderSheet) {
    const orderData = orderSheet.getDataRange().getValues();
    // Chạy ngược từ dưới lên để xóa dòng an toàn
    for (let i = orderData.length - 1; i > 0; i--) {
      const orderNo = String(orderData[i][1] || "").trim();
      const statusVai = String(orderData[i][12] || "").toLowerCase();
      const statusBo = String(orderData[i][17] || "").toLowerCase();
      const statusNpl = String(orderData[i][18] || "").toLowerCase();
      const note = String(orderData[i][20] || "").toLowerCase();
      
      if (statusVai === 'cancel' || statusBo === 'cancel' || statusNpl === 'cancel' || note.includes('cancel')) {
        if (orderNo) cancelledPOs.add(orderNo);
        orderSheet.deleteRow(i + 1);
      }
    }
  }

  // 2. Dọn dẹp trong data_order_details
  const detailSheet = ss.getSheetByName("data_order_details");
  if (detailSheet) {
    const detailData = detailSheet.getDataRange().getValues();
    for (let i = detailData.length - 1; i > 0; i--) {
      const orderNo = String(detailData[i][0] || "").trim();
      const statusVai = String(detailData[i][10] || "").toLowerCase();
      const statusBo = String(detailData[i][11] || "").toLowerCase();
      const statusNpl = String(detailData[i][12] || "").toLowerCase();
      const note = String(detailData[i][9] || "").toLowerCase();
      
      if (statusVai === 'cancel' || statusBo === 'cancel' || statusNpl === 'cancel' || note.includes('cancel') || cancelledPOs.has(orderNo)) {
        if (orderNo) cancelledPOs.add(orderNo);
        detailSheet.deleteRow(i + 1);
      }
    }
  }
  
  // 3. Dọn dẹp trong data_receiving
  const receivingSheet = ss.getSheetByName("data_receiving");
  if (receivingSheet) {
    const receivingData = receivingSheet.getDataRange().getValues();
    for (let i = receivingData.length - 1; i > 0; i--) {
      const orderNo = String(receivingData[i][1] || "").trim();
      // data_receiving[i][9] là Ghi chú nhận hàng, data_receiving[i][1] là orderNo
      const note = String(receivingData[i][9] || "").toLowerCase();
      
      if (note.includes('cancel') || cancelledPOs.has(orderNo)) {
        receivingSheet.deleteRow(i + 1);
      }
    }
  }
}

/**
 * HÀM CHẠY 1 LẦN: Cập nhật Trạng thái NPL = Pass cho các đơn nhập kho trước 1/5/2026
 * Vui lòng chọn hàm này ở menu trên cùng rồi bấm CHẠY
 */
function autoPassNplForOldReceivings() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const targetDate = new Date('2026-05-01T00:00:00');
  const passedPOs = new Set();
  
  // 1. Tìm các mã PO đã nhập kho trước 1/5/2026
  const receivingSheet = ss.getSheetByName("data_receiving");
  if (!receivingSheet) return;
  const receivingData = receivingSheet.getDataRange().getValues();
  const headersRec = receivingData[0];
  const dateIdx = headersRec.indexOf("Ngày nhập");
  const orderIdxRec = headersRec.indexOf("Mã đơn hàng");
  
  if (dateIdx === -1 || orderIdxRec === -1) return;
  
  for (let i = 1; i < receivingData.length; i++) {
    const dateVal = receivingData[i][dateIdx];
    const orderNo = String(receivingData[i][orderIdxRec] || "").trim();
    if (!orderNo || !dateVal) continue;
    
    let isOld = false;
    if (dateVal instanceof Date) {
      if (dateVal < targetDate) isOld = true;
    } else {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime()) && d < targetDate) isOld = true;
    }
    
    if (isOld) {
      passedPOs.add(orderNo);
    }
  }
  
  if (passedPOs.size === 0) return;
  
  // 2. Cập nhật trong data_order (Cột Trạng thái NPL - Index 18)
  const orderSheet = ss.getSheetByName("data_order");
  if (orderSheet) {
    const orderData = orderSheet.getDataRange().getValues();
    for (let i = 1; i < orderData.length; i++) {
      const orderNo = String(orderData[i][1] || "").trim();
      if (passedPOs.has(orderNo)) {
         // Cập nhật cell
         orderSheet.getRange(i + 1, 19).setValue("Pass");
      }
    }
  }
  
  // 3. Cập nhật trong data_order_details (Cột Đồng bộ NPL - Index 12)
  const detailSheet = ss.getSheetByName("data_order_details");
  if (detailSheet) {
    const detailData = detailSheet.getDataRange().getValues();
    for (let i = 1; i < detailData.length; i++) {
      const orderNo = String(detailData[i][0] || "").trim();
      if (passedPOs.has(orderNo)) {
         // Cập nhật cell
         detailSheet.getRange(i + 1, 13).setValue("Pass");
      }
    }
  }
}

/**
 * Chạy hàm này 1 lần trong Apps Script để sửa lại toàn bộ ngày bị đảo tháng/ngày.
 * Dữ liệu mapping được trích từ file CSV gốc của bạn.
 */
function forceFixDates() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var mapping = {
    "0003/2026/PLMR-TLN":{"d":"2026-03-14","o":"2026-02-15"},
    "0004/2026/PLMR-TLN":{"d":"2026-03-14","o":"2026-02-15"},
    "0005/2026/PLMR-TLN":{"d":"2026-03-18","o":"2026-02-19"},
    "0006/2026/PLMR-TLN":{"d":"2026-03-18","o":"2026-02-19"},
    "0009/2026/PLMR-AT":{"d":"2026-03-11","o":"2026-02-12"},
    "0010/2026/PLMR-AT":{"d":"2026-03-11","o":"2026-02-12"},
    "0011/2026/PLMR-AT":{"d":"2026-03-13","o":"2026-02-14"},
    "0012/2026/PLMR-AT":{"d":"2026-03-11","o":"2026-02-12"},
    "0013/2026/PLMR-AT":{"d":"2026-03-13","o":"2026-02-14"},
    "0019/2026/PLMR-TLN":{"d":"2026-03-13","o":"2026-02-14"},
    "0020/2026/PLMR-TLN":{"d":"2026-03-20","o":"2026-02-21"},
    "0021/2026/PLMR-TLN":{"d":"2026-03-20","o":"2026-02-21"},
    "0022/2026/PLMR-TLN":{"d":"2026-03-21","o":"2026-02-22"},
    "0023/2026/PLMR-TLN":{"d":"2026-05-09","o":"2026-04-12"},
    "0028/2026/PLMR-TLN":{"d":"2026-03-11","o":"2026-02-12"},
    "0029/2026/PLMR-AT":{"d":"2026-03-18","o":"2026-02-19"},
    "0030/2026/PLMR-AT":{"d":"2026-04-18","o":"2026-03-22"},
    "0031/2026/PLMR-AT":{"d":"2026-03-19","o":"2026-02-20"},
    "0032/2026/PLMR-AT":{"d":"2026-03-19","o":"2026-02-20"},
    "0034/2026/PLMR-AN":{"d":"2026-03-26","o":"2026-02-27"},
    "0035/2026/PLMR-AT":{"d":"2026-03-27","o":"2026-02-28"},
    "0036/2026/PLMR-AT":{"d":"2026-03-04","o":"2026-02-05"},
    "0037/2026/PLMR-AT":{"d":"2026-03-11","o":"2026-02-12"},
    "0038/2026/PLMR-AT":{"d":"2026-03-24","o":"2026-02-25"},
    "0039/2026/PLMR-AT":{"d":"2026-03-25","o":"2026-02-26"},
    "0040/2026/PLMR-AT":{"d":"2026-03-06","o":"2026-02-07"},
    "0041/2026/PLMR-AT":{"d":"2026-03-21","o":"2026-02-22"},
    "0042/2026/PLMR-TLN":{"d":"2026-03-11","o":"2026-02-12"},
    "0043/2026/PLMR-TLN":{"d":"2026-03-10","o":"2026-02-11"},
    "0044/2026/PLMR-LC":{"d":"2026-03-04","o":"2026-02-05"},
    "0045/2026/PLMR-LC":{"d":"2026-03-04","o":"2026-02-05"},
    "0046/2026/PLMR-LC":{"d":"2026-03-04","o":"2026-02-05"},
    "0047/2026/PLMR-AT":{"d":"2026-03-06","o":"2026-02-07"},
    "0048/2026/PLMR-TLN":{"d":"2026-02-04","o":"2026-01-08"},
    "0049/2026/PLMR-TLN":{"d":"2026-04-02","o":"2026-03-06"},
    "0050/2026/PLMR-TLN":{"d":"2026-03-19","o":"2026-02-20"},
    "0051/2026/PLMR-TLN":{"d":"2026-03-25","o":"2026-02-26"},
    "0052/2026/PLMR-TLN":{"d":"2026-03-26","o":"2026-02-27"},
    "0053/2026/PLMR-TLN":{"d":"2026-04-15","o":"2026-03-19"},
    "0056/2026/PLMR-TLN":{"d":"2026-04-23","o":"2026-03-27"},
    "0057/2026/PLMR-TLN":{"d":"2026-04-02","o":"2026-03-06"},
    "0058/2026/PLMR-TLN":{"d":"2026-04-02","o":"2026-03-06"},
    "0059/2026/PLMR-TLN":{"d":"2026-03-10","o":"2026-02-11"},
    "0060/2026/PLMR-TLN":{"d":"2026-03-11","o":"2026-02-12"},
    "0061/2026/PLMR-TLN":{"d":"2026-03-10","o":"2026-02-11"},
    "0062/2026/PLMR-AT":{"d":"2026-03-18","o":"2026-02-19"},
    "0063/2026/PLMR-AT":{"d":"2026-03-05","o":"2026-02-06"},
    "0064/2026/PLMR-LC":{"d":"2026-03-04","o":"2026-02-05"},
    "0065/2026/PLMR-AT":{"d":"2026-03-03","o":"2026-02-04"},
    "0066/2026/PLMR-AT":{"d":"2026-03-03","o":"2026-02-04"},
    "0067/2026/PLMR-AT":{"d":"2026-03-04","o":"2026-02-05"},
    "0068/2026/PLMR-AT":{"d":"2026-03-04","o":"2026-02-05"},
    "0069/2026/PLMR-AN":{"d":"2026-04-02","o":"2026-03-06"},
    "0070/2026/PLMR-TT":{"d":"2026-03-14","o":"2026-02-15"},
    "0071/2026/PLMR-TT":{"d":"2026-03-14","o":"2026-02-15"},
    "0072/2026/PLMR-TLN":{"d":"2026-04-04","o":"2026-03-08"},
    "0073/2026/PLMR-TLN":{"d":"2026-05-05","o":"2026-04-08"},
    "0074/2026/PLMR-AT":{"d":"2026-04-22","o":"2026-03-26"},
    "0075/2026/PLMR-TLN":{"d":"2026-04-14","o":"2026-03-18"},
    "0076/2026/PLMR-TLN":{"d":"2026-06-04","o":"2026-05-08"},
    "0077/2026/PLMR-AT":{"d":"2026-04-03","o":"2026-03-07"},
    "0078/2026/PLMR-AT":{"d":"2026-04-03","o":"2026-03-07"},
    "0080/2026/PLMR-TLN":{"d":"2026-07-02","o":"2026-06-05"},
    "0081/2026/PLMR-TLN":{"d":"2026-07-02","o":"2026-06-05"},
    "0082/2026/PLMR-TLN":{"d":"2026-07-02","o":"2026-06-05"},
    "0083/2026/PLMR-TLN":{"d":"2026-05-10","o":"2026-04-13"},
    "0090/2026/PLMR-AT":{"d":"2026-04-14","o":"2026-03-18"},
    "0091/2026/PLMR-TLN":{"d":"2026-04-21","o":"2026-03-25"},
    "0092/2026/PLMR-TLN":{"d":"2026-04-21","o":"2026-03-25"},
    "0094/2026/PLMR-TLN":{"d":"2026-04-17","o":"2026-03-21"},
    "0095/2026/PLMR-TLN":{"d":"2026-04-17","o":"2026-03-21"},
    "0096/2026/PLMR-TLN":{"d":"2026-04-15","o":"2026-03-19"},
    "0106/2026/PLMR-LC":{"d":"2026-04-29","o":"2026-04-02"},
    "0107/2026/PLMR-LC":{"d":"2026-04-29","o":"2026-04-02"},
    "0108/2026/PLMR-LC":{"d":"2026-04-29","o":"2026-04-02"},
    "0109/2026/PLMR-LC":{"d":"2026-04-29","o":"2026-04-02"},
    "0110/2026/PLMR-GLX":{"d":"2026-04-28","o":"2026-04-01"},
    "0112/2026/PLMR-GLX":{"d":"2026-04-28","o":"2026-04-01"},
    "0113/2026/PLMR-GLX":{"d":"2026-04-28","o":"2026-04-01"},
    "0116/2026/PLMR-GLX":{"d":"2026-04-24","o":"2026-03-28"},
    "0117/2026/PLMR-GLX":{"d":"2026-04-24","o":"2026-03-28"},
    "0118/2026/PLMR-AT":{"d":"2026-05-14","o":"2026-04-17"},
    "0122/2026/PLMR-AT":{"d":"2026-05-03","o":"2026-04-06"},
    "0123/2026/PLMR-AT":{"d":"2026-05-09","o":"2026-04-12"},
    "0124/2026/PLMR-AT":{"d":"2026-05-09","o":"2026-04-12"},
    "0129/2026/PLMR-AT":{"d":"2026-05-27","o":"2026-04-30"},
    "0130/2026/PLMR-AT":{"d":"2026-05-27","o":"2026-04-30"},
    "0131/2026/PLMR-TLN":{"d":"2026-05-10","o":"2026-04-13"},
    "0133/2026/PLMR-TLN":{"d":"2026-05-15","o":"2026-04-18"},
    "0134/2026/PLMR-TLN":{"d":"2026-05-10","o":"2026-04-13"},
    "0135/2026/PLMR-TLN":{"d":"2026-05-03","o":"2026-04-06"},
    "0136/2026/PLMR-TLN":{"d":"2026-05-03","o":"2026-04-06"},
    "0137/2026/PLMR-TLN":{"d":"2026-05-03","o":"2026-04-06"},
    "0138/2026/PLMR-TLN":{"d":"2026-05-20","o":"2026-04-23"},
    "0139/2026/PLMR-TLN":{"d":"2026-05-13","o":"2026-04-16"},
    "0140/2026/PLMR-TLN":{"d":"2026-05-13","o":"2026-04-16"},
    "0141/2026/PLMR-TLN":{"d":"2026-05-13","o":"2026-04-16"},
    "0146/2026/PLMR-TLN":{"d":"2026-05-05","o":"2026-04-08"},
    "0147/2026/PLMR-TLN":{"d":"2026-05-05","o":"2026-04-08"},
    "0148/2026/PLMR-LC":{"d":"2026-05-21","o":"2026-04-24"},
    "0149/2026/PLMR-LC":{"d":"2026-05-21","o":"2026-04-24"},
    "0150/2026/PLMR-LC":{"d":"2026-05-26","o":"2026-04-29"},
    "0152/2026/PLMR-GLX":{"d":"2026-05-22","o":"2026-04-25"},
    "0153/2026/PLMR-GLX":{"d":"2026-05-22","o":"2026-04-25"},
    "0154/2026/PLMR-GLX":{"d":"2026-05-22","o":"2026-04-25"},
    "0155/2026/PLMR-GLX":{"d":"2026-05-22","o":"2026-04-25"},
    "0156/2026/PLMR-GLX":{"d":"2026-05-29","o":"2026-05-02"},
    "0157/2026/PLMR-GLX":{"d":"2026-05-29","o":"2026-05-02"},
    "0158/2026/PLMR-GLX":{"d":"2026-05-29","o":"2026-05-02"},
    "0161/2026/PLMR-AT":{"d":"2026-06-13","o":"2026-05-17"},
    "0162/2026/PLMR-AT":{"d":"2026-06-13","o":"2026-05-17"},
    "0164/2026/PLMR-AT":{"d":"2026-06-18","o":"2026-05-22"},
    "0165/2026/PLMR-AT":{"d":"2026-06-18","o":"2026-05-22"},
    "0166/2026/PLMR-TLN":{"d":"2026-06-03","o":"2026-05-07"},
    "0167/2026/PLMR-TLN":{"d":"2026-06-12","o":"2026-05-16"},
    "0168/2026/PLMR-TLN":{"d":"2026-06-12","o":"2026-05-16"},
    "0169/2026/PLMR-TLN":{"d":"2026-06-12","o":"2026-05-16"},
    "0171/2026/PLMR-TLN":{"d":"2026-06-09","o":"2026-05-13"},
    "0173/2026/PLMR-TLN":{"d":"2026-06-24","o":"2026-05-28"},
    "0174/2026/PLMR-TLN":{"d":"2026-06-24","o":"2026-05-28"},
    "0177/2026/PLMR-TLN":{"d":"2026-06-03","o":"2026-05-07"},
    "0179/2026/PLMR-LC":{"d":"2026-06-11","o":"2026-05-15"},
    "0180/2026/PLMR-LC":{"d":"2026-06-11","o":"2026-05-15"},
    "0181/2026/PLMR-LC":{"d":"2026-06-11","o":"2026-05-15"},
    "0185/2026/PLMR-LC":{"d":"2026-06-27","o":"2026-05-31"},
    "0186/2026/PLMR-LC":{"d":"2026-06-27","o":"2026-05-31"},
    "0187/2026/PLMR-LC":{"d":"2026-06-27","o":"2026-05-31"},
    "0189/2026/PLMR-LC":{"d":"2026-06-27","o":"2026-05-31"},
    "0196/2026/PLMR-AT":{"d":"2026-07-07","o":"2026-06-10"},
    "0198/2026/PLMR-AT":{"d":"2026-07-17","o":"2026-06-20"},
    "0200/2026/PLMR-AT":{"d":"2026-07-25","o":"2026-06-28"},
    "0201/2026/PLMR-TLN":{"d":"2026-07-07","o":"2026-06-10"},
    "0202/2026/PLMR-TLN":{"d":"2026-07-07","o":"2026-06-10"},
    "0203/2026/PLMR-TLN":{"d":"2026-07-15","o":"2026-06-18"},
    "0204/2026/PLMR-TLN":{"d":"2026-07-18","o":"2026-06-21"},
    "0205/2026/PLMR-TLN":{"d":"2026-07-18","o":"2026-06-21"},
    "0207/2026/PLMR-TLN":{"d":"2026-07-02","o":"2026-06-05"},
    "0208/2026/PLMR-TLN":{"d":"2026-07-02","o":"2026-06-05"},
    "0209/2026/PLMR-TLN":{"d":"2026-07-02","o":"2026-06-05"},
    "0210/2026/PLMR-TLN":{"d":"2026-07-15","o":"2026-06-18"},
    "0212/2026/PLMR-TLN":{"d":"2026-07-05","o":"2026-06-08"},
    "0214/2026/PLMR-TLN":{"d":"2026-07-24","o":"2026-06-27"},
    "0215/2026/PLMR-TLN":{"d":"2026-07-24","o":"2026-06-27"},
    "0216/2026/PLMR-TLN":{"d":"2026-07-10","o":"2026-06-13"},
    "0217/2026/PLMR-TLN":{"d":"2026-07-05","o":"2026-06-08"},
    "0218/2026/PLMR-TLN":{"d":"2026-07-05","o":"2026-06-08"},
    "0219/2026/PLMR-LC":{"d":"2026-07-15","o":"2026-06-18"},
    "0220/2026/PLMR-LC":{"d":"2026-07-15","o":"2026-06-18"},
    "0221/2026/PLMR-LC":{"d":"2026-07-04","o":"2026-06-07"},
    "0222/2026/PLMR-LC":{"d":"2026-07-04","o":"2026-06-07"},
    "0223/2026/PLMR-LC":{"d":"2026-07-17","o":"2026-06-20"},
    "0224/2026/PLMR-LC":{"d":"2026-07-17","o":"2026-06-20"},
    "0226/2026/PLMR-LC":{"d":"2026-07-22","o":"2026-06-25"},
    "0227/2026/PLMR-LC":{"d":"2026-07-22","o":"2026-06-25"},
    "0229/2026/PLMR-TLN":{"d":"2026-06-20","o":"2026-05-24"},
    "0230/2026/PLMR-GLX":{"d":"2026-07-28","o":"2026-07-01"},
    "0231/2026/PLMR-GLX":{"d":"2026-07-28","o":"2026-07-01"},
    "0232/2026/PLMR-GLX":{"d":"2026-07-28","o":"2026-07-01"},
    "0233/2026/PLMR-GLX":{"d":"2026-07-28","o":"2026-07-01"},
    "0234/2026/PLMR-GLX":{"d":"2026-07-28","o":"2026-07-01"},
    "0235/2026/PLMR-GLX":{"d":"2026-07-03","o":"2026-06-06"},
    "0236/2026/PLMR-GLX":{"d":"2026-07-03","o":"2026-06-06"},
    "0237/2026/PLMR-TLN":{"d":"2026-06-24","o":"2026-05-28"},
    "0238/2026/PLMR-TLN":{"d":"2026-07-10","o":"2026-06-13"},
    "0239/2026/PLMR-AT":{"d":"2026-05-08","o":"2026-04-11"},
    "0240/2026/PLMR-AT":{"d":"2026-06-20","o":"2026-05-24"},
    "0241/2026/PLMR-HN KNIT":{"d":"2026-04-12","o":"2026-03-16"},
    "0242/2026/PLMR-HN KNIT":{"d":"2026-04-12","o":"2026-03-16"},
    "0245/2026/PLMR-HN KNIT":{"d":"2026-06-30","o":"2026-06-03"},
    "0246/2026/PLMR-HN KNIT":{"d":"2026-06-30","o":"2026-06-03"},
    "0249/2026/PLMR-TLN":{"d":"2026-03-28","o":"2026-03-01"},
    "0250/2026/PLMR-TLN":{"d":"2026-05-05","o":"2026-04-08"},
    "0251/2026/PLMR-TLN":{"d":"2026-06-05","o":"2026-05-09"},
    "0252/2026/PLMR-TLN":{"d":"2026-07-09","o":"2026-06-12"},
    "0254/2026/PLMR-WS":{"d":"2026-06-04","o":"2026-05-08"},
    "0255/2026/PLMR-WS":{"d":"2026-06-04","o":"2026-05-08"},
    "0260/2026/PLMR-TLN":{"d":"2026-07-03","o":"2026-06-06"},
    "0261/2026/PLMR-TLN":{"d":"2026-07-03","o":"2026-06-06"},
    "0262/2026/PLMR-KP":{"d":"2026-06-04","o":"2026-05-08"},
    "0267/2026/PLMR-KP":{"d":"2026-10-23","o":"2026-09-26"},
    "0268/2026/PLMR-KP":{"d":"2026-10-23","o":"2026-09-26"},
    "0269/2026/PLMR-KP":{"d":"2026-10-23","o":"2026-09-26"},
    "0270/2026/PLMR-VH":{"d":"2026-06-06","o":"2026-05-10"},
    "0271/2026/PLMR-VH":{"d":"2026-06-06","o":"2026-05-10"}
  };

  // Sửa cột "Ngày đặt hàng" (cột C = index 3) trong sheet data_order
  var orderSheet = ss.getSheetByName('data_order');
  var oData = orderSheet.getDataRange().getValues();
  var oUpdated = 0;
  for (var i = 1; i < oData.length; i++) {
    var orderNo = String(oData[i][1]).trim();
    if (mapping[orderNo]) {
      orderSheet.getRange(i + 1, 3).setValue(mapping[orderNo].o);
      oUpdated++;
    }
  }

  // Sửa cột "T.Gian Giao" (cột I = index 9) trong sheet data_order_details
  var detailSheet = ss.getSheetByName('data_order_details');
  var dData = detailSheet.getDataRange().getValues();
  var dUpdated = 0;
  for (var i = 1; i < dData.length; i++) {
    var orderNo = String(dData[i][0]).trim();
    if (mapping[orderNo]) {
      detailSheet.getRange(i + 1, 9).setValue(mapping[orderNo].d);
      dUpdated++;
    }
  }

  SpreadsheetApp.getUi().alert('Đã sửa ' + oUpdated + ' dòng trong data_order và ' + dUpdated + ' dòng trong data_order_details.');
}

/**
 * Chạy hàm này 1 lần sau khi XÓA SẠCH data trên Sheet.
 * Import toàn bộ 226 đơn hàng từ CSV gốc lên Google Sheets.
 */
function masterImportFromCSV() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. IMPORT data_order_details
  var detailSheet = ss.getSheetByName("data_order_details");
  if (!detailSheet) detailSheet = ss.insertSheet("data_order_details");
  var detailHeaders = ["Mã đơn hàng","Tên SP","Art Code","Màu","Tổng SL","Đơn giá","Thành tiền (trước VAT)","Thông tin NPL","T.Gian Giao","Ghi Chú","Trạng thái Vải","Trạng thái Bo","Đồng bộ NPL","Ngày đồng bộ","Ghi chú duyệt","Size S","Size M/29","Size L/30","Size XL/31","Size XXL/32","Size 34","Size FREE"];
  detailSheet.clearContents();
  detailSheet.getRange(1,1,1,detailHeaders.length).setValues([detailHeaders]);
  detailSheet.getRange(1,1,1,detailHeaders.length).setFontWeight("bold").setBackground("#fff2cc");
  detailSheet.setFrozenRows(1);
  var detailData = [["0003/2026/PLMR-TLN","BASIC SYMBOL","PO88","KEM VÀNG NEW","1000","112860","112860000","","14/3/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","250","Pass","250","150","",""],["0004/2026/PLMR-TLN","BASIC SYMBOL","PO88","KHAKI NEW","800","112860","90288000","","14/3/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","225","Pass","200","150","",""],["0005/2026/PLMR-TLN","BASIC SYMBOL","PO88","BE NHẠT","700","112860","79002000","","18/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","200","Pass","150","100","",""],["0006/2026/PLMR-TLN","BASIC SYMBOL","PO88","ĐẤT","700","112860","79002000","","18/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","200","Pass","150","100","",""],["0009/2026/PLMR-AT","BASIC DIAMOND","PO166","TRẮNG KEM","1000","127440","127440000","","11/3/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","300","Pass","250","150","",""],["0010/2026/PLMR-AT","BASIC DIAMOND","PO166","BE","1000","127440","127440000","","11/3/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","300","Pass","250","150","",""],["0011/2026/PLMR-AT","BASIC DIAMOND","PO166","XANH KHÓI","600","127440","76464000","","13/3/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","150","Pass","150","100","",""],["0012/2026/PLMR-AT","BASIC DIAMOND","PO166","XANH DENIM","600","127440","76464000","","11/3/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","150","Pass","150","100","",""],["0013/2026/PLMR-AT","BASIC DIAMOND","PO166","XANH MINT","600","127440","76464000","","13/3/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","150","Pass","150","100","",""],["0014/2026/PLMR-AT","BASIC DIAMOND","PO166","ĐỎ NÂU","630","127440","80287200","","12/5/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","190","190","150","100","",""],["0015/2026/PLMR-AT","BASIC DIAMOND","PO166","NAVY NEW","630","127440","80287200","","19/5/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","190","190","150","100","",""],["0016/2026/PLMR-AT","BASIC DIAMOND","PO166","TRẮNG NEW","630","127440","80287200","","16/5/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","190","190","150","100","",""],["0017/2026/PLMR-AT","BASIC DIAMOND","PO166","CÀ PHÊ","630","127440","80287200","","15/5/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","190","190","150","100","",""],["0018/2026/PLMR-AT","BASIC DIAMOND","PO166","BE","630","127440","80287200","","17/5/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","190","190","150","100","",""],["0019/2026/PLMR-TLN","BASIC SYMBOL","PO88","ĐỎ NÂU","800","112860","90288000","","13/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","225","Pass","200","150","",""],["0020/2026/PLMR-TLN","BASIC SYMBOL","PO88","XÁM ĐẬM NEW","800","112860","90288000","","20/3/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","225","Pass","200","150","",""],["0021/2026/PLMR-TLN","BASIC SYMBOL","PO88","NÂU NHẠT","800","112860","90288000","","20/3/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","225","Pass","200","150","",""],["0022/2026/PLMR-TLN","BASIC SYMBOL","PO88","BE HỒNG","800","112860","90288000","","21/3/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","225","Pass","200","150","",""],["0028/2026/PLMR-TLN","ASTON PMD31","PO253","ĐEN 84","600","201528","120916800","","11/3/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","125","250","Pass","50","","",""],["0029/2026/PLMR-AT","CLASSIC","PO119","TRẮNG","500","124200","62100000","","18/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","150","Pass","100","75","",""],["0030/2026/PLMR-AT","CLASSIC","PO119","ĐEN","500","124200","62100000","","18/4/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","150","Pass","100","75","",""],["0031/2026/PLMR-AT","CLASSIC","PO119","XÁM NHẠT","500","124200","62100000","","19/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","150","Pass","100","75","",""],["0032/2026/PLMR-AT","CLASSIC","PO119","KEM NHẠT","500","124200","62100000","","19/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","150","Pass","100","75","",""],["0033/2026/PLMR-TLN","BASIC SYMBOL","PO88","CAFE","700","112860","79002000","","3/6/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","175","250","175","100","",""],["0034/2026/PLMR-AN","CLASSIC DIAMOND","PO215","NAVY","500","117000","58500000","","26/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","150","Pass","100","75","",""],["0035/2026/PLMR-AT","ZYBER","PO210","ĐEN","500","145800","72900000","","27/3/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","150","Pass","100","75","",""],["0036/2026/PLMR-AT","TRAVIS","PO98","NAVY","800","124200","99360000","","4/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","250","Pass","200","100","",""],["0037/2026/PLMR-AT","MAVEN","PO230","NAVY","600","137160","82296000","","11/3/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","175","Pass","150","100","",""],["0038/2026/PLMR-AT","ZYBER","PO210","CAFE","500","145800","72900000","","24/3/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","125","Pass","125","100","",""],["0039/2026/PLMR-AT","ZYBER","PO210","BE NHẠT","800","145800","116640000","","25/3/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","200","Pass","200","100","",""],["0041/2026/PLMR-AT","CLASSIC","PO119","XÁM ĐẬM","800","124200","99360000","","21/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","250","Pass","200","100","",""],["0042/2026/PLMR-TLN","NIVIX","PO202","KEM NHẠT","600","131868","79120800","","11/3/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","150","200","Pass","100","","",""],["0043/2026/PLMR-TLN","ADEN","PO105","TRẮNG","600","127656","76593600","","10/3/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","300","Pass","150","","",""],["0044/2026/PLMR-LC","SHORT KAKI","PO99","BE","800","112000","89600000","","4/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","200","Pass","300","","",""],["0045/2026/PLMR-LC","SHORT KAKI","PO99","BE ĐẬM","500","112000","56000000","","4/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","150","Pass","150","","",""],["0046/2026/PLMR-LC","SHORT KAKI","PO99","NÂU","500","112000","56000000","","4/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","150","Pass","150","","",""],["0047/2026/PLMR-AT","IRISH PMD35","PO260","KEM","600","139320","83592000","","6/3/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","175","Pass","150","100","",""],["0049/2026/PLMR-TLN","BASIC SYMBOL","PO88","TRẮNG","450","112860","50787000","","2/4/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","20","Pass","250","150","",""],["0050/2026/PLMR-TLN","BASIC SYMBOL","PO88","ĐEN","1000","112860","112860000","","19/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","300","Pass","250","150","",""],["0051/2026/PLMR-TLN","BASIC SYMBOL","PO88","KEM NHẠT","600","112860","67716000","","25/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","175","Pass","150","75","",""],["0053/2026/PLMR-TLN","BASIC SYMBOL","PO88","TRẮNG","1000","112860","112860000","","15/4/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","400","Pass","","","",""],["0054/2026/PLMR-TLN","BASIC SYMBOL","PO88","ĐEN","500","112860","56430000","","15/4/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","150","Pass","125","75","",""],["0055/2026/PLMR-TLN","BASIC SYMBOL","PO88","KEM NHẠT","800","112860","90288000","","17/4/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","250","Pass","","","",""],["0056/2026/PLMR-TLN","BASIC SYMBOL","PO88","NAVY","800","112860","90288000","","23/4/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","150","Pass","100","100","",""],["0057/2026/PLMR-TLN","JAY","PO201","TRẮNG","800","121284","97027200","","2/4/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","200","Pass","200","100","",""],["0058/2026/PLMR-TLN","JAY","PO201","NAVY","800","121284","97027200","","2/4/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","200","Pass","200","100","",""],["0059/2026/PLMR-TLN","BASIC SYMBOL","PO88","CAFE","800","112860","90288000","","10/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","250","Pass","200","100","",""],["0060/2026/PLMR-TLN","BASIC SYMBOL","PO88","ĐEN","1500","112860","169290000","","11/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","400","Pass","400","200","",""],["0061/2026/PLMR-TLN","BASIC SYMBOL","PO88","NAVY","400","112860","45144000","","10/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","200","Pass","200","","",""],["0062/2026/PLMR-AT","CLASSIC","PO119","ĐEN","600","124200","74520000","","18/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","175","Pass","125","100","",""],["0063/2026/PLMR-AT","BASIC DIAMOND","PO166","NAVY","800","127440","101952000","","5/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","250","Pass","200","100","",""],["0064/2026/PLMR-LC","JEAN STRAIGHT","PO216","XANH NHẠT","2000","180000","360000000","","4/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","400","450","Pass","400","300","",""],["0065/2026/PLMR-AT","BASIC DIAMOND","PO166","ĐEN","500","127440","63720000","","3/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","150","Pass","100","75","",""],["0066/2026/PLMR-AT","BASIC DIAMOND","PO166","TRẮNG","500","127440","63720000","","3/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","150","Pass","100","75","",""],["0068/2026/PLMR-AT","CLASSIC DIAMOND V2","PO276","BE NHẠT","900","124200","111780000","","4/3/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","220","Pass","180","120","",""],["0069/2026/PLMR-AN","CLASSIC DIAMOND","PO215","NAVY","500","117000","58500000","","2/4/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","150","Pass","100","75","",""],["0070/2026/PLMR-TT","VỚ LOGO","VO5","ĐEN","1000","15660","15660000","","14/3/2026","RESTOCK - PHỄU","Pending","Pending","Pending","","","","1000","Pass","","","",""],["0071/2026/PLMR-TT","VỚ LOGO","VO5","TRẮNG","1000","15660","15660000","","14/3/2026","RESTOCK - PHỄU","Pending","Pending","Pending","","","","1000","Pass","","","",""],["0072/2026/PLMR-TLN","NORF","PO301","TRẮNG","800","135000","108000000","","4/4/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","225","Pass","200","150","",""],["0074/2026/PLMR-AT","TRAVIS","PO98","NAVY","500","124200","62100000","","22/4/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","175","Pass","100","75","",""],["0077/2026/PLMR-AT","LINE","PO303","NAVY","800","139320","111456000","","3/4/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","250","Pass","200","100","",""],["0078/2026/PLMR-AT","TRAVIS","PO98","CAFE","800","125280","100224000","","3/4/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","250","Pass","200","100","",""],["0084/2026/PLMR-LC","SHORT KAKI","PO99","ĐEN","860","112000","96320000","","27/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","120","310","Pass","230","","",""],["0085/2026/PLMR-LC","KAKI SD","PO126","NÂU","500","123000","61500000","","27/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","60","120","Pass","100","50","",""],["0086/2026/PLMR-LC","QUẦN TÂY LƯNG CHUN","PO86","ĐEN","559","153000","85527000","","27/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","26","187","Pass","125","28","",""],["0088/2026/PLMR-TLN","CLASSIC","PO119","CAFE","700","112860","79002000","","27/5/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","200","250","150","100","",""],["0090/2026/PLMR-AT","CLASSIC DIAMOND V2","PO276","ĐỎ NÂU","800","128520","102816000","","14/4/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","200","Pass","200","100","",""],["0091/2026/PLMR-TLN","BASIC SYMBOL","PO88","BE","800","112860","90288000","","21/4/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","200","Pass","200","100","",""],["0093/2026/PLMR-TLN","THOMAS","PO97","BE","600","123444","74066400","","17/6/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","175","200","150","75","",""],["0094/2026/PLMR-TLN","WICK","PO226","BE ĐẬM","800","126576","101260800","","17/4/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","200","Pass","200","100","",""],["0095/2026/PLMR-TLN","JAY","PO201","KEM NHẠT","800","121284","97027200","","17/4/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","200","Pass","200","100","",""],["0097/2026/PLMR-LC","SHORT KAKI","PO99","ĐEN","800","112000","89600000","","11/4/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","340","Pass","100","","",""],["0098/2026/PLMR-LC","SHORT KAKI","PO99","TRẮNG","770","112000","86240000","","11/4/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","120","190","Pass","200","","",""],["0099/2026/PLMR-LC","KAKI SD","PO126","ĐEN","770","123000","94710000","","9/4/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","40","220","Pass","200","50","",""],["0100/2026/PLMR-LC","KAKI SD","PO126","BE","370","123000","45510000","","9/4/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","0","140","Pass","130","40","",""],["0101/2026/PLMR-LC","KAKI SD","PO126","NÂU","890","123000","109470000","","23/4/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","50","300","Pass","180","100","",""],["0102/2026/PLMR-LC","JEAN STRAIGHT","PO216","XANH NHẠT","294","180000","52920000","","4/4/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","55","65","Pass","66","33","",""],["0103/2026/PLMR-LC","QUẦN TÂY LƯNG CHUN","PO86","BE","573","153000","87669000","","23/4/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","46","192","199","103","33","",""],["0104/2026/PLMR-LC","SHORT KAKI","PO99","BE ĐẬM","600","123120","73872000","","23/4/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","50","270","Pass","120","","",""],["0105/2026/PLMR-LC","QUẦN TÂY LƯNG CHUN","PO86","ĐEN","600","168480","101088000","","23/4/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","50","200","Pass","100","50","",""],["0106/2026/PLMR-LC","KAKI STRAIGHT","PO249","BE","500","194400","97200000","","29/4/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","50","125","Pass","125","50","",""],["0107/2026/PLMR-LC","KAKI STRAIGHT","PO249","ĐEN","500","194400","97200000","","29/4/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","50","125","Pass","125","50","",""],["0108/2026/PLMR-LC","KAKI STRAIGHT","PO249","NÂU","500","194400","97200000","","29/4/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","50","125","Pass","125","50","",""],["0109/2026/PLMR-LC","KAKI STRAIGHT","PO249","KEM","800","194400","155520000","","29/4/2026","NEW IN - CHỦ LỰC","Pending","Pending","Pending","","","100","200","250","150","100","",""],["0110/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","TRẮNG 02","800","150120","120096000","","28/4/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","200","Pass","250","100","",""],["0111/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","NAVY 35","800","159840","127872000","","24/6/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","200","250","250","100","",""],["0112/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","XANH NHẠT 07","800","150120","120096000","","28/4/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","200","Pass","250","100","",""],["0113/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","BE","800","150120","120096000","","28/4/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","200","Pass","250","100","",""],["0114/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","ĐEN","800","159840","127872000","","24/6/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","200","250","250","100","",""],["0115/2026/PLMR-GLX","Sơ mi POPLIN","PO258","TRẮNG 02","600","149580","89748000","","8/5/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","175","200","150","75","",""],["0116/2026/PLMR-GLX","Sơ mi POPLIN","PO258","ĐEN 147","600","149580","89748000","","24/4/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","175","Pass","150","75","",""],["0118/2026/PLMR-AT","BASIC CLASSIC","PO119","XÁM NHẠT","600","118800","71280000","","14/5/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","175","200","150","75","",""],["0119/2026/PLMR-TLN","BASIC CLASSIC","PO119","TRẮNG","600","112860","67716000","","14/5/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","175","200","150","75","",""],["0120/2026/PLMR-AT","BASIC CLASSIC","PO119","NAVY KEM","700","118800","83160000","","14/5/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","200","250","150","100","",""],["0121/2026/PLMR-TLN","BASIC CLASSIC","PO119","KHAKI","600","112860","67716000","","13/6/2026","RESTOCK - NEWIN","Pending","Pending","Pending","","","","175","200","150","75","",""],["0122/2026/PLMR-AT","BASIC DIAMOND","PO166","KEM","800","128520","102816000","","3/5/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","250","Pass","200","100","",""],["0123/2026/PLMR-AT","CLASSIC DIAMOND V2","PO276","XANH KHÓI","800","128520","102816000","","9/5/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","250","250","200","100","",""],["0124/2026/PLMR-AT","CLASSIC DIAMOND V2","PO276","XANH DENIM","800","128520","102816000","","9/5/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","250","250","200","100","",""],["0129/2026/PLMR-AT","PHILO PK75","PO309","TRẮNG KEM","800","139320","111456000","","27/5/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","250","250","200","100","",""],["0130/2026/PLMR-AT","KITT PMK82","PO400","XANH MINT","800","149040","119232000","","27/5/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","250","250","200","100","",""],["0131/2026/PLMR-TLN","BASIC SYMBOL","PO88","ĐEN","500","112860","56430000","","10/5/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","150","150","125","75","",""],["0132/2026/PLMR-TLN","BASIC SYMBOL","PO88","TRẮNG","1000","112860","112860000","","15/5/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","400","600","","","",""],["0133/2026/PLMR-TLN","BASIC SYMBOL","PO88","NAVY","800","112860","90288000","","15/5/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","250","250","200","100","",""],["0134/2026/PLMR-TLN","BASIC SYMBOL","PO88","BE NHẠT","600","112860","67716000","","10/5/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","175","200","150","75","",""],["0135/2026/PLMR-TLN","BASIC DIAMOND","PO166","OLIU","800","126144","100915200","","3/5/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","250","250","200","100","",""],["0136/2026/PLMR-TLN","BASIC DIAMOND","PO166","RÊU","800","126144","100915200","","3/5/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","250","250","200","100","",""],["0137/2026/PLMR-TLN","BASIC DIAMOND","PO166","INDIGO","800","126144","100915200","","3/5/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","250","250","200","100","",""],["0138/2026/PLMR-TLN","ADEN","PO105","TRẮNG","600","127656","76593600","","20/5/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","175","200","150","75","",""],["0139/2026/PLMR-TLN","NIVIX","PO202","KEM NHẠT","600","131868","79120800","","13/5/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","175","200","150","75","",""],["0140/2026/PLMR-TLN","RUM","PO241","KEM NHẠT","800","126576","101260800","","13/5/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","250","250","200","100","",""],["0141/2026/PLMR-TLN","ANDY","PO182","KEM NHẠT","800","122364","97891200","","13/5/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","250","250","200","100","",""],["0142/2026/PLMR-TLN","KANE","PO235","BE ĐẬM","500","128736","64368000","","24/6/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","100","200","150","50","",""],["0146/2026/PLMR-TLN","TORA - PMB85","PO302","KEM  NHẠT","800","136080","108864000","","5/5/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","250","250","200","100","",""],["0147/2026/PLMR-TLN","ALLI - PMB81","PO304","KEM VÀNG","800","128736","102988800","","5/5/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","250","250","200","100","",""],["0148/2026/PLMR-LC","JEAN STRAIGHT","PO216","ĐEN","500","194400","97200000","","21/5/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","50","125","150","125","50","",""],["0149/2026/PLMR-LC","JEAN STRAIGHT","PO216","XANH ĐẬM","500","194400","97200000","","21/5/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","50","125","150","125","50","",""],["0150/2026/PLMR-LC","KAKI SD","PO126","BE","600","136080","81648000","","26/5/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","50","150","150","150","100","",""],["0151/2026/PLMR-LC","QUẦN TÂY LƯNG CHUN","PO86","ĐEN","600","168480","101088000","","26/5/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","50","200","200","100","50","",""],["0152/2026/PLMR-GLX","Sơ mi  OXFORD PREMIUM","PO252","TRẮNG 02","800","150120","120096000","","22/5/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","200","250","250","100","",""],["0153/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","NAVY 35","800","159840","127872000","","22/5/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","200","250","250","100","",""],["0154/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","BE","700","150120","105084000","","22/5/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","175","250","175","100","",""],["0155/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","ĐEN","600","159840","95904000","","22/5/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","175","200","150","75","",""],["0156/2026/PLMR-GLX","Sơ mi TAY NGẮN OXFORD","PO307","TRẮNG","600","137160","82296000","","29/5/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","175","200","150","75","",""],["0157/2026/PLMR-GLX","Sơ mi TAY NGẮN OXFORD","PO307","ĐEN","600","143640","86184000","","29/5/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","175","200","150","75","",""],["0158/2026/PLMR-GLX","Sơ mi TAY NGẮN OXFORD","PO307","NAVY","600","143640","86184000","","29/5/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","175","200","150","75","",""],["0159/2026/PLMR-TLN","BASIC CLASSIC","PO119","KEM NHẠT","600","112860","67716000","","20/6/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","175","200","150","75","",""],["0160/2026/PLMR-TLN","BASIC CLASSIC","PO119","ĐEN","600","112860","67716000","","20/6/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","175","200","150","75","",""],["0161/2026/PLMR-AT","BASIC DIAMOND","PO166","CHOCO","600","128520","77112000","","13/6/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","175","200","150","75","",""],["0162/2026/PLMR-AT","BASIC DIAMOND","PO166","XANH LÁ","600","128520","77112000","","13/6/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","175","200","150","75","",""],["0164/2026/PLMR-AT","CLASSIC DIAMOND V2","PO276","NAVY","600","126360","75816000","","18/6/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","175","200","150","75","",""],["0165/2026/PLMR-AT","CLASSIC DIAMOND V2","PO276","TRẮNG","600","126360","75816000","","18/6/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","175","200","150","75","",""],["0166/2026/PLMR-TLN","BASIC SYMBOL","PO88","TRẮNG","1000","112860","112860000","","3/6/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","300","300","250","150","",""],["0167/2026/PLMR-TLN","BASIC SYMBOL","PO88","NAVY","800","112860","90288000","","12/6/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","250","250","200","100","",""],["0168/2026/PLMR-TLN","BASIC SYMBOL","PO88","KEM NHẠT","600","112860","67716000","","12/6/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","175","200","150","75","",""],["0169/2026/PLMR-TLN","BASIC SYMBOL","PO88","XANH LÁ","600","112860","67716000","","12/6/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","175","200","150","75","",""],["0170/2026/PLMR-TLN","BASIC SYMBOL","PO88","ĐỎ NÂU","800","112860","90288000","","9/6/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","250","250","200","100","",""],["0171/2026/PLMR-TLN","BASIC SYMBOL","PO88","KEM VÀNG","600","112860","67716000","","9/6/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","175","200","150","75","",""],["0173/2026/PLMR-TLN","LOKI PMD19","PO225","NAVY","800","127656","102124800","","24/6/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","250","250","200","100","",""],["0175/2026/PLMR-TLN","JAY PMK16","PO201","KEM NHẠT","800","121284","97027200","","3/6/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","250","250","200","100","",""],["0176/2026/PLMR-TLN","DAVID PMK17","PO206","TRẮNG","800","129816","103852800","","17/6/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","250","250","200","100","",""],["0177/2026/PLMR-TLN","DALE  PMB86","PO305","KEM VÀNG","550","137052","75378600","","3/6/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","125","175","175","75","",""],["0179/2026/PLMR-LC","SHORT KAKI","PO99","ĐEN","600","123120","73872000","","11/6/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","50","170","200","180","","",""],["0180/2026/PLMR-LC","SHORT KAKI","PO99","BE ĐẬM","600","123120","73872000","","11/6/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","50","170","200","180","","",""],["0181/2026/PLMR-LC","SHORT KAKI","PO99","TRẮNG","800","123120","98496000","","11/6/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","50","250","300","200","","",""],["0182/2026/PLMR-LC","KAKI STRAIGHT","PO249","BE","500","194400","97200000","","11/6/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","75","125","125","100","75","",""],["0183/2026/PLMR-LC","KAKI STRAIGHT","PO249","ĐEN","500","194400","97200000","","11/6/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","75","125","125","100","75","",""],["0184/2026/PLMR-LC","KAKI STRAIGHT","PO249","NÂU","500","194400","97200000","","11/6/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","75","125","125","100","75","",""],["0185/2026/PLMR-LC","KAKI SD","PO126","ĐEN","500","136080","68040000","","27/6/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","50","150","150","100","50","",""],["0186/2026/PLMR-LC","KAKI SD","PO126","BE","500","136080","68040000","","27/6/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","50","150","150","100","50","",""],["0187/2026/PLMR-LC","KAKI SD","PO126","NÂU","500","136080","68040000","","27/6/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","50","150","150","100","50","",""],["0188/2026/PLMR-LC","QUẦN TÂY LƯNG CHUN","PO86","ĐEN","600","168480","101088000","","27/6/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","50","200","200","100","50","",""],["0189/2026/PLMR-LC","QUẦN TÂY LƯNG CHUN","PO86","BE","500","168480","84240000","","27/6/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","50","150","150","100","50","",""],["0190/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","TRẮNG 02","800","150120","120096000","","25/8/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","200","250","250","100","",""],["0191/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","NAVY 35","800","159840","127872000","","25/8/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","200","250","250","100","",""],["0192/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","XANH NHẠT 07","700","150120","105084000","","25/8/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","175","250","175","100","",""],["0193/2026/PLMR-GLX","Sơ mi POPLIN","PO258","TRẮNG 02","600","149580","89748000","","25/8/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","175","200","150","75","",""],["0194/2026/PLMR-GLX","Sơ mi POPLIN","PO258","ĐEN 147","600","149580","89748000","","25/8/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","175","200","150","75","",""],["0195/2026/PLMR-GLX","Sơ mi POPLIN","PO258","BE 05","600","149580","89748000","","25/8/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","175","200","150","75","",""],["0196/2026/PLMR-AT","BASIC CLASSIC","PO119","XÁM NHẠT","600","118800","71280000","","7/7/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","175","200","150","75","",""],["0197/2026/PLMR-TLN","BASIC CLASSIC","PO119","TRẮNG","600","112860","67716000","","7/7/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","175","200","150","75","",""],["0198/2026/PLMR-AT","BASIC CLASSIC","PO119","NAVY KEM","600","118800","71280000","","17/7/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","175","200","150","75","",""],["0199/2026/PLMR-TLN","BASIC CLASSIC","PO119","CAFE","600","112860","67716000","","17/7/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","175","200","150","75","",""],["0200/2026/PLMR-AT","CLASSIC DIAMOND V2","PO276","BE NHẠT","600","128520","77112000","","25/7/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","175","200","150","75","",""],["0201/2026/PLMR-TLN","BASIC SYMBOL","PO88","TRẮNG","1500","112860","169290000","","7/7/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","400","500","400","200","",""],["0202/2026/PLMR-TLN","BASIC SYMBOL","PO88","ĐEN","800","112860","90288000","","7/7/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","250","250","200","100","",""],["0203/2026/PLMR-TLN","BASIC SYMBOL","PO88","NAVY","800","112860","90288000","","15/7/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","250","250","200","100","",""],["0204/2026/PLMR-TLN","BASIC SYMBOL","PO88","BE","800","112860","90288000","","18/7/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","250","250","200","100","",""],["0205/2026/PLMR-TLN","BASIC SYMBOL","PO88","BE NHẠT","600","112860","67716000","","18/7/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","175","200","150","75","",""],["0207/2026/PLMR-TLN","BASIC SYMBOL","PO88","MINT","800","112860","90288000","","2/7/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","250","250","200","100","",""],["0208/2026/PLMR-TLN","BASIC SYMBOL","PO88","OLIU","800","112860","90288000","","2/7/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","250","250","200","100","",""],["0209/2026/PLMR-TLN","BASIC SYMBOL","PO88","DENIM","800","127656","102124800","","2/7/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","250","250","200","100","",""],["0210/2026/PLMR-TLN","ADEN","PO105","TRẮNG","800","127656","102124800","","15/7/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","250","250","200","100","",""],["0212/2026/PLMR-TLN","RUM","PO241","KEM NHẠT","800","126576","101260800","","5/7/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","250","250","200","100","",""],["0213/2026/PLMR-TLN","KANE","PO235","BE ĐẬM","600","128736","77241600","","20/8/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","175","200","150","75","",""],["0214/2026/PLMR-TLN","KANE","PO235","NAVY","600","129816","77889600","","24/7/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","175","200","150","75","",""],["0215/2026/PLMR-TLN","WADE","PO236","NAVY","600","128736","77241600","","24/7/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","175","200","150","75","",""],["0216/2026/PLMR-TLN","WICK","PO226","BE ĐẬM","800","126576","101260800","","10/7/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","250","250","200","100","",""],["0217/2026/PLMR-TLN","RUM PMK36","PO241","KHAKI","600","126576","75945600","","5/7/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","175","200","150","75","",""],["0218/2026/PLMR-TLN","LEDO PMB87","PO306","KEM NHẠT","600","132948","79768800","","5/7/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","175","200","150","75","",""],["0219/2026/PLMR-LC","JEAN STRAIGHT","PO216","ĐEN","600","194400","116640000","","15/7/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","100","125","150","125","100","",""],["0220/2026/PLMR-LC","JEAN STRAIGHT","PO216","XANH ĐẬM","600","194400","116640000","","15/7/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","100","125","150","125","100","",""],["0221/2026/PLMR-LC","JEAN STRAIGHT","PO216","XANH NHẠT","600","194400","116640000","","4/7/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","100","125","150","125","100","",""],["0222/2026/PLMR-LC","JEAN STRAIGHT","PO216","INDIGO","800","194400","155520000","","4/7/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","125","175","200","175","125","",""],["0223/2026/PLMR-LC","SHORT KAKI","PO99","ĐEN","800","123120","98496000","","17/7/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","50","250","300","200","","",""],["0224/2026/PLMR-LC","SHORT KAKI","PO99","BE ĐẬM","600","123120","73872000","","17/7/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","50","170","200","180","","",""],["0225/2026/PLMR-LC","SHORT KAKI","PO99","BE","680","112000","76160000","","22/7/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","50","200","230","200","","",""],["0226/2026/PLMR-LC","KAKI SD","PO126","ĐEN","500","136080","68040000","","22/7/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","50","125","150","125","50","",""],["0227/2026/PLMR-LC","KAKI SD","PO126","BE","500","136080","68040000","","22/7/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","50","125","150","125","50","",""],["0229/2026/PLMR-TLN","TRAVIS","PO98","NAVY","800","124524","99619200","","20/6/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","250","250","200","100","",""],["0230/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","TRẮNG 02","800","150120","120096000","","28/7/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","200","250","250","100","",""],["0231/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","NAVY 35","800","159840","127872000","","28/7/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","200","250","250","100","",""],["0232/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","XANH NHẠT 07","600","150120","90072000","","28/7/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","175","200","150","75","",""],["0233/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","BE","600","150120","90072000","","28/7/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","175","200","150","75","",""],["0234/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","ĐEN","600","159840","95904000","","28/7/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","175","200","150","75","",""],["0235/2026/PLMR-GLX","Sơ mi TAY NGẮN  POPLIN","PO308","ĐEN","600","133380","80028000","","3/7/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","175","200","150","75","",""],["0236/2026/PLMR-GLX","Sơ mi TAY NGẮN  POPLIN","PO308","CAFE","600","133380","80028000","","3/7/2026","NEW IN - NEWIN","Pending","Pending","Pending","","","","175","200","150","75","",""],["0237/2026/PLMR-TLN","MAVEN","PO230","NAVY","800","135000","108000000","","24/6/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","250","250","200","100","",""],["0238/2026/PLMR-TLN","IRISH PMD35","PO260","KEM","800","135000","108000000","","10/7/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","250","250","200","100","",""],["0239/2026/PLMR-AT","IRISH PMD35","PO260","KEM","250","139320","34830000","","8/5/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","100","150","","","",""],["0240/2026/PLMR-AT","ZYBER","PO210","ĐEN","700","135000","94500000","","20/6/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","250","250","125","75","",""],["0241/2026/PLMR-HN KNIT","VỚ LOGO","VO5","TRẮNG","2000","11000","22000000","","12/4/2026","RESTOCK - PHỄU","Pending","Pending","Pending","","","2000","","Pass","","","",""],["0242/2026/PLMR-HN KNIT","VỚ LOGO","VO5","ĐEN","2000","11000","22000000","","12/4/2026","RESTOCK - PHỄU","Pending","Pending","Pending","","","2000","","Pass","","","",""],["0243/2026/PLMR-HN KNIT","VỚ LOGO","VO5","TRẮNG","2000","11000","22000000","","28/5/2026","RESTOCK - PHỄU","Pending","Pending","Pending","","","2000","","","","","",""],["0244/2026/PLMR-HN KNIT","VỚ LOGO","VO5","ĐEN","2000","11000","22000000","","28/5/2026","RESTOCK - PHỄU","Pending","Pending","Pending","","","2000","","","","","",""],["0245/2026/PLMR-HN KNIT","VỚ LOGO","VO5","TRẮNG","2000","11000","22000000","","30/6/2026","RESTOCK - PHỄU","Pending","Pending","Pending","","","2000","","","","","",""],["0246/2026/PLMR-HN KNIT","VỚ LOGO","VO5","ĐEN","2000","11000","22000000","","30/6/2026","RESTOCK - PHỄU","Pending","Pending","Pending","","","2000","","","","","",""],["0247/2026/PLMR-HN KNIT","VỚ LOGO","VO5","TRẮNG","2000","11000","22000000","","30/7/2026","RESTOCK - PHỄU","Pending","Pending","Pending","","","2000","","","","","",""],["0248/2026/PLMR-HN KNIT","VỚ LOGO","VO5","ĐEN","2000","11000","22000000","","30/7/2026","RESTOCK - PHỄU","Pending","Pending","Pending","","","2000","","","","","",""],["0249/2026/PLMR-TLN","BASIC SYMBOL","PO88","TRẮNG","550","112860","62073000","","28/3/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","280","Pass","","","",""],["0250/2026/PLMR-TLN","TÚI GIẶT","PO401","TRẮNG","2000","17496","34992000","","5/5/2026","NEW IN - PHỄU","Pending","Pending","Pending","","","2000","","","","","",""],["0251/2026/PLMR-TLN","TÚI GIẶT","PO401","TRẮNG","2000","17496","34992000","","5/6/2026","RESTOCK - PHỄU","Pending","Pending","Pending","","","2000","","","","","",""],["0252/2026/PLMR-TLN","TÚI GIẶT","PO401","TRẮNG","2000","17496","34992000","","9/7/2026","RESTOCK - PHỄU","Pending","Pending","Pending","","","2000","","","","","",""],["0253/2026/PLMR-TLN","BASIC SYMBOL","PO88","XANH LÁ","800","112860","90288000","","31/5/2026","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","","250","250","200","100","",""],["0260/2026/PLMR-TLN","RICHIE","PO403","TRẮNG KEM","600","142344","85406400","","3/7/2026","NEW IN - DUY TRÌ","Pending","Pending","Pending","","","","150","250","150","50","",""],["0261/2026/PLMR-TLN","RICHIE","PO403","TRẮNG KEM","600","142344","85406400","","3/7/2026","NEW IN - DUY TRÌ","Pending","Pending","Pending","","","","150","250","150","50","",""],["0262/2026/PLMR-KP","TSHIRT BASIC US","PO217","TRẮNG","800","86400","69120000","","4/6/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","230","270","200","100","",""],["0263/2026/PLMR-KP","TSHIRT BASIC US","PO217","ĐEN","800","86400","69120000","","4/6/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","230","270","200","100","",""],["0265/2026/PLMR-KP","TSHIRT BASIC US","PO217","BE ĐẬM","800","86400","69120000","","4/6/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","230","270","200","100","",""],["0270/2026/PLMR-VH","TANKTOP BASIC","PO404","TRẮNG","1000","24000","24000000","","6/6/2026","NEW IN - DUY TRÌ","Pending","Pending","Pending","","","","280","370","230","120","",""],["0271/2026/PLMR-VH","TANKTOP BASIC","PO404","ĐEN","1000","24000","24000000","","6/6/2026","NEW IN - DUY TRÌ","Pending","Pending","Pending","","","","280","370","230","120","",""],["0272/2026/PLMR-VH","TANKTOP BASIC","PO404","TRẮNG","1000","24000","24000000","","31/5/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","280","370","230","120","",""],["0273/2026/PLMR-VH","TANKTOP BASIC","PO404","ĐEN","1000","24000","24000000","","31/5/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","280","370","230","120","",""],["0274/2026/PLMR-VH","TANKTOP BASIC","PO404","TRẮNG","1000","24000","24000000","","31/5/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","280","370","230","120","",""],["0275/2026/PLMR-VH","TANKTOP BASIC","PO404","ĐEN","1000","24000","24000000","","31/5/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","280","370","230","120","",""],["0276/2026/PLMR-VH","TANKTOP BASIC","PO404","TRẮNG","1000","24000","24000000","","31/5/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","280","370","230","120","",""],["0277/2026/PLMR-VH","TANKTOP BASIC","PO404","ĐEN","1000","24000","24000000","","31/5/2026","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","","280","370","230","120","",""]];
  var numCols = detailHeaders.length;
  detailData = detailData.map(function(r) { var row = r.slice(0,numCols); while(row.length<numCols) row.push(""); return row; });
  if (detailData.length > 0) detailSheet.getRange(2,1,detailData.length,numCols).setValues(detailData);
  
  // 2. IMPORT data_order
  var orderSheet = ss.getSheetByName("data_order");
  if (!orderSheet) orderSheet = ss.insertSheet("data_order");
  var orderHeaders = ["Thời gian lưu","Mã đơn hàng","Ngày đặt hàng","Người tạo","Công ty","Nhà cung cấp","Địa chỉ NCC","Thuế VAT (%)","Tổng tạm tính","Tiền VAT","Tổng cộng","PO Tháng","Trạng thái Vải","Hạn Duyệt (D+18)","Hạn Cắt Vải (D+21)","Hạn Lên Chuyền (D+22)","Hạn Hoàn Thành (D+27)","Trạng thái Bo","Trạng thái NPL","Ngày Đồng Bộ","Ghi Chú","Tổng SL","Danh sách SP","Danh sách Màu"];
  orderSheet.clearContents();
  orderSheet.getRange(1,1,1,orderHeaders.length).setValues([orderHeaders]);
  orderSheet.getRange(1,1,1,orderHeaders.length).setFontWeight("bold").setBackground("#d0e0e3");
  orderSheet.setFrozenRows(1);
  var orderData = [["2026-05-05T10:04:37.564Z","0003/2026/PLMR-TLN","2026-02-15","Admin","PLMR","PLMR-TLN","",0,112860000,0,112860000,"2/2026","Pending","2026-03-05","2026-03-08","2026-03-09","2026-03-14","Pending","Pending","","",1000,"BASIC SYMBOL","KEM VÀNG NEW"],["2026-05-05T10:04:37.564Z","0004/2026/PLMR-TLN","2026-02-15","Admin","PLMR","PLMR-TLN","",0,90288000,0,90288000,"2/2026","Pending","2026-03-05","2026-03-08","2026-03-09","2026-03-14","Pending","Pending","","",800,"BASIC SYMBOL","KHAKI NEW"],["2026-05-05T10:04:37.564Z","0005/2026/PLMR-TLN","2026-02-19","Admin","PLMR","PLMR-TLN","",0,79002000,0,79002000,"2/2026","Pending","2026-03-09","2026-03-12","2026-03-13","2026-03-18","Pending","Pending","","",700,"BASIC SYMBOL","BE NHẠT"],["2026-05-05T10:04:37.564Z","0006/2026/PLMR-TLN","2026-02-19","Admin","PLMR","PLMR-TLN","",0,79002000,0,79002000,"2/2026","Pending","2026-03-09","2026-03-12","2026-03-13","2026-03-18","Pending","Pending","","",700,"BASIC SYMBOL","ĐẤT"],["2026-05-05T10:04:37.564Z","0009/2026/PLMR-AT","2026-02-12","Admin","PLMR","PLMR-AT","",0,127440000,0,127440000,"2/2026","Pending","2026-03-02","2026-03-05","2026-03-06","2026-03-11","Pending","Pending","","",1000,"BASIC DIAMOND","TRẮNG KEM"],["2026-05-05T10:04:37.564Z","0010/2026/PLMR-AT","2026-02-12","Admin","PLMR","PLMR-AT","",0,127440000,0,127440000,"2/2026","Pending","2026-03-02","2026-03-05","2026-03-06","2026-03-11","Pending","Pending","","",1000,"BASIC DIAMOND","BE"],["2026-05-05T10:04:37.564Z","0011/2026/PLMR-AT","2026-02-14","Admin","PLMR","PLMR-AT","",0,76464000,0,76464000,"2/2026","Pending","2026-03-04","2026-03-07","2026-03-08","2026-03-13","Pending","Pending","","",600,"BASIC DIAMOND","XANH KHÓI"],["2026-05-05T10:04:37.564Z","0012/2026/PLMR-AT","2026-02-12","Admin","PLMR","PLMR-AT","",0,76464000,0,76464000,"2/2026","Pending","2026-03-02","2026-03-05","2026-03-06","2026-03-11","Pending","Pending","","",600,"BASIC DIAMOND","XANH DENIM"],["2026-05-05T10:04:37.564Z","0013/2026/PLMR-AT","2026-02-14","Admin","PLMR","PLMR-AT","",0,76464000,0,76464000,"2/2026","Pending","2026-03-04","2026-03-07","2026-03-08","2026-03-13","Pending","Pending","","",600,"BASIC DIAMOND","XANH MINT"],["2026-05-05T10:04:37.564Z","0014/2026/PLMR-AT","2026-04-17","Admin","PLMR","PLMR-AT","",0,80287200,0,80287200,"4/2026","Pending","2026-05-05","2026-05-08","2026-05-09","2026-05-14","Pending","Pending","","",630,"BASIC DIAMOND","ĐỎ NÂU"],["2026-05-05T10:04:37.564Z","0015/2026/PLMR-AT","2026-04-17","Admin","PLMR","PLMR-AT","",0,80287200,0,80287200,"4/2026","Pending","2026-05-05","2026-05-08","2026-05-09","2026-05-14","Pending","Pending","","",630,"BASIC DIAMOND","NAVY NEW"],["2026-05-05T10:04:37.564Z","0016/2026/PLMR-AT","2026-04-17","Admin","PLMR","PLMR-AT","",0,80287200,0,80287200,"4/2026","Pending","2026-05-05","2026-05-08","2026-05-09","2026-05-14","Pending","Pending","","",630,"BASIC DIAMOND","TRẮNG NEW"],["2026-05-05T10:04:37.564Z","0017/2026/PLMR-AT","2026-04-17","Admin","PLMR","PLMR-AT","",0,80287200,0,80287200,"4/2026","Pending","2026-05-05","2026-05-08","2026-05-09","2026-05-14","Pending","Pending","","",630,"BASIC DIAMOND","CÀ PHÊ"],["2026-05-05T10:04:37.564Z","0018/2026/PLMR-AT","2026-04-17","Admin","PLMR","PLMR-AT","",0,80287200,0,80287200,"4/2026","Pending","2026-05-05","2026-05-08","2026-05-09","2026-05-14","Pending","Pending","","",630,"BASIC DIAMOND","BE"],["2026-05-05T10:04:37.564Z","0019/2026/PLMR-TLN","2026-02-14","Admin","PLMR","PLMR-TLN","",0,90288000,0,90288000,"2/2026","Pending","2026-03-04","2026-03-07","2026-03-08","2026-03-13","Pending","Pending","","",800,"BASIC SYMBOL","ĐỎ NÂU"],["2026-05-05T10:04:37.564Z","0020/2026/PLMR-TLN","2026-02-21","Admin","PLMR","PLMR-TLN","",0,90288000,0,90288000,"2/2026","Pending","2026-03-11","2026-03-14","2026-03-15","2026-03-20","Pending","Pending","","",800,"BASIC SYMBOL","XÁM ĐẬM NEW"],["2026-05-05T10:04:37.564Z","0021/2026/PLMR-TLN","2026-02-21","Admin","PLMR","PLMR-TLN","",0,90288000,0,90288000,"2/2026","Pending","2026-03-11","2026-03-14","2026-03-15","2026-03-20","Pending","Pending","","",800,"BASIC SYMBOL","NÂU NHẠT"],["2026-05-05T10:04:37.564Z","0022/2026/PLMR-TLN","2026-02-22","Admin","PLMR","PLMR-TLN","",0,90288000,0,90288000,"2/2026","Pending","2026-03-12","2026-03-15","2026-03-16","2026-03-21","Pending","Pending","","",800,"BASIC SYMBOL","BE HỒNG"],["2026-05-05T10:04:37.564Z","0028/2026/PLMR-TLN","2026-02-12","Admin","PLMR","PLMR-TLN","",0,120916800,0,120916800,"2/2026","Pending","2026-03-02","2026-03-05","2026-03-06","2026-03-11","Pending","Pending","","",600,"ASTON PMD31","ĐEN 84"],["2026-05-05T10:04:37.564Z","0029/2026/PLMR-AT","2026-02-19","Admin","PLMR","PLMR-AT","",0,62100000,0,62100000,"2/2026","Pending","2026-03-09","2026-03-12","2026-03-13","2026-03-18","Pending","Pending","","",500,"CLASSIC","TRẮNG"],["2026-05-05T10:04:37.564Z","0030/2026/PLMR-AT","2026-03-22","Admin","PLMR","PLMR-AT","",0,62100000,0,62100000,"3/2026","Pending","2026-04-09","2026-04-12","2026-04-13","2026-04-18","Pending","Pending","","",500,"CLASSIC","ĐEN"],["2026-05-05T10:04:37.564Z","0031/2026/PLMR-AT","2026-02-20","Admin","PLMR","PLMR-AT","",0,62100000,0,62100000,"2/2026","Pending","2026-03-10","2026-03-13","2026-03-14","2026-03-19","Pending","Pending","","",500,"CLASSIC","XÁM NHẠT"],["2026-05-05T10:04:37.564Z","0032/2026/PLMR-AT","2026-02-20","Admin","PLMR","PLMR-AT","",0,62100000,0,62100000,"2/2026","Pending","2026-03-10","2026-03-13","2026-03-14","2026-03-19","Pending","Pending","","",500,"CLASSIC","KEM NHẠT"],["2026-05-05T10:04:37.564Z","0033/2026/PLMR-TLN","2026-04-07","Admin","PLMR","PLMR-TLN","",0,79002000,0,79002000,"4/2026","Pending","2026-04-25","2026-04-28","2026-04-29","2026-05-04","Pending","Pending","","",700,"BASIC SYMBOL","CAFE"],["2026-05-05T10:04:37.564Z","0034/2026/PLMR-AN","2026-02-27","Admin","PLMR","PLMR-AN","",0,58500000,0,58500000,"2/2026","Pending","2026-03-17","2026-03-20","2026-03-21","2026-03-26","Pending","Pending","","",500,"CLASSIC DIAMOND","NAVY"],["2026-05-05T10:04:37.564Z","0035/2026/PLMR-AT","2026-02-28","Admin","PLMR","PLMR-AT","",0,72900000,0,72900000,"2/2026","Pending","2026-03-18","2026-03-21","2026-03-22","2026-03-27","Pending","Pending","","",500,"ZYBER","ĐEN"],["2026-05-05T10:04:37.564Z","0036/2026/PLMR-AT","2026-02-05","Admin","PLMR","PLMR-AT","",0,99360000,0,99360000,"2/2026","Pending","2026-02-23","2026-02-26","2026-02-27","2026-03-04","Pending","Pending","","",800,"TRAVIS","NAVY"],["2026-05-05T10:04:37.564Z","0037/2026/PLMR-AT","2026-02-12","Admin","PLMR","PLMR-AT","",0,82296000,0,82296000,"2/2026","Pending","2026-03-02","2026-03-05","2026-03-06","2026-03-11","Pending","Pending","","",600,"MAVEN","NAVY"],["2026-05-05T10:04:37.564Z","0038/2026/PLMR-AT","2026-02-25","Admin","PLMR","PLMR-AT","",0,72900000,0,72900000,"2/2026","Pending","2026-03-15","2026-03-18","2026-03-19","2026-03-24","Pending","Pending","","",500,"ZYBER","CAFE"],["2026-05-05T10:04:37.564Z","0039/2026/PLMR-AT","2026-02-26","Admin","PLMR","PLMR-AT","",0,116640000,0,116640000,"2/2026","Pending","2026-03-16","2026-03-19","2026-03-20","2026-03-25","Pending","Pending","","",800,"ZYBER","BE NHẠT"],["2026-05-05T10:04:37.564Z","0041/2026/PLMR-AT","2026-02-22","Admin","PLMR","PLMR-AT","",0,99360000,0,99360000,"2/2026","Pending","2026-03-12","2026-03-15","2026-03-16","2026-03-21","Pending","Pending","","",800,"CLASSIC","XÁM ĐẬM"],["2026-05-05T10:04:37.564Z","0042/2026/PLMR-TLN","2026-02-12","Admin","PLMR","PLMR-TLN","",0,79120800,0,79120800,"2/2026","Pending","2026-03-02","2026-03-05","2026-03-06","2026-03-11","Pending","Pending","","",600,"NIVIX","KEM NHẠT"],["2026-05-05T10:04:37.564Z","0043/2026/PLMR-TLN","2026-02-11","Admin","PLMR","PLMR-TLN","",0,76593600,0,76593600,"2/2026","Pending","2026-03-01","2026-03-04","2026-03-05","2026-03-10","Pending","Pending","","",600,"ADEN","TRẮNG"],["2026-05-05T10:04:37.564Z","0044/2026/PLMR-LC","2026-02-05","Admin","PLMR","PLMR-LC","",0,89600000,0,89600000,"2/2026","Pending","2026-02-23","2026-02-26","2026-02-27","2026-03-04","Pending","Pending","","",800,"SHORT KAKI","BE"],["2026-05-05T10:04:37.564Z","0045/2026/PLMR-LC","2026-02-05","Admin","PLMR","PLMR-LC","",0,56000000,0,56000000,"2/2026","Pending","2026-02-23","2026-02-26","2026-02-27","2026-03-04","Pending","Pending","","",500,"SHORT KAKI","BE ĐẬM"],["2026-05-05T10:04:37.564Z","0046/2026/PLMR-LC","2026-02-05","Admin","PLMR","PLMR-LC","",0,56000000,0,56000000,"2/2026","Pending","2026-02-23","2026-02-26","2026-02-27","2026-03-04","Pending","Pending","","",500,"SHORT KAKI","NÂU"],["2026-05-05T10:04:37.564Z","0047/2026/PLMR-AT","2026-02-07","Admin","PLMR","PLMR-AT","",0,83592000,0,83592000,"2/2026","Pending","2026-02-25","2026-02-28","2026-03-01","2026-03-06","Pending","Pending","","",600,"IRISH PMD35","KEM"],["2026-05-05T10:04:37.564Z","0049/2026/PLMR-TLN","2026-03-06","Admin","PLMR","PLMR-TLN","",0,50787000,0,50787000,"3/2026","Pending","2026-03-24","2026-03-27","2026-03-28","2026-04-02","Pending","Pending","","",450,"BASIC SYMBOL","TRẮNG"],["2026-05-05T10:04:37.564Z","0050/2026/PLMR-TLN","2026-02-20","Admin","PLMR","PLMR-TLN","",0,112860000,0,112860000,"2/2026","Pending","2026-03-10","2026-03-13","2026-03-14","2026-03-19","Pending","Pending","","",1000,"BASIC SYMBOL","ĐEN"],["2026-05-05T10:04:37.564Z","0051/2026/PLMR-TLN","2026-02-26","Admin","PLMR","PLMR-TLN","",0,67716000,0,67716000,"2/2026","Pending","2026-03-16","2026-03-19","2026-03-20","2026-03-25","Pending","Pending","","",600,"BASIC SYMBOL","KEM NHẠT"],["2026-05-05T10:04:37.564Z","0053/2026/PLMR-TLN","2026-03-19","Admin","PLMR","PLMR-TLN","",0,112860000,0,112860000,"3/2026","Pending","2026-04-06","2026-04-09","2026-04-10","2026-04-15","Pending","Pending","","",1000,"BASIC SYMBOL","TRẮNG"],["2026-05-05T10:04:37.564Z","0054/2026/PLMR-TLN","","Admin","PLMR","PLMR-TLN","",0,56430000,0,56430000,"","Pending","","","","","Pending","Pending","","",500,"BASIC SYMBOL","ĐEN"],["2026-05-05T10:04:37.564Z","0055/2026/PLMR-TLN","","Admin","PLMR","PLMR-TLN","",0,90288000,0,90288000,"","Pending","","","","","Pending","Pending","","",800,"BASIC SYMBOL","KEM NHẠT"],["2026-05-05T10:04:37.564Z","0056/2026/PLMR-TLN","2026-03-27","Admin","PLMR","PLMR-TLN","",0,90288000,0,90288000,"3/2026","Pending","2026-04-14","2026-04-17","2026-04-18","2026-04-23","Pending","Pending","","",800,"BASIC SYMBOL","NAVY"],["2026-05-05T10:04:37.564Z","0057/2026/PLMR-TLN","2026-03-06","Admin","PLMR","PLMR-TLN","",0,97027200,0,97027200,"3/2026","Pending","2026-03-24","2026-03-27","2026-03-28","2026-04-02","Pending","Pending","","",800,"JAY","TRẮNG"],["2026-05-05T10:04:37.564Z","0058/2026/PLMR-TLN","2026-03-06","Admin","PLMR","PLMR-TLN","",0,97027200,0,97027200,"3/2026","Pending","2026-03-24","2026-03-27","2026-03-28","2026-04-02","Pending","Pending","","",800,"JAY","NAVY"],["2026-05-05T10:04:37.564Z","0059/2026/PLMR-TLN","2026-02-11","Admin","PLMR","PLMR-TLN","",0,90288000,0,90288000,"2/2026","Pending","2026-03-01","2026-03-04","2026-03-05","2026-03-10","Pending","Pending","","",800,"BASIC SYMBOL","CAFE"],["2026-05-05T10:04:37.564Z","0060/2026/PLMR-TLN","2026-02-12","Admin","PLMR","PLMR-TLN","",0,169290000,0,169290000,"2/2026","Pending","2026-03-02","2026-03-05","2026-03-06","2026-03-11","Pending","Pending","","",1500,"BASIC SYMBOL","ĐEN"],["2026-05-05T10:04:37.564Z","0061/2026/PLMR-TLN","2026-02-11","Admin","PLMR","PLMR-TLN","",0,45144000,0,45144000,"2/2026","Pending","2026-03-01","2026-03-04","2026-03-05","2026-03-10","Pending","Pending","","",400,"BASIC SYMBOL","NAVY"],["2026-05-05T10:04:37.564Z","0062/2026/PLMR-AT","2026-02-19","Admin","PLMR","PLMR-AT","",0,74520000,0,74520000,"2/2026","Pending","2026-03-09","2026-03-12","2026-03-13","2026-03-18","Pending","Pending","","",600,"CLASSIC","ĐEN"],["2026-05-05T10:04:37.564Z","0063/2026/PLMR-AT","2026-02-06","Admin","PLMR","PLMR-AT","",0,101952000,0,101952000,"2/2026","Pending","2026-02-24","2026-02-27","2026-02-28","2026-03-05","Pending","Pending","","",800,"BASIC DIAMOND","NAVY"],["2026-05-05T10:04:37.564Z","0064/2026/PLMR-LC","2026-02-05","Admin","PLMR","PLMR-LC","",0,360000000,0,360000000,"2/2026","Pending","2026-02-23","2026-02-26","2026-02-27","2026-03-04","Pending","Pending","","",2000,"JEAN STRAIGHT","XANH NHẠT"],["2026-05-05T10:04:37.564Z","0065/2026/PLMR-AT","2026-02-04","Admin","PLMR","PLMR-AT","",0,63720000,0,63720000,"2/2026","Pending","2026-02-22","2026-02-25","2026-02-26","2026-03-03","Pending","Pending","","",500,"BASIC DIAMOND","ĐEN"],["2026-05-05T10:04:37.564Z","0066/2026/PLMR-AT","2026-02-04","Admin","PLMR","PLMR-AT","",0,63720000,0,63720000,"2/2026","Pending","2026-02-22","2026-02-25","2026-02-26","2026-03-03","Pending","Pending","","",500,"BASIC DIAMOND","TRẮNG"],["2026-05-05T10:04:37.564Z","0068/2026/PLMR-AT","2026-02-05","Admin","PLMR","PLMR-AT","",0,111780000,0,111780000,"2/2026","Pending","2026-02-23","2026-02-26","2026-02-27","2026-03-04","Pending","Pending","","",900,"CLASSIC DIAMOND V2","BE NHẠT"],["2026-05-05T10:04:37.564Z","0069/2026/PLMR-AN","2026-03-06","Admin","PLMR","PLMR-AN","",0,58500000,0,58500000,"3/2026","Pending","2026-03-24","2026-03-27","2026-03-28","2026-04-02","Pending","Pending","","",500,"CLASSIC DIAMOND","NAVY"],["2026-05-05T10:04:37.564Z","0070/2026/PLMR-TT","2026-02-15","Admin","PLMR","PLMR-TT","",0,15660000,0,15660000,"2/2026","Pending","2026-03-05","2026-03-08","2026-03-09","2026-03-14","Pending","Pending","","",1000,"VỚ LOGO","ĐEN"],["2026-05-05T10:04:37.564Z","0071/2026/PLMR-TT","2026-02-15","Admin","PLMR","PLMR-TT","",0,15660000,0,15660000,"2/2026","Pending","2026-03-05","2026-03-08","2026-03-09","2026-03-14","Pending","Pending","","",1000,"VỚ LOGO","TRẮNG"],["2026-05-05T10:04:37.564Z","0072/2026/PLMR-TLN","2026-03-08","Admin","PLMR","PLMR-TLN","",0,108000000,0,108000000,"3/2026","Pending","2026-03-26","2026-03-29","2026-03-30","2026-04-04","Pending","Pending","","",800,"NORF","TRẮNG"],["2026-05-05T10:04:37.564Z","0074/2026/PLMR-AT","2026-03-26","Admin","PLMR","PLMR-AT","",0,62100000,0,62100000,"3/2026","Pending","2026-04-13","2026-04-16","2026-04-17","2026-04-22","Pending","Pending","","",500,"TRAVIS","NAVY"],["2026-05-05T10:04:37.564Z","0077/2026/PLMR-AT","2026-03-07","Admin","PLMR","PLMR-AT","",0,111456000,0,111456000,"3/2026","Pending","2026-03-25","2026-03-28","2026-03-29","2026-04-03","Pending","Pending","","",800,"LINE","NAVY"],["2026-05-05T10:04:37.564Z","0078/2026/PLMR-AT","2026-03-07","Admin","PLMR","PLMR-AT","",0,100224000,0,100224000,"3/2026","Pending","2026-03-25","2026-03-28","2026-03-29","2026-04-03","Pending","Pending","","",800,"TRAVIS","CAFE"],["2026-05-05T10:04:37.564Z","0084/2026/PLMR-LC","","Admin","PLMR","PLMR-LC","",0,96320000,0,96320000,"","Pending","","","","","Pending","Pending","","",860,"SHORT KAKI","ĐEN"],["2026-05-05T10:04:37.564Z","0085/2026/PLMR-LC","","Admin","PLMR","PLMR-LC","",0,61500000,0,61500000,"","Pending","","","","","Pending","Pending","","",500,"KAKI SD","NÂU"],["2026-05-05T10:04:37.564Z","0086/2026/PLMR-LC","","Admin","PLMR","PLMR-LC","",0,85527000,0,85527000,"","Pending","","","","","Pending","Pending","","",559,"QUẦN TÂY LƯNG CHUN","ĐEN"],["2026-05-05T10:04:37.564Z","0088/2026/PLMR-TLN","2026-04-28","Admin","PLMR","PLMR-TLN","",0,79002000,0,79002000,"4/2026","Pending","2026-05-16","2026-05-19","2026-05-20","2026-05-25","Pending","Pending","","",700,"CLASSIC","CAFE"],["2026-05-05T10:04:37.564Z","0090/2026/PLMR-AT","2026-03-18","Admin","PLMR","PLMR-AT","",0,102816000,0,102816000,"3/2026","Pending","2026-04-05","2026-04-08","2026-04-09","2026-04-14","Pending","Pending","","",800,"CLASSIC DIAMOND V2","ĐỎ NÂU"],["2026-05-05T10:04:37.564Z","0091/2026/PLMR-TLN","2026-03-25","Admin","PLMR","PLMR-TLN","",0,90288000,0,90288000,"3/2026","Pending","2026-04-12","2026-04-15","2026-04-16","2026-04-21","Pending","Pending","","",800,"BASIC SYMBOL","BE"],["2026-05-05T10:04:37.564Z","0093/2026/PLMR-TLN","2026-05-20","Admin","PLMR","PLMR-TLN","",0,74066400,0,74066400,"5/2026","Pending","2026-06-07","2026-06-10","2026-06-11","2026-06-16","Pending","Pending","","",600,"THOMAS","BE"],["2026-05-05T10:04:37.564Z","0094/2026/PLMR-TLN","2026-03-21","Admin","PLMR","PLMR-TLN","",0,101260800,0,101260800,"3/2026","Pending","2026-04-08","2026-04-11","2026-04-12","2026-04-17","Pending","Pending","","",800,"WICK","BE ĐẬM"],["2026-05-05T10:04:37.564Z","0095/2026/PLMR-TLN","2026-03-21","Admin","PLMR","PLMR-TLN","",0,97027200,0,97027200,"3/2026","Pending","2026-04-08","2026-04-11","2026-04-12","2026-04-17","Pending","Pending","","",800,"JAY","KEM NHẠT"],["2026-05-05T10:04:37.564Z","0097/2026/PLMR-LC","2026-03-13","Admin","PLMR","PLMR-LC","",0,89600000,0,89600000,"3/2026","Pending","2026-03-31","2026-04-03","2026-04-04","2026-04-09","Pending","Pending","","",800,"SHORT KAKI","ĐEN"],["2026-05-05T10:04:37.564Z","0098/2026/PLMR-LC","2026-03-13","Admin","PLMR","PLMR-LC","",0,86240000,0,86240000,"3/2026","Pending","2026-03-31","2026-04-03","2026-04-04","2026-04-09","Pending","Pending","","",770,"SHORT KAKI","TRẮNG"],["2026-05-05T10:04:37.564Z","0099/2026/PLMR-LC","2026-03-13","Admin","PLMR","PLMR-LC","",0,94710000,0,94710000,"3/2026","Pending","2026-03-31","2026-04-03","2026-04-04","2026-04-09","Pending","Pending","","",770,"KAKI SD","ĐEN"],["2026-05-05T10:04:37.564Z","0100/2026/PLMR-LC","2026-03-13","Admin","PLMR","PLMR-LC","",0,45510000,0,45510000,"3/2026","Pending","2026-03-31","2026-04-03","2026-04-04","2026-04-09","Pending","Pending","","",370,"KAKI SD","BE"],["2026-05-05T10:04:37.564Z","0101/2026/PLMR-LC","2026-03-27","Admin","PLMR","PLMR-LC","",0,109470000,0,109470000,"3/2026","Pending","2026-04-14","2026-04-17","2026-04-18","2026-04-23","Pending","Pending","","",890,"KAKI SD","NÂU"],["2026-05-05T10:04:37.564Z","0102/2026/PLMR-LC","2026-03-10","Admin","PLMR","PLMR-LC","",0,52920000,0,52920000,"3/2026","Pending","2026-03-28","2026-03-31","2026-04-01","2026-04-06","Pending","Pending","","",294,"JEAN STRAIGHT","XANH NHẠT"],["2026-05-05T10:04:37.564Z","0103/2026/PLMR-LC","2026-03-27","Admin","PLMR","PLMR-LC","",0,87669000,0,87669000,"3/2026","Pending","2026-04-14","2026-04-17","2026-04-18","2026-04-23","Pending","Pending","","",573,"QUẦN TÂY LƯNG CHUN","BE"],["2026-05-05T10:04:37.564Z","0104/2026/PLMR-LC","2026-03-27","Admin","PLMR","PLMR-LC","",0,73872000,0,73872000,"3/2026","Pending","2026-04-14","2026-04-17","2026-04-18","2026-04-23","Pending","Pending","","",600,"SHORT KAKI","BE ĐẬM"],["2026-05-05T10:04:37.564Z","0105/2026/PLMR-LC","2026-03-27","Admin","PLMR","PLMR-LC","",0,101088000,0,101088000,"3/2026","Pending","2026-04-14","2026-04-17","2026-04-18","2026-04-23","Pending","Pending","","",600,"QUẦN TÂY LƯNG CHUN","ĐEN"],["2026-05-05T10:04:37.564Z","0106/2026/PLMR-LC","2026-04-02","Admin","PLMR","PLMR-LC","",0,97200000,0,97200000,"4/2026","Pending","2026-04-20","2026-04-23","2026-04-24","2026-04-29","Pending","Pending","","",500,"KAKI STRAIGHT","BE"],["2026-05-05T10:04:37.564Z","0107/2026/PLMR-LC","2026-04-02","Admin","PLMR","PLMR-LC","",0,97200000,0,97200000,"4/2026","Pending","2026-04-20","2026-04-23","2026-04-24","2026-04-29","Pending","Pending","","",500,"KAKI STRAIGHT","ĐEN"],["2026-05-05T10:04:37.564Z","0108/2026/PLMR-LC","2026-04-02","Admin","PLMR","PLMR-LC","",0,97200000,0,97200000,"4/2026","Pending","2026-04-20","2026-04-23","2026-04-24","2026-04-29","Pending","Pending","","",500,"KAKI STRAIGHT","NÂU"],["2026-05-05T10:04:37.564Z","0109/2026/PLMR-LC","2026-04-02","Admin","PLMR","PLMR-LC","",0,155520000,0,155520000,"4/2026","Pending","2026-04-20","2026-04-23","2026-04-24","2026-04-29","Pending","Pending","","",800,"KAKI STRAIGHT","KEM"],["2026-05-05T10:04:37.564Z","0110/2026/PLMR-GLX","2026-04-01","Admin","PLMR","PLMR-GLX","",0,120096000,0,120096000,"4/2026","Pending","2026-04-19","2026-04-22","2026-04-23","2026-04-28","Pending","Pending","","",800,"Sơ mi OXFORD PREMIUM","TRẮNG 02"],["2026-05-05T10:04:37.564Z","0111/2026/PLMR-GLX","","Admin","PLMR","PLMR-GLX","",0,127872000,0,127872000,"","Pending","","","","","Pending","Pending","","",800,"Sơ mi OXFORD PREMIUM","NAVY 35"],["2026-05-05T10:04:37.564Z","0112/2026/PLMR-GLX","2026-04-01","Admin","PLMR","PLMR-GLX","",0,120096000,0,120096000,"4/2026","Pending","2026-04-19","2026-04-22","2026-04-23","2026-04-28","Pending","Pending","","",800,"Sơ mi OXFORD PREMIUM","XANH NHẠT 07"],["2026-05-05T10:04:37.564Z","0113/2026/PLMR-GLX","2026-04-01","Admin","PLMR","PLMR-GLX","",0,120096000,0,120096000,"4/2026","Pending","2026-04-19","2026-04-22","2026-04-23","2026-04-28","Pending","Pending","","",800,"Sơ mi OXFORD PREMIUM","BE"],["2026-05-05T10:04:37.564Z","0114/2026/PLMR-GLX","","Admin","PLMR","PLMR-GLX","",0,127872000,0,127872000,"","Pending","","","","","Pending","Pending","","",800,"Sơ mi OXFORD PREMIUM","ĐEN"],["2026-05-05T10:04:37.564Z","0115/2026/PLMR-GLX","","Admin","PLMR","PLMR-GLX","",0,89748000,0,89748000,"","Pending","","","","","Pending","Pending","","",600,"Sơ mi POPLIN","TRẮNG 02"],["2026-05-05T10:04:37.564Z","0116/2026/PLMR-GLX","2026-03-28","Admin","PLMR","PLMR-GLX","",0,89748000,0,89748000,"3/2026","Pending","2026-04-15","2026-04-18","2026-04-19","2026-04-24","Pending","Pending","","",600,"Sơ mi POPLIN","ĐEN 147"],["2026-05-05T10:04:37.564Z","0118/2026/PLMR-AT","2026-04-17","Admin","PLMR","PLMR-AT","",0,71280000,0,71280000,"4/2026","Pending","2026-05-05","2026-05-08","2026-05-09","2026-05-14","Pending","Pending","","",600,"BASIC CLASSIC","XÁM NHẠT"],["2026-05-05T10:04:37.564Z","0119/2026/PLMR-TLN","","Admin","PLMR","PLMR-TLN","",0,67716000,0,67716000,"","Pending","","","","","Pending","Pending","","",600,"BASIC CLASSIC","TRẮNG"],["2026-05-05T10:04:37.564Z","0120/2026/PLMR-AT","","Admin","PLMR","PLMR-AT","",0,83160000,0,83160000,"","Pending","","","","","Pending","Pending","","",700,"BASIC CLASSIC","NAVY KEM"],["2026-05-05T10:04:37.564Z","0121/2026/PLMR-TLN","","Admin","PLMR","PLMR-TLN","",0,67716000,0,67716000,"","Pending","","","","","Pending","Pending","","",600,"BASIC CLASSIC","KHAKI"],["2026-05-05T10:04:37.564Z","0122/2026/PLMR-AT","2026-04-06","Admin","PLMR","PLMR-AT","",0,102816000,0,102816000,"4/2026","Pending","2026-04-24","2026-04-27","2026-04-28","2026-05-03","Pending","Pending","","",800,"BASIC DIAMOND","KEM"],["2026-05-05T10:04:37.564Z","0123/2026/PLMR-AT","2026-04-12","Admin","PLMR","PLMR-AT","",0,102816000,0,102816000,"4/2026","Pending","2026-04-30","2026-05-03","2026-05-04","2026-05-09","Pending","Pending","","",800,"CLASSIC DIAMOND V2","XANH KHÓI"],["2026-05-05T10:04:37.564Z","0124/2026/PLMR-AT","2026-04-12","Admin","PLMR","PLMR-AT","",0,102816000,0,102816000,"4/2026","Pending","2026-04-30","2026-05-03","2026-05-04","2026-05-09","Pending","Pending","","",800,"CLASSIC DIAMOND V2","XANH DENIM"],["2026-05-05T10:04:37.564Z","0129/2026/PLMR-AT","2026-04-30","Admin","PLMR","PLMR-AT","",0,111456000,0,111456000,"4/2026","Pending","2026-05-18","2026-05-21","2026-05-22","2026-05-27","Pending","Pending","","",800,"PHILO PK75","TRẮNG KEM"],["2026-05-05T10:04:37.564Z","0130/2026/PLMR-AT","2026-04-30","Admin","PLMR","PLMR-AT","",0,119232000,0,119232000,"4/2026","Pending","2026-05-18","2026-05-21","2026-05-22","2026-05-27","Pending","Pending","","",800,"KITT PMK82","XANH MINT"],["2026-05-05T10:04:37.564Z","0131/2026/PLMR-TLN","2026-04-13","Admin","PLMR","PLMR-TLN","",0,56430000,0,56430000,"4/2026","Pending","2026-05-01","2026-05-04","2026-05-05","2026-05-10","Pending","Pending","","",500,"BASIC SYMBOL","ĐEN"],["2026-05-05T10:04:37.564Z","0132/2026/PLMR-TLN","","Admin","PLMR","PLMR-TLN","",0,112860000,0,112860000,"","Pending","","","","","Pending","Pending","","",1000,"BASIC SYMBOL","TRẮNG"],["2026-05-05T10:04:37.564Z","0133/2026/PLMR-TLN","2026-04-18","Admin","PLMR","PLMR-TLN","",0,90288000,0,90288000,"4/2026","Pending","2026-05-06","2026-05-09","2026-05-10","2026-05-15","Pending","Pending","","",800,"BASIC SYMBOL","NAVY"],["2026-05-05T10:04:37.564Z","0134/2026/PLMR-TLN","2026-04-13","Admin","PLMR","PLMR-TLN","",0,67716000,0,67716000,"4/2026","Pending","2026-05-01","2026-05-04","2026-05-05","2026-05-10","Pending","Pending","","",600,"BASIC SYMBOL","BE NHẠT"],["2026-05-05T10:04:37.564Z","0135/2026/PLMR-TLN","2026-04-06","Admin","PLMR","PLMR-TLN","",0,100915200,0,100915200,"4/2026","Pending","2026-04-24","2026-04-27","2026-04-28","2026-05-03","Pending","Pending","","",800,"BASIC DIAMOND","OLIU"],["2026-05-05T10:04:37.564Z","0136/2026/PLMR-TLN","2026-04-06","Admin","PLMR","PLMR-TLN","",0,100915200,0,100915200,"4/2026","Pending","2026-04-24","2026-04-27","2026-04-28","2026-05-03","Pending","Pending","","",800,"BASIC DIAMOND","RÊU"],["2026-05-05T10:04:37.564Z","0137/2026/PLMR-TLN","2026-04-06","Admin","PLMR","PLMR-TLN","",0,100915200,0,100915200,"4/2026","Pending","2026-04-24","2026-04-27","2026-04-28","2026-05-03","Pending","Pending","","",800,"BASIC DIAMOND","INDIGO"],["2026-05-05T10:04:37.564Z","0138/2026/PLMR-TLN","2026-04-23","Admin","PLMR","PLMR-TLN","",0,76593600,0,76593600,"4/2026","Pending","2026-05-11","2026-05-14","2026-05-15","2026-05-20","Pending","Pending","","",600,"ADEN","TRẮNG"],["2026-05-05T10:04:37.564Z","0139/2026/PLMR-TLN","2026-04-16","Admin","PLMR","PLMR-TLN","",0,79120800,0,79120800,"4/2026","Pending","2026-05-04","2026-05-07","2026-05-08","2026-05-13","Pending","Pending","","",600,"NIVIX","KEM NHẠT"],["2026-05-05T10:04:37.564Z","0140/2026/PLMR-TLN","2026-04-16","Admin","PLMR","PLMR-TLN","",0,101260800,0,101260800,"4/2026","Pending","2026-05-04","2026-05-07","2026-05-08","2026-05-13","Pending","Pending","","",800,"RUM","KEM NHẠT"],["2026-05-05T10:04:37.564Z","0141/2026/PLMR-TLN","2026-04-16","Admin","PLMR","PLMR-TLN","",0,97891200,0,97891200,"4/2026","Pending","2026-05-04","2026-05-07","2026-05-08","2026-05-13","Pending","Pending","","",800,"ANDY","KEM NHẠT"],["2026-05-05T10:04:37.564Z","0142/2026/PLMR-TLN","","Admin","PLMR","PLMR-TLN","",0,64368000,0,64368000,"","Pending","","","","","Pending","Pending","","",500,"KANE","BE ĐẬM"],["2026-05-05T10:04:37.564Z","0146/2026/PLMR-TLN","2026-04-08","Admin","PLMR","PLMR-TLN","",0,108864000,0,108864000,"4/2026","Pending","2026-04-26","2026-04-29","2026-04-30","2026-05-05","Pending","Pending","","",800,"TORA - PMB85","KEM  NHẠT"],["2026-05-05T10:04:37.564Z","0147/2026/PLMR-TLN","2026-04-08","Admin","PLMR","PLMR-TLN","",0,102988800,0,102988800,"4/2026","Pending","2026-04-26","2026-04-29","2026-04-30","2026-05-05","Pending","Pending","","",800,"ALLI - PMB81","KEM VÀNG"],["2026-05-05T10:04:37.564Z","0148/2026/PLMR-LC","2026-04-24","Admin","PLMR","PLMR-LC","",0,97200000,0,97200000,"4/2026","Pending","2026-05-12","2026-05-15","2026-05-16","2026-05-21","Pending","Pending","","",500,"JEAN STRAIGHT","ĐEN"],["2026-05-05T10:04:37.564Z","0149/2026/PLMR-LC","2026-04-24","Admin","PLMR","PLMR-LC","",0,97200000,0,97200000,"4/2026","Pending","2026-05-12","2026-05-15","2026-05-16","2026-05-21","Pending","Pending","","",500,"JEAN STRAIGHT","XANH ĐẬM"],["2026-05-05T10:04:37.564Z","0150/2026/PLMR-LC","2026-04-29","Admin","PLMR","PLMR-LC","",0,81648000,0,81648000,"4/2026","Pending","2026-05-17","2026-05-20","2026-05-21","2026-05-26","Pending","Pending","","",600,"KAKI SD","BE"],["2026-05-05T10:04:37.564Z","0151/2026/PLMR-LC","","Admin","PLMR","PLMR-LC","",0,101088000,0,101088000,"","Pending","","","","","Pending","Pending","","",600,"QUẦN TÂY LƯNG CHUN","ĐEN"],["2026-05-05T10:04:37.564Z","0152/2026/PLMR-GLX","2026-04-25","Admin","PLMR","PLMR-GLX","",0,120096000,0,120096000,"4/2026","Pending","2026-05-13","2026-05-16","2026-05-17","2026-05-22","Pending","Pending","","",800,"Sơ mi  OXFORD PREMIUM","TRẮNG 02"],["2026-05-05T10:04:37.564Z","0153/2026/PLMR-GLX","2026-04-25","Admin","PLMR","PLMR-GLX","",0,127872000,0,127872000,"4/2026","Pending","2026-05-13","2026-05-16","2026-05-17","2026-05-22","Pending","Pending","","",800,"Sơ mi OXFORD PREMIUM","NAVY 35"],["2026-05-05T10:04:37.564Z","0154/2026/PLMR-GLX","2026-04-25","Admin","PLMR","PLMR-GLX","",0,105084000,0,105084000,"4/2026","Pending","2026-05-13","2026-05-16","2026-05-17","2026-05-22","Pending","Pending","","",700,"Sơ mi OXFORD PREMIUM","BE"],["2026-05-05T10:04:37.564Z","0155/2026/PLMR-GLX","2026-04-25","Admin","PLMR","PLMR-GLX","",0,95904000,0,95904000,"4/2026","Pending","2026-05-13","2026-05-16","2026-05-17","2026-05-22","Pending","Pending","","",600,"Sơ mi OXFORD PREMIUM","ĐEN"],["2026-05-05T10:04:37.564Z","0156/2026/PLMR-GLX","2026-05-02","Admin","PLMR","PLMR-GLX","",0,82296000,0,82296000,"5/2026","Pending","2026-05-20","2026-05-23","2026-05-24","2026-05-29","Pending","Pending","","",600,"Sơ mi TAY NGẮN OXFORD","TRẮNG"],["2026-05-05T10:04:37.564Z","0157/2026/PLMR-GLX","2026-05-02","Admin","PLMR","PLMR-GLX","",0,86184000,0,86184000,"5/2026","Pending","2026-05-20","2026-05-23","2026-05-24","2026-05-29","Pending","Pending","","",600,"Sơ mi TAY NGẮN OXFORD","ĐEN"],["2026-05-05T10:04:37.564Z","0158/2026/PLMR-GLX","2026-05-02","Admin","PLMR","PLMR-GLX","",0,86184000,0,86184000,"5/2026","Pending","2026-05-20","2026-05-23","2026-05-24","2026-05-29","Pending","Pending","","",600,"Sơ mi TAY NGẮN OXFORD","NAVY"],["2026-05-05T10:04:37.564Z","0159/2026/PLMR-TLN","","Admin","PLMR","PLMR-TLN","",0,67716000,0,67716000,"","Pending","","","","","Pending","Pending","","",600,"BASIC CLASSIC","KEM NHẠT"],["2026-05-05T10:04:37.564Z","0160/2026/PLMR-TLN","","Admin","PLMR","PLMR-TLN","",0,67716000,0,67716000,"","Pending","","","","","Pending","Pending","","",600,"BASIC CLASSIC","ĐEN"],["2026-05-05T10:04:37.564Z","0161/2026/PLMR-AT","2026-05-17","Admin","PLMR","PLMR-AT","",0,77112000,0,77112000,"5/2026","Pending","2026-06-04","2026-06-07","2026-06-08","2026-06-13","Pending","Pending","","",600,"BASIC DIAMOND","CHOCO"],["2026-05-05T10:04:37.564Z","0162/2026/PLMR-AT","2026-05-17","Admin","PLMR","PLMR-AT","",0,77112000,0,77112000,"5/2026","Pending","2026-06-04","2026-06-07","2026-06-08","2026-06-13","Pending","Pending","","",600,"BASIC DIAMOND","XANH LÁ"],["2026-05-05T10:04:37.564Z","0164/2026/PLMR-AT","2026-05-22","Admin","PLMR","PLMR-AT","",0,75816000,0,75816000,"5/2026","Pending","2026-06-09","2026-06-12","2026-06-13","2026-06-18","Pending","Pending","","",600,"CLASSIC DIAMOND V2","NAVY"],["2026-05-05T10:04:37.564Z","0165/2026/PLMR-AT","2026-05-22","Admin","PLMR","PLMR-AT","",0,75816000,0,75816000,"5/2026","Pending","2026-06-09","2026-06-12","2026-06-13","2026-06-18","Pending","Pending","","",600,"CLASSIC DIAMOND V2","TRẮNG"],["2026-05-05T10:04:37.564Z","0166/2026/PLMR-TLN","2026-05-07","Admin","PLMR","PLMR-TLN","",0,112860000,0,112860000,"5/2026","Pending","2026-05-25","2026-05-28","2026-05-29","2026-06-03","Pending","Pending","","",1000,"BASIC SYMBOL","TRẮNG"],["2026-05-05T10:04:37.564Z","0167/2026/PLMR-TLN","2026-05-16","Admin","PLMR","PLMR-TLN","",0,90288000,0,90288000,"5/2026","Pending","2026-06-03","2026-06-06","2026-06-07","2026-06-12","Pending","Pending","","",800,"BASIC SYMBOL","NAVY"],["2026-05-05T10:04:37.564Z","0168/2026/PLMR-TLN","2026-05-16","Admin","PLMR","PLMR-TLN","",0,67716000,0,67716000,"5/2026","Pending","2026-06-03","2026-06-06","2026-06-07","2026-06-12","Pending","Pending","","",600,"BASIC SYMBOL","KEM NHẠT"],["2026-05-05T10:04:37.564Z","0169/2026/PLMR-TLN","2026-05-16","Admin","PLMR","PLMR-TLN","",0,67716000,0,67716000,"5/2026","Pending","2026-06-03","2026-06-06","2026-06-07","2026-06-12","Pending","Pending","","",600,"BASIC SYMBOL","XANH LÁ"],["2026-05-05T10:04:37.564Z","0170/2026/PLMR-TLN","","Admin","PLMR","PLMR-TLN","",0,90288000,0,90288000,"","Pending","","","","","Pending","Pending","","",800,"BASIC SYMBOL","ĐỎ NÂU"],["2026-05-05T10:04:37.564Z","0171/2026/PLMR-TLN","2026-05-13","Admin","PLMR","PLMR-TLN","",0,67716000,0,67716000,"5/2026","Pending","2026-05-31","2026-06-03","2026-06-04","2026-06-09","Pending","Pending","","",600,"BASIC SYMBOL","KEM VÀNG"],["2026-05-05T10:04:37.564Z","0173/2026/PLMR-TLN","2026-05-28","Admin","PLMR","PLMR-TLN","",0,102124800,0,102124800,"5/2026","Pending","2026-06-15","2026-06-18","2026-06-19","2026-06-24","Pending","Pending","","",800,"LOKI PMD19","NAVY"],["2026-05-05T10:04:37.564Z","0175/2026/PLMR-TLN","","Admin","PLMR","PLMR-TLN","",0,97027200,0,97027200,"","Pending","","","","","Pending","Pending","","",800,"JAY PMK16","KEM NHẠT"],["2026-05-05T10:04:37.564Z","0176/2026/PLMR-TLN","","Admin","PLMR","PLMR-TLN","",0,103852800,0,103852800,"","Pending","","","","","Pending","Pending","","",800,"DAVID PMK17","TRẮNG"],["2026-05-05T10:04:37.564Z","0177/2026/PLMR-TLN","2026-05-07","Admin","PLMR","PLMR-TLN","",0,75378600,0,75378600,"5/2026","Pending","2026-05-25","2026-05-28","2026-05-29","2026-06-03","Pending","Pending","","",550,"DALE  PMB86","KEM VÀNG"],["2026-05-05T10:04:37.564Z","0179/2026/PLMR-LC","2026-05-15","Admin","PLMR","PLMR-LC","",0,73872000,0,73872000,"5/2026","Pending","2026-06-02","2026-06-05","2026-06-06","2026-06-11","Pending","Pending","","",600,"SHORT KAKI","ĐEN"],["2026-05-05T10:04:37.564Z","0180/2026/PLMR-LC","2026-05-15","Admin","PLMR","PLMR-LC","",0,73872000,0,73872000,"5/2026","Pending","2026-06-02","2026-06-05","2026-06-06","2026-06-11","Pending","Pending","","",600,"SHORT KAKI","BE ĐẬM"],["2026-05-05T10:04:37.564Z","0181/2026/PLMR-LC","2026-05-15","Admin","PLMR","PLMR-LC","",0,98496000,0,98496000,"5/2026","Pending","2026-06-02","2026-06-05","2026-06-06","2026-06-11","Pending","Pending","","",800,"SHORT KAKI","TRẮNG"],["2026-05-05T10:04:37.564Z","0182/2026/PLMR-LC","","Admin","PLMR","PLMR-LC","",0,97200000,0,97200000,"","Pending","","","","","Pending","Pending","","",500,"KAKI STRAIGHT","BE"],["2026-05-05T10:04:37.564Z","0183/2026/PLMR-LC","","Admin","PLMR","PLMR-LC","",0,97200000,0,97200000,"","Pending","","","","","Pending","Pending","","",500,"KAKI STRAIGHT","ĐEN"],["2026-05-05T10:04:37.564Z","0184/2026/PLMR-LC","","Admin","PLMR","PLMR-LC","",0,97200000,0,97200000,"","Pending","","","","","Pending","Pending","","",500,"KAKI STRAIGHT","NÂU"],["2026-05-05T10:04:37.564Z","0185/2026/PLMR-LC","2026-05-31","Admin","PLMR","PLMR-LC","",0,68040000,0,68040000,"5/2026","Pending","2026-06-18","2026-06-21","2026-06-22","2026-06-27","Pending","Pending","","",500,"KAKI SD","ĐEN"],["2026-05-05T10:04:37.564Z","0186/2026/PLMR-LC","2026-05-31","Admin","PLMR","PLMR-LC","",0,68040000,0,68040000,"5/2026","Pending","2026-06-18","2026-06-21","2026-06-22","2026-06-27","Pending","Pending","","",500,"KAKI SD","BE"],["2026-05-05T10:04:37.564Z","0187/2026/PLMR-LC","2026-05-31","Admin","PLMR","PLMR-LC","",0,68040000,0,68040000,"5/2026","Pending","2026-06-18","2026-06-21","2026-06-22","2026-06-27","Pending","Pending","","",500,"KAKI SD","NÂU"],["2026-05-05T10:04:37.564Z","0188/2026/PLMR-LC","","Admin","PLMR","PLMR-LC","",0,101088000,0,101088000,"","Pending","","","","","Pending","Pending","","",600,"QUẦN TÂY LƯNG CHUN","ĐEN"],["2026-05-05T10:04:37.564Z","0189/2026/PLMR-LC","2026-05-31","Admin","PLMR","PLMR-LC","",0,84240000,0,84240000,"5/2026","Pending","2026-06-18","2026-06-21","2026-06-22","2026-06-27","Pending","Pending","","",500,"QUẦN TÂY LƯNG CHUN","BE"],["2026-05-05T10:04:37.564Z","0190/2026/PLMR-GLX","","Admin","PLMR","PLMR-GLX","",0,120096000,0,120096000,"","Pending","","","","","Pending","Pending","","",800,"Sơ mi OXFORD PREMIUM","TRẮNG 02"],["2026-05-05T10:04:37.564Z","0191/2026/PLMR-GLX","","Admin","PLMR","PLMR-GLX","",0,127872000,0,127872000,"","Pending","","","","","Pending","Pending","","",800,"Sơ mi OXFORD PREMIUM","NAVY 35"],["2026-05-05T10:04:37.564Z","0192/2026/PLMR-GLX","","Admin","PLMR","PLMR-GLX","",0,105084000,0,105084000,"","Pending","","","","","Pending","Pending","","",700,"Sơ mi OXFORD PREMIUM","XANH NHẠT 07"],["2026-05-05T10:04:37.564Z","0193/2026/PLMR-GLX","","Admin","PLMR","PLMR-GLX","",0,89748000,0,89748000,"","Pending","","","","","Pending","Pending","","",600,"Sơ mi POPLIN","TRẮNG 02"],["2026-05-05T10:04:37.564Z","0194/2026/PLMR-GLX","","Admin","PLMR","PLMR-GLX","",0,89748000,0,89748000,"","Pending","","","","","Pending","Pending","","",600,"Sơ mi POPLIN","ĐEN 147"],["2026-05-05T10:04:37.564Z","0195/2026/PLMR-GLX","","Admin","PLMR","PLMR-GLX","",0,89748000,0,89748000,"","Pending","","","","","Pending","Pending","","",600,"Sơ mi POPLIN","BE 05"],["2026-05-05T10:04:37.564Z","0196/2026/PLMR-AT","2026-06-10","Admin","PLMR","PLMR-AT","",0,71280000,0,71280000,"6/2026","Pending","2026-06-28","2026-07-01","2026-07-02","2026-07-07","Pending","Pending","","",600,"BASIC CLASSIC","XÁM NHẠT"],["2026-05-05T10:04:37.564Z","0197/2026/PLMR-TLN","","Admin","PLMR","PLMR-TLN","",0,67716000,0,67716000,"","Pending","","","","","Pending","Pending","","",600,"BASIC CLASSIC","TRẮNG"],["2026-05-05T10:04:37.564Z","0198/2026/PLMR-AT","2026-06-20","Admin","PLMR","PLMR-AT","",0,71280000,0,71280000,"6/2026","Pending","2026-07-08","2026-07-11","2026-07-12","2026-07-17","Pending","Pending","","",600,"BASIC CLASSIC","NAVY KEM"],["2026-05-05T10:04:37.564Z","0199/2026/PLMR-TLN","","Admin","PLMR","PLMR-TLN","",0,67716000,0,67716000,"","Pending","","","","","Pending","Pending","","",600,"BASIC CLASSIC","CAFE"],["2026-05-05T10:04:37.564Z","0200/2026/PLMR-AT","2026-06-28","Admin","PLMR","PLMR-AT","",0,77112000,0,77112000,"6/2026","Pending","2026-07-16","2026-07-19","2026-07-20","2026-07-25","Pending","Pending","","",600,"CLASSIC DIAMOND V2","BE NHẠT"],["2026-05-05T10:04:37.564Z","0201/2026/PLMR-TLN","2026-06-10","Admin","PLMR","PLMR-TLN","",0,169290000,0,169290000,"6/2026","Pending","2026-06-28","2026-07-01","2026-07-02","2026-07-07","Pending","Pending","","",1500,"BASIC SYMBOL","TRẮNG"],["2026-05-05T10:04:37.564Z","0202/2026/PLMR-TLN","2026-06-10","Admin","PLMR","PLMR-TLN","",0,90288000,0,90288000,"6/2026","Pending","2026-06-28","2026-07-01","2026-07-02","2026-07-07","Pending","Pending","","",800,"BASIC SYMBOL","ĐEN"],["2026-05-05T10:04:37.564Z","0203/2026/PLMR-TLN","2026-06-18","Admin","PLMR","PLMR-TLN","",0,90288000,0,90288000,"6/2026","Pending","2026-07-06","2026-07-09","2026-07-10","2026-07-15","Pending","Pending","","",800,"BASIC SYMBOL","NAVY"],["2026-05-05T10:04:37.564Z","0204/2026/PLMR-TLN","2026-06-21","Admin","PLMR","PLMR-TLN","",0,90288000,0,90288000,"6/2026","Pending","2026-07-09","2026-07-12","2026-07-13","2026-07-18","Pending","Pending","","",800,"BASIC SYMBOL","BE"],["2026-05-05T10:04:37.564Z","0205/2026/PLMR-TLN","2026-06-21","Admin","PLMR","PLMR-TLN","",0,67716000,0,67716000,"6/2026","Pending","2026-07-09","2026-07-12","2026-07-13","2026-07-18","Pending","Pending","","",600,"BASIC SYMBOL","BE NHẠT"],["2026-05-05T10:04:37.564Z","0207/2026/PLMR-TLN","2026-06-05","Admin","PLMR","PLMR-TLN","",0,90288000,0,90288000,"6/2026","Pending","2026-06-23","2026-06-26","2026-06-27","2026-07-02","Pending","Pending","","",800,"BASIC SYMBOL","MINT"],["2026-05-05T10:04:37.564Z","0208/2026/PLMR-TLN","2026-06-05","Admin","PLMR","PLMR-TLN","",0,90288000,0,90288000,"6/2026","Pending","2026-06-23","2026-06-26","2026-06-27","2026-07-02","Pending","Pending","","",800,"BASIC SYMBOL","OLIU"],["2026-05-05T10:04:37.564Z","0209/2026/PLMR-TLN","2026-06-05","Admin","PLMR","PLMR-TLN","",0,102124800,0,102124800,"6/2026","Pending","2026-06-23","2026-06-26","2026-06-27","2026-07-02","Pending","Pending","","",800,"BASIC SYMBOL","DENIM"],["2026-05-05T10:04:37.564Z","0210/2026/PLMR-TLN","2026-06-18","Admin","PLMR","PLMR-TLN","",0,102124800,0,102124800,"6/2026","Pending","2026-07-06","2026-07-09","2026-07-10","2026-07-15","Pending","Pending","","",800,"ADEN","TRẮNG"],["2026-05-05T10:04:37.564Z","0212/2026/PLMR-TLN","2026-06-08","Admin","PLMR","PLMR-TLN","",0,101260800,0,101260800,"6/2026","Pending","2026-06-26","2026-06-29","2026-06-30","2026-07-05","Pending","Pending","","",800,"RUM","KEM NHẠT"],["2026-05-05T10:04:37.564Z","0213/2026/PLMR-TLN","","Admin","PLMR","PLMR-TLN","",0,77241600,0,77241600,"","Pending","","","","","Pending","Pending","","",600,"KANE","BE ĐẬM"],["2026-05-05T10:04:37.564Z","0214/2026/PLMR-TLN","2026-06-27","Admin","PLMR","PLMR-TLN","",0,77889600,0,77889600,"6/2026","Pending","2026-07-15","2026-07-18","2026-07-19","2026-07-24","Pending","Pending","","",600,"KANE","NAVY"],["2026-05-05T10:04:37.564Z","0215/2026/PLMR-TLN","2026-06-27","Admin","PLMR","PLMR-TLN","",0,77241600,0,77241600,"6/2026","Pending","2026-07-15","2026-07-18","2026-07-19","2026-07-24","Pending","Pending","","",600,"WADE","NAVY"],["2026-05-05T10:04:37.564Z","0216/2026/PLMR-TLN","2026-06-13","Admin","PLMR","PLMR-TLN","",0,101260800,0,101260800,"6/2026","Pending","2026-07-01","2026-07-04","2026-07-05","2026-07-10","Pending","Pending","","",800,"WICK","BE ĐẬM"],["2026-05-05T10:04:37.564Z","0217/2026/PLMR-TLN","2026-06-08","Admin","PLMR","PLMR-TLN","",0,75945600,0,75945600,"6/2026","Pending","2026-06-26","2026-06-29","2026-06-30","2026-07-05","Pending","Pending","","",600,"RUM PMK36","KHAKI"],["2026-05-05T10:04:37.564Z","0218/2026/PLMR-TLN","2026-06-08","Admin","PLMR","PLMR-TLN","",0,79768800,0,79768800,"6/2026","Pending","2026-06-26","2026-06-29","2026-06-30","2026-07-05","Pending","Pending","","",600,"LEDO PMB87","KEM NHẠT"],["2026-05-05T10:04:37.564Z","0219/2026/PLMR-LC","2026-06-18","Admin","PLMR","PLMR-LC","",0,116640000,0,116640000,"6/2026","Pending","2026-07-06","2026-07-09","2026-07-10","2026-07-15","Pending","Pending","","",600,"JEAN STRAIGHT","ĐEN"],["2026-05-05T10:04:37.564Z","0220/2026/PLMR-LC","2026-06-18","Admin","PLMR","PLMR-LC","",0,116640000,0,116640000,"6/2026","Pending","2026-07-06","2026-07-09","2026-07-10","2026-07-15","Pending","Pending","","",600,"JEAN STRAIGHT","XANH ĐẬM"],["2026-05-05T10:04:37.564Z","0221/2026/PLMR-LC","2026-06-07","Admin","PLMR","PLMR-LC","",0,116640000,0,116640000,"6/2026","Pending","2026-06-25","2026-06-28","2026-06-29","2026-07-04","Pending","Pending","","",600,"JEAN STRAIGHT","XANH NHẠT"],["2026-05-05T10:04:37.564Z","0222/2026/PLMR-LC","2026-06-07","Admin","PLMR","PLMR-LC","",0,155520000,0,155520000,"6/2026","Pending","2026-06-25","2026-06-28","2026-06-29","2026-07-04","Pending","Pending","","",800,"JEAN STRAIGHT","INDIGO"],["2026-05-05T10:04:37.564Z","0223/2026/PLMR-LC","2026-06-20","Admin","PLMR","PLMR-LC","",0,98496000,0,98496000,"6/2026","Pending","2026-07-08","2026-07-11","2026-07-12","2026-07-17","Pending","Pending","","",800,"SHORT KAKI","ĐEN"],["2026-05-05T10:04:37.564Z","0224/2026/PLMR-LC","2026-06-20","Admin","PLMR","PLMR-LC","",0,73872000,0,73872000,"6/2026","Pending","2026-07-08","2026-07-11","2026-07-12","2026-07-17","Pending","Pending","","",600,"SHORT KAKI","BE ĐẬM"],["2026-05-05T10:04:37.564Z","0225/2026/PLMR-LC","","Admin","PLMR","PLMR-LC","",0,76160000,0,76160000,"","Pending","","","","","Pending","Pending","","",680,"SHORT KAKI","BE"],["2026-05-05T10:04:37.564Z","0226/2026/PLMR-LC","2026-06-25","Admin","PLMR","PLMR-LC","",0,68040000,0,68040000,"6/2026","Pending","2026-07-13","2026-07-16","2026-07-17","2026-07-22","Pending","Pending","","",500,"KAKI SD","ĐEN"],["2026-05-05T10:04:37.564Z","0227/2026/PLMR-LC","2026-06-25","Admin","PLMR","PLMR-LC","",0,68040000,0,68040000,"6/2026","Pending","2026-07-13","2026-07-16","2026-07-17","2026-07-22","Pending","Pending","","",500,"KAKI SD","BE"],["2026-05-05T10:04:37.564Z","0229/2026/PLMR-TLN","2026-05-24","Admin","PLMR","PLMR-TLN","",0,99619200,0,99619200,"5/2026","Pending","2026-06-11","2026-06-14","2026-06-15","2026-06-20","Pending","Pending","","",800,"TRAVIS","NAVY"],["2026-05-05T10:04:37.564Z","0230/2026/PLMR-GLX","2026-07-01","Admin","PLMR","PLMR-GLX","",0,120096000,0,120096000,"7/2026","Pending","2026-07-19","2026-07-22","2026-07-23","2026-07-28","Pending","Pending","","",800,"Sơ mi OXFORD PREMIUM","TRẮNG 02"],["2026-05-05T10:04:37.564Z","0231/2026/PLMR-GLX","2026-07-01","Admin","PLMR","PLMR-GLX","",0,127872000,0,127872000,"7/2026","Pending","2026-07-19","2026-07-22","2026-07-23","2026-07-28","Pending","Pending","","",800,"Sơ mi OXFORD PREMIUM","NAVY 35"],["2026-05-05T10:04:37.564Z","0232/2026/PLMR-GLX","2026-07-01","Admin","PLMR","PLMR-GLX","",0,90072000,0,90072000,"7/2026","Pending","2026-07-19","2026-07-22","2026-07-23","2026-07-28","Pending","Pending","","",600,"Sơ mi OXFORD PREMIUM","XANH NHẠT 07"],["2026-05-05T10:04:37.564Z","0233/2026/PLMR-GLX","2026-07-01","Admin","PLMR","PLMR-GLX","",0,90072000,0,90072000,"7/2026","Pending","2026-07-19","2026-07-22","2026-07-23","2026-07-28","Pending","Pending","","",600,"Sơ mi OXFORD PREMIUM","BE"],["2026-05-05T10:04:37.564Z","0234/2026/PLMR-GLX","2026-07-01","Admin","PLMR","PLMR-GLX","",0,95904000,0,95904000,"7/2026","Pending","2026-07-19","2026-07-22","2026-07-23","2026-07-28","Pending","Pending","","",600,"Sơ mi OXFORD PREMIUM","ĐEN"],["2026-05-05T10:04:37.564Z","0235/2026/PLMR-GLX","2026-06-06","Admin","PLMR","PLMR-GLX","",0,80028000,0,80028000,"6/2026","Pending","2026-06-24","2026-06-27","2026-06-28","2026-07-03","Pending","Pending","","",600,"Sơ mi TAY NGẮN  POPLIN","ĐEN"],["2026-05-05T10:04:37.564Z","0236/2026/PLMR-GLX","2026-06-06","Admin","PLMR","PLMR-GLX","",0,80028000,0,80028000,"6/2026","Pending","2026-06-24","2026-06-27","2026-06-28","2026-07-03","Pending","Pending","","",600,"Sơ mi TAY NGẮN  POPLIN","CAFE"],["2026-05-05T10:04:37.564Z","0237/2026/PLMR-TLN","2026-05-28","Admin","PLMR","PLMR-TLN","",0,108000000,0,108000000,"5/2026","Pending","2026-06-15","2026-06-18","2026-06-19","2026-06-24","Pending","Pending","","",800,"MAVEN","NAVY"],["2026-05-05T10:04:37.564Z","0238/2026/PLMR-TLN","2026-06-13","Admin","PLMR","PLMR-TLN","",0,108000000,0,108000000,"6/2026","Pending","2026-07-01","2026-07-04","2026-07-05","2026-07-10","Pending","Pending","","",800,"IRISH PMD35","KEM"],["2026-05-05T10:04:37.564Z","0239/2026/PLMR-AT","2026-04-11","Admin","PLMR","PLMR-AT","",0,34830000,0,34830000,"4/2026","Pending","2026-04-29","2026-05-02","2026-05-03","2026-05-08","Pending","Pending","","",250,"IRISH PMD35","KEM"],["2026-05-05T10:04:37.564Z","0240/2026/PLMR-AT","2026-05-24","Admin","PLMR","PLMR-AT","",0,94500000,0,94500000,"5/2026","Pending","2026-06-11","2026-06-14","2026-06-15","2026-06-20","Pending","Pending","","",700,"ZYBER","ĐEN"],["2026-05-05T10:04:37.564Z","0241/2026/PLMR-HN KNIT","2026-03-16","Admin","PLMR","PLMR-HN KNIT","",0,22000000,0,22000000,"3/2026","Pending","2026-04-03","2026-04-06","2026-04-07","2026-04-12","Pending","Pending","","",2000,"VỚ LOGO","TRẮNG"],["2026-05-05T10:04:37.564Z","0242/2026/PLMR-HN KNIT","2026-03-16","Admin","PLMR","PLMR-HN KNIT","",0,22000000,0,22000000,"3/2026","Pending","2026-04-03","2026-04-06","2026-04-07","2026-04-12","Pending","Pending","","",2000,"VỚ LOGO","ĐEN"],["2026-05-05T10:04:37.564Z","0243/2026/PLMR-HN KNIT","","Admin","PLMR","PLMR-HN KNIT","",0,22000000,0,22000000,"","Pending","","","","","Pending","Pending","","",2000,"VỚ LOGO","TRẮNG"],["2026-05-05T10:04:37.564Z","0244/2026/PLMR-HN KNIT","","Admin","PLMR","PLMR-HN KNIT","",0,22000000,0,22000000,"","Pending","","","","","Pending","Pending","","",2000,"VỚ LOGO","ĐEN"],["2026-05-05T10:04:37.564Z","0245/2026/PLMR-HN KNIT","2026-06-03","Admin","PLMR","PLMR-HN KNIT","",0,22000000,0,22000000,"6/2026","Pending","2026-06-21","2026-06-24","2026-06-25","2026-06-30","Pending","Pending","","",2000,"VỚ LOGO","TRẮNG"],["2026-05-05T10:04:37.564Z","0246/2026/PLMR-HN KNIT","2026-06-03","Admin","PLMR","PLMR-HN KNIT","",0,22000000,0,22000000,"6/2026","Pending","2026-06-21","2026-06-24","2026-06-25","2026-06-30","Pending","Pending","","",2000,"VỚ LOGO","ĐEN"],["2026-05-05T10:04:37.564Z","0247/2026/PLMR-HN KNIT","","Admin","PLMR","PLMR-HN KNIT","",0,22000000,0,22000000,"","Pending","","","","","Pending","Pending","","",2000,"VỚ LOGO","TRẮNG"],["2026-05-05T10:04:37.564Z","0248/2026/PLMR-HN KNIT","","Admin","PLMR","PLMR-HN KNIT","",0,22000000,0,22000000,"","Pending","","","","","Pending","Pending","","",2000,"VỚ LOGO","ĐEN"],["2026-05-05T10:04:37.564Z","0249/2026/PLMR-TLN","2026-03-01","Admin","PLMR","PLMR-TLN","",0,62073000,0,62073000,"3/2026","Pending","2026-03-19","2026-03-22","2026-03-23","2026-03-28","Pending","Pending","","",550,"BASIC SYMBOL","TRẮNG"],["2026-05-05T10:04:37.564Z","0250/2026/PLMR-TLN","2026-04-08","Admin","PLMR","PLMR-TLN","",0,34992000,0,34992000,"4/2026","Pending","2026-04-26","2026-04-29","2026-04-30","2026-05-05","Pending","Pending","","",2000,"TÚI GIẶT","TRẮNG"],["2026-05-05T10:04:37.564Z","0251/2026/PLMR-TLN","2026-05-09","Admin","PLMR","PLMR-TLN","",0,34992000,0,34992000,"5/2026","Pending","2026-05-27","2026-05-30","2026-05-31","2026-06-05","Pending","Pending","","",2000,"TÚI GIẶT","TRẮNG"],["2026-05-05T10:04:37.564Z","0252/2026/PLMR-TLN","2026-06-12","Admin","PLMR","PLMR-TLN","",0,34992000,0,34992000,"6/2026","Pending","2026-06-30","2026-07-03","2026-07-04","2026-07-09","Pending","Pending","","",2000,"TÚI GIẶT","TRẮNG"],["2026-05-05T10:04:37.564Z","0253/2026/PLMR-TLN","","Admin","PLMR","PLMR-TLN","",0,90288000,0,90288000,"","Pending","","","","","Pending","Pending","","",800,"BASIC SYMBOL","XANH LÁ"],["2026-05-05T10:04:37.564Z","0260/2026/PLMR-TLN","2026-06-06","Admin","PLMR","PLMR-TLN","",0,85406400,0,85406400,"6/2026","Pending","2026-06-24","2026-06-27","2026-06-28","2026-07-03","Pending","Pending","","",600,"RICHIE","TRẮNG KEM"],["2026-05-05T10:04:37.564Z","0261/2026/PLMR-TLN","2026-06-06","Admin","PLMR","PLMR-TLN","",0,85406400,0,85406400,"6/2026","Pending","2026-06-24","2026-06-27","2026-06-28","2026-07-03","Pending","Pending","","",600,"RICHIE","TRẮNG KEM"],["2026-05-05T10:04:37.564Z","0262/2026/PLMR-KP","2026-05-08","Admin","PLMR","PLMR-KP","",0,69120000,0,69120000,"5/2026","Pending","2026-05-26","2026-05-29","2026-05-30","2026-06-04","Pending","Pending","","",800,"TSHIRT BASIC US","TRẮNG"],["2026-05-05T10:04:37.564Z","0263/2026/PLMR-KP","","Admin","PLMR","PLMR-KP","",0,69120000,0,69120000,"","Pending","","","","","Pending","Pending","","",800,"TSHIRT BASIC US","ĐEN"],["2026-05-05T10:04:37.564Z","0265/2026/PLMR-KP","","Admin","PLMR","PLMR-KP","",0,69120000,0,69120000,"","Pending","","","","","Pending","Pending","","",800,"TSHIRT BASIC US","BE ĐẬM"],["2026-05-05T10:04:37.564Z","0270/2026/PLMR-VH","2026-05-10","Admin","PLMR","PLMR-VH","",0,24000000,0,24000000,"5/2026","Pending","2026-05-28","2026-05-31","2026-06-01","2026-06-06","Pending","Pending","","",1000,"TANKTOP BASIC","TRẮNG"],["2026-05-05T10:04:37.564Z","0271/2026/PLMR-VH","2026-05-10","Admin","PLMR","PLMR-VH","",0,24000000,0,24000000,"5/2026","Pending","2026-05-28","2026-05-31","2026-06-01","2026-06-06","Pending","Pending","","",1000,"TANKTOP BASIC","ĐEN"],["2026-05-05T10:04:37.564Z","0272/2026/PLMR-VH","","Admin","PLMR","PLMR-VH","",0,24000000,0,24000000,"","Pending","","","","","Pending","Pending","","",1000,"TANKTOP BASIC","TRẮNG"],["2026-05-05T10:04:37.564Z","0273/2026/PLMR-VH","","Admin","PLMR","PLMR-VH","",0,24000000,0,24000000,"","Pending","","","","","Pending","Pending","","",1000,"TANKTOP BASIC","ĐEN"],["2026-05-05T10:04:37.564Z","0274/2026/PLMR-VH","","Admin","PLMR","PLMR-VH","",0,24000000,0,24000000,"","Pending","","","","","Pending","Pending","","",1000,"TANKTOP BASIC","TRẮNG"],["2026-05-05T10:04:37.564Z","0275/2026/PLMR-VH","","Admin","PLMR","PLMR-VH","",0,24000000,0,24000000,"","Pending","","","","","Pending","Pending","","",1000,"TANKTOP BASIC","ĐEN"],["2026-05-05T10:04:37.564Z","0276/2026/PLMR-VH","","Admin","PLMR","PLMR-VH","",0,24000000,0,24000000,"","Pending","","","","","Pending","Pending","","",1000,"TANKTOP BASIC","TRẮNG"],["2026-05-05T10:04:37.564Z","0277/2026/PLMR-VH","","Admin","PLMR","PLMR-VH","",0,24000000,0,24000000,"","Pending","","","","","Pending","Pending","","",1000,"TANKTOP BASIC","ĐEN"]];
  var numOrderCols = orderHeaders.length;
  orderData = orderData.map(function(r) { var row = r.slice(0,numOrderCols); while(row.length<numOrderCols) row.push(""); return row; });
  if (orderData.length > 0) orderSheet.getRange(2,1,orderData.length,numOrderCols).setValues(orderData);
  
  SpreadsheetApp.getUi().alert("Import xong! Details: " + detailData.length + " dong, Orders: " + orderData.length + " dong");
}
