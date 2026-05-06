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
    // Kết quả: S/29, M/30, L/31, XL/32, XXL/34, 34, FREE
    function normalizeSize(size) {
      let s = String(size).toUpperCase().trim();
      s = s.replace(/\.0$/, '');
      if (s === 'S' || s === 'S/29' || s === '29') return 'S/29';
      if (s === 'M' || s === 'M/29' || s === 'M/30' || s === '30') return 'M/30';
      if (s === 'L' || s === 'L/30' || s === 'L/31' || s === '31') return 'L/31';
      if (s === 'XL' || s === 'XL/31' || s === 'XL/32' || s === '32') return 'XL/32';
      if (s === 'XXL' || s === '2XL' || s === 'XXL/32' || s === 'XXL/34' || s === '34') return 'XXL/34';
      if (s === 'FREESIZE') return 'FREE';
      return s;
    }

    // Thứ tự cột size cố định
    const SIZE_ORDER = ['S/29', 'M/30', 'L/31', 'XL/32', 'XXL/34', 'FREE'];

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
      if (s === 'S' || s === 'S/29' || s === '29') return 'S/29';
      if (s === 'M' || s === 'M/29' || s === 'M/30' || s === '30') return 'M/30';
      if (s === 'L' || s === 'L/30' || s === 'L/31' || s === '31') return 'L/31';
      if (s === 'XL' || s === 'XL/31' || s === 'XL/32' || s === '32') return 'XL/32';
      if (s === 'XXL' || s === '2XL' || s === 'XXL/32' || s === 'XXL/34' || s === '34') return 'XXL/34';
      if (s === 'FREESIZE') return 'FREE';
      return s;
    }

    const SIZE_ORDER = ['S/29', 'M/30', 'L/31', 'XL/32', 'XXL/34', 'FREE'];
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
 * BƯỚC 1: Chạy hàm này TRƯỚC.
 */
function importPart1() {

  // Convert ISO date strings to Date objects
  function toDate(s) {
    if (!s) return "";
    var str = String(s);
    var m = str.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(parseInt(m[1]), parseInt(m[2])-1, parseInt(m[3]));
    return s;
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var detailSheet = ss.getSheetByName("data_order_details");
  if (!detailSheet) detailSheet = ss.insertSheet("data_order_details");
  var dh=["Mã đơn hàng","Tên SP","Art Code","Màu","Tổng SL","Đơn giá","Thành tiền (trước VAT)","Thông tin NPL","T.Gian Giao","Ghi Chú","Trạng thái Vải","Trạng thái Bo","Đồng bộ NPL","Ngày đồng bộ","Ghi chú duyệt","Size S/29","Size M/30","Size L/31","Size XL/32","Size XXL/34","Size FREE"];
  detailSheet.clearContents();
  detailSheet.getRange(1,1,1,dh.length).setValues([dh]);
  detailSheet.getRange(1,1,1,dh.length).setFontWeight("bold").setBackground("#fff2cc");
  detailSheet.setFrozenRows(1);
  var d=[["0003/2026/PLMR-TLN","BASIC SYMBOL","PO88","KEM VÀNG NEW",1000,112860,112860000,"","2026-03-14","Hoàn thành(thiếu)","Pending","Pending","Pending","","","",250,350,250,150,""],["0004/2026/PLMR-TLN","BASIC SYMBOL","PO88","KHAKI NEW",800,112860,90288000,"","2026-03-14","Hoàn thành(thiếu)","Pending","Pending","Pending","","","",225,225,200,150,""],["0005/2026/PLMR-TLN","BASIC SYMBOL","PO88","BE NHẠT",700,112860,79002000,"","2026-03-18","Hoàn thành","Pending","Pending","Pending","","","",200,250,150,100,""],["0006/2026/PLMR-TLN","BASIC SYMBOL","PO88","ĐẤT",700,112860,79002000,"","2026-03-18","Hoàn thành(thiếu)","Pending","Pending","Pending","","","",200,250,150,100,""],["0009/2026/PLMR-AT","BASIC DIAMOND","PO166","TRẮNG KEM",1000,127440,127440000,"","2026-03-11","Hoàn thành(thiếu)","Pending","Pending","Pending","","","",300,300,250,150,""],["0010/2026/PLMR-AT","BASIC DIAMOND","PO166","BE",1000,127440,127440000,"","2026-03-11","Hoàn thành","Pending","Pending","Pending","","","",300,300,250,150,""],["0011/2026/PLMR-AT","BASIC DIAMOND","PO166","XANH KHÓI",600,127440,76464000,"","2026-03-13","Hoàn thành(thiếu)","Pending","Pending","Pending","","","",150,200,150,100,""],["0012/2026/PLMR-AT","BASIC DIAMOND","PO166","XANH DENIM",600,127440,76464000,"","2026-03-11","Hoàn thành(thiếu)","Pending","Pending","Pending","","","",150,200,150,100,""],["0013/2026/PLMR-AT","BASIC DIAMOND","PO166","XANH MINT",600,127440,76464000,"","2026-03-13","Hoàn thành(thiếu)","Pending","Pending","Pending","","","",150,200,150,100,""],["0019/2026/PLMR-TLN","BASIC SYMBOL","PO88","ĐỎ NÂU",800,112860,90288000,"","2026-03-13","Hoàn thành","Pending","Pending","Pending","","","",225,225,200,150,""],["0020/2026/PLMR-TLN","BASIC SYMBOL","PO88","XÁM ĐẬM NEW",800,112860,90288000,"","2026-03-20","Hoàn thành","Pending","Pending","Pending","","","",225,225,200,150,""],["0021/2026/PLMR-TLN","BASIC SYMBOL","PO88","NÂU NHẠT",800,112860,90288000,"","2026-03-20","Hoàn thành","Pending","Pending","Pending","","","",225,225,200,150,""],["0022/2026/PLMR-TLN","BASIC SYMBOL","PO88","BE HỒNG",800,112860,90288000,"","2026-03-21","Hoàn thành(thiếu)","Pending","Pending","Pending","","","",225,225,200,150,""],["0028/2026/PLMR-TLN","ASTON PMD31","PO253","ĐEN 84",600,201528,120916800,"","2026-03-11","Hoàn thành","Pending","Pending","Pending","","",125,250,175,50,"",""],["0029/2026/PLMR-AT","CLASSIC","PO119","TRẮNG",500,124200,62100000,"","2026-03-18","Hoàn thành","Pending","Pending","Pending","","","",150,175,100,75,""],["0030/2026/PLMR-AT","CLASSIC","PO119","ĐEN",500,124200,62100000,"","2026-04-18","Hoàn thành","Pending","Pending","Pending","","","",150,175,100,75,""],["0031/2026/PLMR-AT","CLASSIC","PO119","XÁM NHẠT",500,124200,62100000,"","2026-03-19","Hoàn thành","Pending","Pending","Pending","","","",150,175,100,75,""],["0032/2026/PLMR-AT","CLASSIC","PO119","KEM NHẠT",500,124200,62100000,"","2026-03-19","Hoàn thành","Pending","Pending","Pending","","","",150,175,100,75,""],["0034/2026/PLMR-AN","CLASSIC DIAMOND","PO215","NAVY",500,117000,58500000,"","2026-03-26","Hoàn thành","Pending","Pending","Pending","","","",150,175,100,75,""],["0035/2026/PLMR-AT","ZYBER","PO210","ĐEN",500,145800,72900000,"","2026-03-27","Hoàn thành(thiếu)","Pending","Pending","Pending","","","",150,175,100,75,""],["0036/2026/PLMR-AT","TRAVIS","PO98","NAVY",800,124200,99360000,"","2026-03-04","Hoàn thành(thiếu)","Pending","Pending","Pending","","","",250,250,200,100,""],["0037/2026/PLMR-AT","MAVEN","PO230","NAVY",600,137160,82296000,"","2026-03-11","Hoàn thành","Pending","Pending","Pending","","","",175,175,150,100,""],["0038/2026/PLMR-AT","ZYBER","PO210","CAFE",500,145800,72900000,"","2026-03-24","Hoàn thành(thiếu)","Pending","Pending","Pending","","","",125,150,125,100,""],["0039/2026/PLMR-AT","ZYBER","PO210","BE NHẠT",800,145800,116640000,"","2026-03-25","Hoàn thành(thiếu)","Pending","Pending","Pending","","","",200,300,200,100,""],["0041/2026/PLMR-AT","CLASSIC","PO119","XÁM ĐẬM",800,124200,99360000,"","2026-03-21","Hoàn thành","Pending","Pending","Pending","","","",250,250,200,100,""],["0042/2026/PLMR-TLN","NIVIX","PO202","KEM NHẠT",600,131868,79120800,"","2026-03-11","Hoàn thành","Pending","Pending","Pending","","",150,200,150,100,"",""],["0043/2026/PLMR-TLN","ADEN","PO105","TRẮNG",600,127656,76593600,"","2026-03-10","Hoàn thành","Pending","Pending","Pending","","","",300,150,150,"",""],["0044/2026/PLMR-LC","SHORT KAKI","PO99","BE",800,112000,89600000,"","2026-03-04","Hoàn thành","Pending","Pending","Pending","","","",200,300,300,"",""],["0045/2026/PLMR-LC","SHORT KAKI","PO99","BE ĐẬM",500,112000,56000000,"","2026-03-04","Hoàn thành","Pending","Pending","Pending","","","",150,200,150,"",""],["0046/2026/PLMR-LC","SHORT KAKI","PO99","NÂU",500,112000,56000000,"","2026-03-04","Hoàn thành(thiếu)","Pending","Pending","Pending","","","",150,200,150,"",""],["0047/2026/PLMR-AT","IRISH PMD35","PO260","KEM",600,139320,83592000,"","2026-03-06","Hoàn thành","Pending","Pending","Pending","","","",175,175,150,100,""],["0049/2026/PLMR-TLN","BASIC SYMBOL","PO88","TRẮNG",450,112860,50787000,"","2026-04-02","Hoàn thành","Pending","Pending","Pending","","","",20,30,250,150,""],["0050/2026/PLMR-TLN","BASIC SYMBOL","PO88","ĐEN",1000,112860,112860000,"","2026-03-19","Hoàn thành(thiếu)","Pending","Pending","Pending","","","",300,300,250,150,""],["0051/2026/PLMR-TLN","BASIC SYMBOL","PO88","KEM NHẠT",600,112860,67716000,"","2026-03-25","Hoàn thành","Pending","Pending","Pending","","","",175,200,150,75,""],["0052/2026/PLMR-TLN","BASIC SYMBOL","PO88","NAVY",600,112860,67716000,"","2026-03-26","Hoàn thành","Pending","Pending","Pending","","","",175,200,150,75,""],["0053/2026/PLMR-TLN","BASIC SYMBOL","PO88","TRẮNG",1000,112860,112860000,"","2026-04-15","Hoàn thành","Pending","Pending","Pending","","","",400,600,"","",""],["0056/2026/PLMR-TLN","BASIC SYMBOL","PO88","NAVY",800,112860,90288000,"","2026-04-23","Hoàn thành","Pending","Pending","Pending","","","",150,450,100,100,""],["0057/2026/PLMR-TLN","JAY","PO201","TRẮNG",800,121284,97027200,"","2026-04-02","Hoàn thành","Pending","Pending","Pending","","","",200,300,200,100,""],["0058/2026/PLMR-TLN","JAY","PO201","NAVY",800,121284,97027200,"","2026-04-02","Hoàn thành","Pending","Pending","Pending","","","",200,300,200,100,""],["0059/2026/PLMR-TLN","BASIC SYMBOL","PO88","CAFE",800,112860,90288000,"","2026-03-10","Hoàn thành","Pending","Pending","Pending","","","",250,250,200,100,""],["0060/2026/PLMR-TLN","BASIC SYMBOL","PO88","ĐEN",1500,112860,169290000,"","2026-03-11","Hoàn thành","Pending","Pending","Pending","","","",400,500,400,200,""],["0061/2026/PLMR-TLN","BASIC SYMBOL","PO88","NAVY",400,112860,45144000,"","2026-03-10","Hoàn thành","Pending","Pending","Pending","","","",200,"",200,"",""],["0062/2026/PLMR-AT","CLASSIC","PO119","ĐEN",600,124200,74520000,"","2026-03-18","Hoàn thành(thiếu)","Pending","Pending","Pending","","","",175,200,125,100,""],["0063/2026/PLMR-AT","BASIC DIAMOND","PO166","NAVY",800,127440,101952000,"","2026-03-05","Hoàn thành","Pending","Pending","Pending","","","",250,250,200,100,""],["0064/2026/PLMR-LC","JEAN STRAIGHT","PO216","XANH NHẠT",2000,180000,360000000,"","2026-03-04","Hoàn thành","Pending","Pending","Pending","","",400,450,450,400,300,""],["0065/2026/PLMR-AT","BASIC DIAMOND","PO166","ĐEN",500,127440,63720000,"","2026-03-03","Hoàn thành(thiếu)","Pending","Pending","Pending","","","",150,175,100,75,""],["0066/2026/PLMR-AT","BASIC DIAMOND","PO166","TRẮNG",500,127440,63720000,"","2026-03-03","Hoàn thành(thiếu)","Pending","Pending","Pending","","","",150,175,100,75,""],["0068/2026/PLMR-AT","CLASSIC DIAMOND V2","PO276","BE NHẠT",900,124200,111780000,"","2026-03-04","Hoàn thành(thiếu)","Pending","Pending","Pending","","","",220,380,180,120,""],["0069/2026/PLMR-AN","CLASSIC DIAMOND","PO215","NAVY",500,117000,58500000,"","2026-04-02","Hoàn thành","Pending","Pending","Pending","","","",150,175,100,75,""],["0070/2026/PLMR-TT","VỚ LOGO","VO5","ĐEN",1000,15660,15660000,"","2026-03-14","Hoàn thành","Pending","Pending","Pending","","","",1000,"","","",""],["0071/2026/PLMR-TT","VỚ LOGO","VO5","TRẮNG",1000,15660,15660000,"","2026-03-14","Hoàn thành","Pending","Pending","Pending","","","",1000,"","","",""],["0072/2026/PLMR-TLN","NORF","PO301","TRẮNG",800,135000,108000000,"","2026-04-04","Hoàn thành","Pending","Pending","Pending","","","",225,225,200,150,""],["0074/2026/PLMR-AT","TRAVIS","PO98","NAVY",500,124200,62100000,"","2026-04-22","Hoàn thành","Pending","Pending","Pending","","","",175,150,100,75,""],["0077/2026/PLMR-AT","LINE","PO303","NAVY",800,139320,111456000,"","2026-04-03","Hoàn thành","Pending","Pending","Pending","","","",250,250,200,100,""],["0078/2026/PLMR-AT","TRAVIS","PO98","CAFE",800,125280,100224000,"","2026-04-03","Hoàn thành(thiếu)","Pending","Pending","Pending","","","",250,250,200,100,""],["0090/2026/PLMR-AT","CLASSIC DIAMOND V2","PO276","ĐỎ NÂU",800,128520,102816000,"","2026-04-14","Hoàn thành(thiếu)","Pending","Pending","Pending","","","",200,300,200,100,""],["0091/2026/PLMR-TLN","BASIC SYMBOL","PO88","BE",800,112860,90288000,"","2026-04-21","Hoàn thành","Pending","Pending","Pending","","","",200,300,200,100,""],["0094/2026/PLMR-TLN","WICK","PO226","BE ĐẬM",800,126576,101260800,"","2026-04-17","Hoàn thành","Pending","Pending","Pending","","","",200,300,200,100,""],["0095/2026/PLMR-TLN","JAY","PO201","KEM NHẠT",800,121284,97027200,"","2026-04-17","Hoàn thành(thiếu)","Pending","Pending","Pending","","","",200,300,200,100,""],["0106/2026/PLMR-LC","KAKI STRAIGHT","PO249","BE",500,194400,97200000,"","2026-04-29","Hoàn thành(thiếu)","Pending","Pending","Pending","","",50,125,150,125,50,""],["0107/2026/PLMR-LC","KAKI STRAIGHT","PO249","ĐEN",500,194400,97200000,"","2026-04-29","Hoàn thành(thiếu)","Pending","Pending","Pending","","",50,125,150,125,50,""],["0108/2026/PLMR-LC","KAKI STRAIGHT","PO249","NÂU",500,194400,97200000,"","2026-04-29","Hoàn thành","Pending","Pending","Pending","","",50,125,150,125,50,""],["0109/2026/PLMR-LC","KAKI STRAIGHT","PO249","KEM",800,194400,155520000,"","2026-04-29","NEW IN - CHỦ LỰC","Pending","Pending","Pending","","",100,200,250,150,100,""],["0110/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","TRẮNG 02",800,150120,120096000,"","2026-04-28","Hoàn thành","Pending","Pending","Pending","","","",200,250,250,100,""],["0112/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","XANH NHẠT 07",800,150120,120096000,"","2026-04-28","Hoàn thành","Pending","Pending","Pending","","","",200,250,250,100,""],["0113/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","BE",800,150120,120096000,"","2026-04-28","Hoàn thành","Pending","Pending","Pending","","","",200,250,250,100,""],["0116/2026/PLMR-GLX","Sơ mi POPLIN","PO258","ĐEN 147",600,149580,89748000,"","2026-04-24","Hoàn thành","Pending","Pending","Pending","","","",175,200,150,75,""],["0118/2026/PLMR-AT","BASIC CLASSIC","PO119","XÁM NHẠT",600,118800,71280000,"","2026-05-14","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","",175,200,150,75,""],["0122/2026/PLMR-AT","BASIC DIAMOND","PO166","KEM",800,128520,102816000,"","2026-05-03","Hoàn thành(thiếu)","Pending","Pending","Pending","","","",250,250,200,100,""],["0123/2026/PLMR-AT","CLASSIC DIAMOND V2","PO276","XANH KHÓI",800,128520,102816000,"","2026-05-09","NEW IN - NEWIN","Pending","Pending","Pending","","","",250,250,200,100,""],["0124/2026/PLMR-AT","CLASSIC DIAMOND V2","PO276","XANH DENIM",800,128520,102816000,"","2026-05-09","NEW IN - NEWIN","Pending","Pending","Pending","","","",250,250,200,100,""],["0129/2026/PLMR-AT","PHILO PK75","PO309","TRẮNG KEM",800,139320,111456000,"","2026-05-27","NEW IN - NEWIN","Pending","Pending","Pending","","","",250,250,200,100,""],["0130/2026/PLMR-AT","KITT PMK82","PO400","XANH MINT",800,149040,119232000,"","2026-05-27","NEW IN - NEWIN","Pending","Pending","Pending","","","",250,250,200,100,""],["0131/2026/PLMR-TLN","BASIC SYMBOL","PO88","ĐEN",500,112860,56430000,"","2026-05-10","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","",150,150,125,75,""],["0133/2026/PLMR-TLN","BASIC SYMBOL","PO88","NAVY",800,112860,90288000,"","2026-05-15","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","",250,250,200,100,""],["0134/2026/PLMR-TLN","BASIC SYMBOL","PO88","BE NHẠT",600,112860,67716000,"","2026-05-10","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","",175,200,150,75,""],["0135/2026/PLMR-TLN","BASIC DIAMOND","PO166","OLIU",800,126144,100915200,"","2026-05-03","NEW IN - NEWIN","Pending","Pending","Pending","","","",250,250,200,100,""],["0136/2026/PLMR-TLN","BASIC DIAMOND","PO166","RÊU",800,126144,100915200,"","2026-05-03","Hoàn thành","Pending","Pending","Pending","","","",250,250,200,100,""],["0137/2026/PLMR-TLN","BASIC DIAMOND","PO166","INDIGO",800,126144,100915200,"","2026-05-03","NEW IN - NEWIN","Pending","Pending","Pending","","","",250,250,200,100,""],["0138/2026/PLMR-TLN","ADEN","PO105","TRẮNG",600,127656,76593600,"","2026-05-20","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",175,200,150,75,""],["0139/2026/PLMR-TLN","NIVIX","PO202","KEM NHẠT",600,131868,79120800,"","2026-05-13","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",175,200,150,75,""],["0140/2026/PLMR-TLN","RUM","PO241","KEM NHẠT",800,126576,101260800,"","2026-05-13","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",250,250,200,100,""],["0141/2026/PLMR-TLN","ANDY","PO182","KEM NHẠT",800,122364,97891200,"","2026-05-13","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",250,250,200,100,""],["0146/2026/PLMR-TLN","TORA - PMB85","PO302","KEM  NHẠT",800,136080,108864000,"","2026-05-05","NEW IN - NEWIN","Pending","Pending","Pending","","","",250,250,200,100,""],["0147/2026/PLMR-TLN","ALLI - PMB81","PO304","KEM VÀNG",800,128736,102988800,"","2026-05-05","NEW IN - NEWIN","Pending","Pending","Pending","","","",250,250,200,100,""],["0148/2026/PLMR-LC","JEAN STRAIGHT","PO216","ĐEN",500,194400,97200000,"","2026-05-21","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","",50,125,150,125,50,""]];
  var nc=dh.length;
  d=d.map(function(r){var row=r.slice(0,nc);while(row.length<nc)row.push("");return row;});

  // Convert T.Gian Giao (col 8) to Date objects
  d.forEach(function(row) { row[8] = toDate(row[8]); });
  if(d.length>0)detailSheet.getRange(2,1,d.length,nc).setValues(d);

  // Format date column as dd/mm/yyyy
  if(d.length>0) detailSheet.getRange(2,9,d.length,1).setNumberFormat("dd/mm/yyyy");
  var orderSheet = ss.getSheetByName("data_order");
  if (!orderSheet) orderSheet = ss.insertSheet("data_order");
  var oh=["Thời gian lưu","Mã đơn hàng","Ngày đặt hàng","Người tạo","Công ty","Nhà cung cấp","Địa chỉ NCC","Thuế VAT (%)","Tổng tạm tính","Tiền VAT","Tổng cộng","PO Tháng","Trạng thái Vải","Hạn Duyệt (D+18)","Hạn Cắt Vải (D+21)","Hạn Lên Chuyền (D+22)","Hạn Hoàn Thành (D+27)","Trạng thái Bo","Trạng thái NPL","Ngày Đồng Bộ","Ghi Chú","Tổng SL","Danh sách SP","Danh sách Màu"];
  orderSheet.clearContents();
  orderSheet.getRange(1,1,1,oh.length).setValues([oh]);
  orderSheet.getRange(1,1,1,oh.length).setFontWeight("bold").setBackground("#d0e0e3");
  orderSheet.setFrozenRows(1);
  var o=[["2026-05-06T01:54:13.901Z","0003/2026/PLMR-TLN","2026-02-14","System Import","POLOMANOR","TLN","",0,112860000,0,112860000,"3/2026","Pending","2026-03-04","2026-03-07","2026-03-08","2026-03-13","Pending","Pending","","Hoàn thành(thiếu)",1000,"BASIC SYMBOL","KEM VÀNG NEW"],["2026-05-06T01:54:13.901Z","0004/2026/PLMR-TLN","2026-02-14","System Import","POLOMANOR","TLN","",0,90288000,0,90288000,"3/2026","Pending","2026-03-04","2026-03-07","2026-03-08","2026-03-13","Pending","Pending","","Hoàn thành(thiếu)",800,"BASIC SYMBOL","KHAKI NEW"],["2026-05-06T01:54:13.901Z","0005/2026/PLMR-TLN","2026-02-18","System Import","POLOMANOR","TLN","",0,79002000,0,79002000,"3/2026","Pending","2026-03-08","2026-03-11","2026-03-12","2026-03-17","Pending","Pending","","Hoàn thành",700,"BASIC SYMBOL","BE NHẠT"],["2026-05-06T01:54:13.901Z","0006/2026/PLMR-TLN","2026-02-18","System Import","POLOMANOR","TLN","",0,79002000,0,79002000,"3/2026","Pending","2026-03-08","2026-03-11","2026-03-12","2026-03-17","Pending","Pending","","Hoàn thành(thiếu)",700,"BASIC SYMBOL","ĐẤT"],["2026-05-06T01:54:13.901Z","0009/2026/PLMR-AT","2026-02-11","System Import","POLOMANOR","AT","",0,127440000,0,127440000,"3/2026","Pending","2026-03-01","2026-03-04","2026-03-05","2026-03-10","Pending","Pending","","Hoàn thành(thiếu)",1000,"BASIC DIAMOND","TRẮNG KEM"],["2026-05-06T01:54:13.901Z","0010/2026/PLMR-AT","2026-02-11","System Import","POLOMANOR","AT","",0,127440000,0,127440000,"3/2026","Pending","2026-03-01","2026-03-04","2026-03-05","2026-03-10","Pending","Pending","","Hoàn thành",1000,"BASIC DIAMOND","BE"],["2026-05-06T01:54:13.901Z","0011/2026/PLMR-AT","2026-02-13","System Import","POLOMANOR","AT","",0,76464000,0,76464000,"3/2026","Pending","2026-03-03","2026-03-06","2026-03-07","2026-03-12","Pending","Pending","","Hoàn thành(thiếu)",600,"BASIC DIAMOND","XANH KHÓI"],["2026-05-06T01:54:13.901Z","0012/2026/PLMR-AT","2026-02-11","System Import","POLOMANOR","AT","",0,76464000,0,76464000,"3/2026","Pending","2026-03-01","2026-03-04","2026-03-05","2026-03-10","Pending","Pending","","Hoàn thành(thiếu)",600,"BASIC DIAMOND","XANH DENIM"],["2026-05-06T01:54:13.901Z","0013/2026/PLMR-AT","2026-02-13","System Import","POLOMANOR","AT","",0,76464000,0,76464000,"3/2026","Pending","2026-03-03","2026-03-06","2026-03-07","2026-03-12","Pending","Pending","","Hoàn thành(thiếu)",600,"BASIC DIAMOND","XANH MINT"],["2026-05-06T01:54:13.901Z","0019/2026/PLMR-TLN","2026-02-13","System Import","POLOMANOR","TLN","",0,90288000,0,90288000,"3/2026","Pending","2026-03-03","2026-03-06","2026-03-07","2026-03-12","Pending","Pending","","Hoàn thành",800,"BASIC SYMBOL","ĐỎ NÂU"],["2026-05-06T01:54:13.901Z","0020/2026/PLMR-TLN","2026-02-20","System Import","POLOMANOR","TLN","",0,90288000,0,90288000,"3/2026","Pending","2026-03-10","2026-03-13","2026-03-14","2026-03-19","Pending","Pending","","Hoàn thành",800,"BASIC SYMBOL","XÁM ĐẬM NEW"],["2026-05-06T01:54:13.901Z","0021/2026/PLMR-TLN","2026-02-20","System Import","POLOMANOR","TLN","",0,90288000,0,90288000,"3/2026","Pending","2026-03-10","2026-03-13","2026-03-14","2026-03-19","Pending","Pending","","Hoàn thành",800,"BASIC SYMBOL","NÂU NHẠT"],["2026-05-06T01:54:13.901Z","0022/2026/PLMR-TLN","2026-02-21","System Import","POLOMANOR","TLN","",0,90288000,0,90288000,"3/2026","Pending","2026-03-11","2026-03-14","2026-03-15","2026-03-20","Pending","Pending","","Hoàn thành(thiếu)",800,"BASIC SYMBOL","BE HỒNG"],["2026-05-06T01:54:13.901Z","0028/2026/PLMR-TLN","2026-02-11","System Import","POLOMANOR","TLN","",0,120916800,0,120916800,"3/2026","Pending","2026-03-01","2026-03-04","2026-03-05","2026-03-10","Pending","Pending","","Hoàn thành",600,"ASTON PMD31","ĐEN 84"],["2026-05-06T01:54:13.901Z","0029/2026/PLMR-AT","2026-02-18","System Import","POLOMANOR","AT","",0,62100000,0,62100000,"3/2026","Pending","2026-03-08","2026-03-11","2026-03-12","2026-03-17","Pending","Pending","","Hoàn thành",500,"CLASSIC","TRẮNG"],["2026-05-06T01:54:13.901Z","0030/2026/PLMR-AT","2026-03-21","System Import","POLOMANOR","AT","",0,62100000,0,62100000,"4/2026","Pending","2026-04-08","2026-04-11","2026-04-12","2026-04-17","Pending","Pending","","Hoàn thành",500,"CLASSIC","ĐEN"],["2026-05-06T01:54:13.901Z","0031/2026/PLMR-AT","2026-02-19","System Import","POLOMANOR","AT","",0,62100000,0,62100000,"3/2026","Pending","2026-03-09","2026-03-12","2026-03-13","2026-03-18","Pending","Pending","","Hoàn thành",500,"CLASSIC","XÁM NHẠT"],["2026-05-06T01:54:13.901Z","0032/2026/PLMR-AT","2026-02-19","System Import","POLOMANOR","AT","",0,62100000,0,62100000,"3/2026","Pending","2026-03-09","2026-03-12","2026-03-13","2026-03-18","Pending","Pending","","Hoàn thành",500,"CLASSIC","KEM NHẠT"],["2026-05-06T01:54:13.901Z","0034/2026/PLMR-AN","2026-02-26","System Import","POLOMANOR","AN","",0,58500000,0,58500000,"3/2026","Pending","2026-03-16","2026-03-19","2026-03-20","2026-03-25","Pending","Pending","","Hoàn thành",500,"CLASSIC DIAMOND","NAVY"],["2026-05-06T01:54:13.901Z","0035/2026/PLMR-AT","2026-02-27","System Import","POLOMANOR","AT","",0,72900000,0,72900000,"3/2026","Pending","2026-03-17","2026-03-20","2026-03-21","2026-03-26","Pending","Pending","","Hoàn thành(thiếu)",500,"ZYBER","ĐEN"],["2026-05-06T01:54:13.901Z","0036/2026/PLMR-AT","2026-02-04","System Import","POLOMANOR","AT","",0,99360000,0,99360000,"3/2026","Pending","2026-02-22","2026-02-25","2026-02-26","2026-03-03","Pending","Pending","","Hoàn thành(thiếu)",800,"TRAVIS","NAVY"],["2026-05-06T01:54:13.901Z","0037/2026/PLMR-AT","2026-02-11","System Import","POLOMANOR","AT","",0,82296000,0,82296000,"3/2026","Pending","2026-03-01","2026-03-04","2026-03-05","2026-03-10","Pending","Pending","","Hoàn thành",600,"MAVEN","NAVY"],["2026-05-06T01:54:13.901Z","0038/2026/PLMR-AT","2026-02-24","System Import","POLOMANOR","AT","",0,72900000,0,72900000,"3/2026","Pending","2026-03-14","2026-03-17","2026-03-18","2026-03-23","Pending","Pending","","Hoàn thành(thiếu)",500,"ZYBER","CAFE"],["2026-05-06T01:54:13.901Z","0039/2026/PLMR-AT","2026-02-25","System Import","POLOMANOR","AT","",0,116640000,0,116640000,"3/2026","Pending","2026-03-15","2026-03-18","2026-03-19","2026-03-24","Pending","Pending","","Hoàn thành(thiếu)",800,"ZYBER","BE NHẠT"],["2026-05-06T01:54:13.901Z","0041/2026/PLMR-AT","2026-02-21","System Import","POLOMANOR","AT","",0,99360000,0,99360000,"3/2026","Pending","2026-03-11","2026-03-14","2026-03-15","2026-03-20","Pending","Pending","","Hoàn thành",800,"CLASSIC","XÁM ĐẬM"],["2026-05-06T01:54:13.901Z","0042/2026/PLMR-TLN","2026-02-11","System Import","POLOMANOR","TLN","",0,79120800,0,79120800,"3/2026","Pending","2026-03-01","2026-03-04","2026-03-05","2026-03-10","Pending","Pending","","Hoàn thành",600,"NIVIX","KEM NHẠT"],["2026-05-06T01:54:13.901Z","0043/2026/PLMR-TLN","2026-02-10","System Import","POLOMANOR","TLN","",0,76593600,0,76593600,"3/2026","Pending","2026-02-28","2026-03-03","2026-03-04","2026-03-09","Pending","Pending","","Hoàn thành",600,"ADEN","TRẮNG"],["2026-05-06T01:54:13.901Z","0044/2026/PLMR-LC","2026-02-04","System Import","POLOMANOR","LC","",0,89600000,0,89600000,"3/2026","Pending","2026-02-22","2026-02-25","2026-02-26","2026-03-03","Pending","Pending","","Hoàn thành",800,"SHORT KAKI","BE"],["2026-05-06T01:54:13.901Z","0045/2026/PLMR-LC","2026-02-04","System Import","POLOMANOR","LC","",0,56000000,0,56000000,"3/2026","Pending","2026-02-22","2026-02-25","2026-02-26","2026-03-03","Pending","Pending","","Hoàn thành",500,"SHORT KAKI","BE ĐẬM"],["2026-05-06T01:54:13.902Z","0046/2026/PLMR-LC","2026-02-04","System Import","POLOMANOR","LC","",0,56000000,0,56000000,"3/2026","Pending","2026-02-22","2026-02-25","2026-02-26","2026-03-03","Pending","Pending","","Hoàn thành(thiếu)",500,"SHORT KAKI","NÂU"],["2026-05-06T01:54:13.902Z","0047/2026/PLMR-AT","2026-02-06","System Import","POLOMANOR","AT","",0,83592000,0,83592000,"3/2026","Pending","2026-02-24","2026-02-27","2026-02-28","2026-03-05","Pending","Pending","","Hoàn thành",600,"IRISH PMD35","KEM"],["2026-05-06T01:54:13.902Z","0049/2026/PLMR-TLN","2026-03-05","System Import","POLOMANOR","TLN","",0,50787000,0,50787000,"4/2026","Pending","2026-03-23","2026-03-26","2026-03-27","2026-04-01","Pending","Pending","","Hoàn thành",450,"BASIC SYMBOL","TRẮNG"],["2026-05-06T01:54:13.902Z","0050/2026/PLMR-TLN","2026-02-19","System Import","POLOMANOR","TLN","",0,112860000,0,112860000,"3/2026","Pending","2026-03-09","2026-03-12","2026-03-13","2026-03-18","Pending","Pending","","Hoàn thành(thiếu)",1000,"BASIC SYMBOL","ĐEN"],["2026-05-06T01:54:13.902Z","0051/2026/PLMR-TLN","2026-02-25","System Import","POLOMANOR","TLN","",0,67716000,0,67716000,"3/2026","Pending","2026-03-15","2026-03-18","2026-03-19","2026-03-24","Pending","Pending","","Hoàn thành",600,"BASIC SYMBOL","KEM NHẠT"],["2026-05-06T01:54:13.902Z","0052/2026/PLMR-TLN","2026-02-26","System Import","POLOMANOR","TLN","",0,67716000,0,67716000,"3/2026","Pending","2026-03-16","2026-03-19","2026-03-20","2026-03-25","Pending","Pending","","Hoàn thành",600,"BASIC SYMBOL","NAVY"],["2026-05-06T01:54:13.902Z","0053/2026/PLMR-TLN","2026-03-18","System Import","POLOMANOR","TLN","",0,112860000,0,112860000,"4/2026","Pending","2026-04-05","2026-04-08","2026-04-09","2026-04-14","Pending","Pending","","Hoàn thành",1000,"BASIC SYMBOL","TRẮNG"],["2026-05-06T01:54:13.902Z","0056/2026/PLMR-TLN","2026-03-26","System Import","POLOMANOR","TLN","",0,90288000,0,90288000,"4/2026","Pending","2026-04-13","2026-04-16","2026-04-17","2026-04-22","Pending","Pending","","Hoàn thành",800,"BASIC SYMBOL","NAVY"],["2026-05-06T01:54:13.902Z","0057/2026/PLMR-TLN","2026-03-05","System Import","POLOMANOR","TLN","",0,97027200,0,97027200,"4/2026","Pending","2026-03-23","2026-03-26","2026-03-27","2026-04-01","Pending","Pending","","Hoàn thành",800,"JAY","TRẮNG"],["2026-05-06T01:54:13.902Z","0058/2026/PLMR-TLN","2026-03-05","System Import","POLOMANOR","TLN","",0,97027200,0,97027200,"4/2026","Pending","2026-03-23","2026-03-26","2026-03-27","2026-04-01","Pending","Pending","","Hoàn thành",800,"JAY","NAVY"],["2026-05-06T01:54:13.902Z","0059/2026/PLMR-TLN","2026-02-10","System Import","POLOMANOR","TLN","",0,90288000,0,90288000,"3/2026","Pending","2026-02-28","2026-03-03","2026-03-04","2026-03-09","Pending","Pending","","Hoàn thành",800,"BASIC SYMBOL","CAFE"],["2026-05-06T01:54:13.902Z","0060/2026/PLMR-TLN","2026-02-11","System Import","POLOMANOR","TLN","",0,169290000,0,169290000,"3/2026","Pending","2026-03-01","2026-03-04","2026-03-05","2026-03-10","Pending","Pending","","Hoàn thành",1500,"BASIC SYMBOL","ĐEN"],["2026-05-06T01:54:13.902Z","0061/2026/PLMR-TLN","2026-02-10","System Import","POLOMANOR","TLN","",0,45144000,0,45144000,"3/2026","Pending","2026-02-28","2026-03-03","2026-03-04","2026-03-09","Pending","Pending","","Hoàn thành",400,"BASIC SYMBOL","NAVY"],["2026-05-06T01:54:13.902Z","0062/2026/PLMR-AT","2026-02-18","System Import","POLOMANOR","AT","",0,74520000,0,74520000,"3/2026","Pending","2026-03-08","2026-03-11","2026-03-12","2026-03-17","Pending","Pending","","Hoàn thành(thiếu)",600,"CLASSIC","ĐEN"],["2026-05-06T01:54:13.902Z","0063/2026/PLMR-AT","2026-02-05","System Import","POLOMANOR","AT","",0,101952000,0,101952000,"3/2026","Pending","2026-02-23","2026-02-26","2026-02-27","2026-03-04","Pending","Pending","","Hoàn thành",800,"BASIC DIAMOND","NAVY"],["2026-05-06T01:54:13.902Z","0064/2026/PLMR-LC","2026-02-04","System Import","POLOMANOR","LC","",0,360000000,0,360000000,"3/2026","Pending","2026-02-22","2026-02-25","2026-02-26","2026-03-03","Pending","Pending","","Hoàn thành",2000,"JEAN STRAIGHT","XANH NHẠT"],["2026-05-06T01:54:13.902Z","0065/2026/PLMR-AT","2026-02-03","System Import","POLOMANOR","AT","",0,63720000,0,63720000,"3/2026","Pending","2026-02-21","2026-02-24","2026-02-25","2026-03-02","Pending","Pending","","Hoàn thành(thiếu)",500,"BASIC DIAMOND","ĐEN"],["2026-05-06T01:54:13.902Z","0066/2026/PLMR-AT","2026-02-03","System Import","POLOMANOR","AT","",0,63720000,0,63720000,"3/2026","Pending","2026-02-21","2026-02-24","2026-02-25","2026-03-02","Pending","Pending","","Hoàn thành(thiếu)",500,"BASIC DIAMOND","TRẮNG"],["2026-05-06T01:54:13.902Z","0068/2026/PLMR-AT","2026-02-04","System Import","POLOMANOR","AT","",0,111780000,0,111780000,"3/2026","Pending","2026-02-22","2026-02-25","2026-02-26","2026-03-03","Pending","Pending","","Hoàn thành(thiếu)",900,"CLASSIC DIAMOND V2","BE NHẠT"],["2026-05-06T01:54:13.902Z","0069/2026/PLMR-AN","2026-03-05","System Import","POLOMANOR","AN","",0,58500000,0,58500000,"4/2026","Pending","2026-03-23","2026-03-26","2026-03-27","2026-04-01","Pending","Pending","","Hoàn thành",500,"CLASSIC DIAMOND","NAVY"],["2026-05-06T01:54:13.902Z","0070/2026/PLMR-TT","2026-02-14","System Import","POLOMANOR","TT","",0,15660000,0,15660000,"3/2026","Pending","2026-03-04","2026-03-07","2026-03-08","2026-03-13","Pending","Pending","","Hoàn thành",1000,"VỚ LOGO","ĐEN"],["2026-05-06T01:54:13.902Z","0071/2026/PLMR-TT","2026-02-14","System Import","POLOMANOR","TT","",0,15660000,0,15660000,"3/2026","Pending","2026-03-04","2026-03-07","2026-03-08","2026-03-13","Pending","Pending","","Hoàn thành",1000,"VỚ LOGO","TRẮNG"],["2026-05-06T01:54:13.902Z","0072/2026/PLMR-TLN","2026-03-07","System Import","POLOMANOR","TLN","",0,108000000,0,108000000,"4/2026","Pending","2026-03-25","2026-03-28","2026-03-29","2026-04-03","Pending","Pending","","Hoàn thành",800,"NORF","TRẮNG"],["2026-05-06T01:54:13.902Z","0074/2026/PLMR-AT","2026-03-25","System Import","POLOMANOR","AT","",0,62100000,0,62100000,"4/2026","Pending","2026-04-12","2026-04-15","2026-04-16","2026-04-21","Pending","Pending","","Hoàn thành",500,"TRAVIS","NAVY"],["2026-05-06T01:54:13.902Z","0077/2026/PLMR-AT","2026-03-06","System Import","POLOMANOR","AT","",0,111456000,0,111456000,"4/2026","Pending","2026-03-24","2026-03-27","2026-03-28","2026-04-02","Pending","Pending","","Hoàn thành",800,"LINE","NAVY"],["2026-05-06T01:54:13.902Z","0078/2026/PLMR-AT","2026-03-06","System Import","POLOMANOR","AT","",0,100224000,0,100224000,"4/2026","Pending","2026-03-24","2026-03-27","2026-03-28","2026-04-02","Pending","Pending","","Hoàn thành(thiếu)",800,"TRAVIS","CAFE"],["2026-05-06T01:54:13.902Z","0090/2026/PLMR-AT","2026-03-17","System Import","POLOMANOR","AT","",0,102816000,0,102816000,"4/2026","Pending","2026-04-04","2026-04-07","2026-04-08","2026-04-13","Pending","Pending","","Hoàn thành(thiếu)",800,"CLASSIC DIAMOND V2","ĐỎ NÂU"],["2026-05-06T01:54:13.902Z","0091/2026/PLMR-TLN","2026-03-24","System Import","POLOMANOR","TLN","",0,90288000,0,90288000,"4/2026","Pending","2026-04-11","2026-04-14","2026-04-15","2026-04-20","Pending","Pending","","Hoàn thành",800,"BASIC SYMBOL","BE"],["2026-05-06T01:54:13.902Z","0094/2026/PLMR-TLN","2026-03-20","System Import","POLOMANOR","TLN","",0,101260800,0,101260800,"4/2026","Pending","2026-04-07","2026-04-10","2026-04-11","2026-04-16","Pending","Pending","","Hoàn thành",800,"WICK","BE ĐẬM"],["2026-05-06T01:54:13.902Z","0095/2026/PLMR-TLN","2026-03-20","System Import","POLOMANOR","TLN","",0,97027200,0,97027200,"4/2026","Pending","2026-04-07","2026-04-10","2026-04-11","2026-04-16","Pending","Pending","","Hoàn thành(thiếu)",800,"JAY","KEM NHẠT"],["2026-05-06T01:54:13.902Z","0106/2026/PLMR-LC","2026-04-01","System Import","POLOMANOR","LC","",0,97200000,0,97200000,"4/2026","Pending","2026-04-19","2026-04-22","2026-04-23","2026-04-28","Pending","Pending","","Hoàn thành(thiếu)",500,"KAKI STRAIGHT","BE"],["2026-05-06T01:54:13.902Z","0107/2026/PLMR-LC","2026-04-01","System Import","POLOMANOR","LC","",0,97200000,0,97200000,"4/2026","Pending","2026-04-19","2026-04-22","2026-04-23","2026-04-28","Pending","Pending","","Hoàn thành(thiếu)",500,"KAKI STRAIGHT","ĐEN"],["2026-05-06T01:54:13.902Z","0108/2026/PLMR-LC","2026-04-01","System Import","POLOMANOR","LC","",0,97200000,0,97200000,"4/2026","Pending","2026-04-19","2026-04-22","2026-04-23","2026-04-28","Pending","Pending","","Hoàn thành",500,"KAKI STRAIGHT","NÂU"],["2026-05-06T01:54:13.902Z","0109/2026/PLMR-LC","2026-04-01","System Import","POLOMANOR","LC","",0,155520000,0,155520000,"4/2026","Pending","2026-04-19","2026-04-22","2026-04-23","2026-04-28","Pending","Pending","","NEW IN - CHỦ LỰC",800,"KAKI STRAIGHT","KEM"],["2026-05-06T01:54:13.902Z","0110/2026/PLMR-GLX","2026-03-31","System Import","POLOMANOR","GLX","",0,120096000,0,120096000,"4/2026","Pending","2026-04-18","2026-04-21","2026-04-22","2026-04-27","Pending","Pending","","Hoàn thành",800,"Sơ mi OXFORD PREMIUM","TRẮNG 02"],["2026-05-06T01:54:13.902Z","0112/2026/PLMR-GLX","2026-03-31","System Import","POLOMANOR","GLX","",0,120096000,0,120096000,"4/2026","Pending","2026-04-18","2026-04-21","2026-04-22","2026-04-27","Pending","Pending","","Hoàn thành",800,"Sơ mi OXFORD PREMIUM","XANH NHẠT 07"],["2026-05-06T01:54:13.902Z","0113/2026/PLMR-GLX","2026-03-31","System Import","POLOMANOR","GLX","",0,120096000,0,120096000,"4/2026","Pending","2026-04-18","2026-04-21","2026-04-22","2026-04-27","Pending","Pending","","Hoàn thành",800,"Sơ mi OXFORD PREMIUM","BE"],["2026-05-06T01:54:13.902Z","0116/2026/PLMR-GLX","2026-03-27","System Import","POLOMANOR","GLX","",0,89748000,0,89748000,"4/2026","Pending","2026-04-14","2026-04-17","2026-04-18","2026-04-23","Pending","Pending","","Hoàn thành",600,"Sơ mi POPLIN","ĐEN 147"],["2026-05-06T01:54:13.902Z","0118/2026/PLMR-AT","2026-04-16","System Import","POLOMANOR","AT","",0,71280000,0,71280000,"5/2026","Pending","2026-05-04","2026-05-07","2026-05-08","2026-05-13","Pending","Pending","","RESTOCK - CHỦ LỰC",600,"BASIC CLASSIC","XÁM NHẠT"],["2026-05-06T01:54:13.902Z","0122/2026/PLMR-AT","2026-04-05","System Import","POLOMANOR","AT","",0,102816000,0,102816000,"5/2026","Pending","2026-04-23","2026-04-26","2026-04-27","2026-05-02","Pending","Pending","","Hoàn thành(thiếu)",800,"BASIC DIAMOND","KEM"],["2026-05-06T01:54:13.902Z","0123/2026/PLMR-AT","2026-04-11","System Import","POLOMANOR","AT","",0,102816000,0,102816000,"5/2026","Pending","2026-04-29","2026-05-02","2026-05-03","2026-05-08","Pending","Pending","","NEW IN - NEWIN",800,"CLASSIC DIAMOND V2","XANH KHÓI"],["2026-05-06T01:54:13.902Z","0124/2026/PLMR-AT","2026-04-11","System Import","POLOMANOR","AT","",0,102816000,0,102816000,"5/2026","Pending","2026-04-29","2026-05-02","2026-05-03","2026-05-08","Pending","Pending","","NEW IN - NEWIN",800,"CLASSIC DIAMOND V2","XANH DENIM"],["2026-05-06T01:54:13.902Z","0129/2026/PLMR-AT","2026-04-29","System Import","POLOMANOR","AT","",0,111456000,0,111456000,"5/2026","Pending","2026-05-17","2026-05-20","2026-05-21","2026-05-26","Pending","Pending","","NEW IN - NEWIN",800,"PHILO PK75","TRẮNG KEM"],["2026-05-06T01:54:13.902Z","0130/2026/PLMR-AT","2026-04-29","System Import","POLOMANOR","AT","",0,119232000,0,119232000,"5/2026","Pending","2026-05-17","2026-05-20","2026-05-21","2026-05-26","Pending","Pending","","NEW IN - NEWIN",800,"KITT PMK82","XANH MINT"],["2026-05-06T01:54:13.902Z","0131/2026/PLMR-TLN","2026-04-12","System Import","POLOMANOR","TLN","",0,56430000,0,56430000,"5/2026","Pending","2026-04-30","2026-05-03","2026-05-04","2026-05-09","Pending","Pending","","RESTOCK - CHỦ LỰC",500,"BASIC SYMBOL","ĐEN"],["2026-05-06T01:54:13.902Z","0133/2026/PLMR-TLN","2026-04-17","System Import","POLOMANOR","TLN","",0,90288000,0,90288000,"5/2026","Pending","2026-05-05","2026-05-08","2026-05-09","2026-05-14","Pending","Pending","","RESTOCK - CHỦ LỰC",800,"BASIC SYMBOL","NAVY"],["2026-05-06T01:54:13.902Z","0134/2026/PLMR-TLN","2026-04-12","System Import","POLOMANOR","TLN","",0,67716000,0,67716000,"5/2026","Pending","2026-04-30","2026-05-03","2026-05-04","2026-05-09","Pending","Pending","","RESTOCK - CHỦ LỰC",600,"BASIC SYMBOL","BE NHẠT"],["2026-05-06T01:54:13.902Z","0135/2026/PLMR-TLN","2026-04-05","System Import","POLOMANOR","TLN","",0,100915200,0,100915200,"5/2026","Pending","2026-04-23","2026-04-26","2026-04-27","2026-05-02","Pending","Pending","","NEW IN - NEWIN",800,"BASIC DIAMOND","OLIU"],["2026-05-06T01:54:13.903Z","0136/2026/PLMR-TLN","2026-04-05","System Import","POLOMANOR","TLN","",0,100915200,0,100915200,"5/2026","Pending","2026-04-23","2026-04-26","2026-04-27","2026-05-02","Pending","Pending","","Hoàn thành",800,"BASIC DIAMOND","RÊU"],["2026-05-06T01:54:13.903Z","0137/2026/PLMR-TLN","2026-04-05","System Import","POLOMANOR","TLN","",0,100915200,0,100915200,"5/2026","Pending","2026-04-23","2026-04-26","2026-04-27","2026-05-02","Pending","Pending","","NEW IN - NEWIN",800,"BASIC DIAMOND","INDIGO"],["2026-05-06T01:54:13.903Z","0138/2026/PLMR-TLN","2026-04-22","System Import","POLOMANOR","TLN","",0,76593600,0,76593600,"5/2026","Pending","2026-05-10","2026-05-13","2026-05-14","2026-05-19","Pending","Pending","","RESTOCK - DUY TRÌ",600,"ADEN","TRẮNG"],["2026-05-06T01:54:13.903Z","0139/2026/PLMR-TLN","2026-04-15","System Import","POLOMANOR","TLN","",0,79120800,0,79120800,"5/2026","Pending","2026-05-03","2026-05-06","2026-05-07","2026-05-12","Pending","Pending","","RESTOCK - DUY TRÌ",600,"NIVIX","KEM NHẠT"],["2026-05-06T01:54:13.903Z","0140/2026/PLMR-TLN","2026-04-15","System Import","POLOMANOR","TLN","",0,101260800,0,101260800,"5/2026","Pending","2026-05-03","2026-05-06","2026-05-07","2026-05-12","Pending","Pending","","RESTOCK - DUY TRÌ",800,"RUM","KEM NHẠT"],["2026-05-06T01:54:13.903Z","0141/2026/PLMR-TLN","2026-04-15","System Import","POLOMANOR","TLN","",0,97891200,0,97891200,"5/2026","Pending","2026-05-03","2026-05-06","2026-05-07","2026-05-12","Pending","Pending","","RESTOCK - DUY TRÌ",800,"ANDY","KEM NHẠT"],["2026-05-06T01:54:13.903Z","0146/2026/PLMR-TLN","2026-04-07","System Import","POLOMANOR","TLN","",0,108864000,0,108864000,"5/2026","Pending","2026-04-25","2026-04-28","2026-04-29","2026-05-04","Pending","Pending","","NEW IN - NEWIN",800,"TORA - PMB85","KEM  NHẠT"],["2026-05-06T01:54:13.903Z","0147/2026/PLMR-TLN","2026-04-07","System Import","POLOMANOR","TLN","",0,102988800,0,102988800,"5/2026","Pending","2026-04-25","2026-04-28","2026-04-29","2026-05-04","Pending","Pending","","NEW IN - NEWIN",800,"ALLI - PMB81","KEM VÀNG"],["2026-05-06T01:54:13.903Z","0148/2026/PLMR-LC","2026-04-23","System Import","POLOMANOR","LC","",0,97200000,0,97200000,"5/2026","Pending","2026-05-11","2026-05-14","2026-05-15","2026-05-20","Pending","Pending","","RESTOCK - CHỦ LỰC",500,"JEAN STRAIGHT","ĐEN"]];
  var noc=oh.length;
  o=o.map(function(r){var row=r.slice(0,noc);while(row.length<noc)row.push("");return row;});

  // Convert date columns to Date objects
  o.forEach(function(row) {
    row[2] = toDate(row[2]);   // Ngày đặt hàng
    row[13] = toDate(row[13]); // Hạn Duyệt
    row[14] = toDate(row[14]); // Hạn Cắt Vải
    row[15] = toDate(row[15]); // Hạn Lên Chuyền
    row[16] = toDate(row[16]); // Hạn Hoàn Thành
  });
  if(o.length>0)orderSheet.getRange(2,1,o.length,noc).setValues(o);

  // Format date columns as dd/mm/yyyy
  if(o.length>0) {
    orderSheet.getRange(2,3,o.length,1).setNumberFormat("dd/mm/yyyy");
    orderSheet.getRange(2,14,o.length,4).setNumberFormat("dd/mm/yyyy");
  }
  SpreadsheetApp.getUi().alert("Part 1 xong! "+d.length+" details + "+o.length+" orders. Tiep tuc chay importPart2()");
}

/**
 * BƯỚC 2: Chạy SAU importPart1().
 */
function importPart2() {

  // Convert ISO date strings to Date objects
  function toDate(s) {
    if (!s) return "";
    var str = String(s);
    var m = str.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(parseInt(m[1]), parseInt(m[2])-1, parseInt(m[3]));
    return s;
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var detailSheet = ss.getSheetByName("data_order_details");
  var lr=detailSheet.getLastRow();
  var d=[["0149/2026/PLMR-LC","JEAN STRAIGHT","PO216","XANH ĐẬM",500,194400,97200000,"","2026-05-21","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","",50,125,150,125,50,""],["0150/2026/PLMR-LC","KAKI SD","PO126","BE",600,136080,81648000,"","2026-05-26","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","",50,150,150,150,100,""],["0152/2026/PLMR-GLX","Sơ mi  OXFORD PREMIUM","PO252","TRẮNG 02",800,150120,120096000,"","2026-05-22","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",200,250,250,100,""],["0153/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","NAVY 35",800,159840,127872000,"","2026-05-22","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",200,250,250,100,""],["0154/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","BE",700,150120,105084000,"","2026-05-22","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",175,250,175,100,""],["0155/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","ĐEN",600,159840,95904000,"","2026-05-22","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",175,200,150,75,""],["0156/2026/PLMR-GLX","Sơ mi TAY NGẮN OXFORD","PO307","TRẮNG",600,137160,82296000,"","2026-05-29","NEW IN - NEWIN","Pending","Pending","Pending","","","",175,200,150,75,""],["0157/2026/PLMR-GLX","Sơ mi TAY NGẮN OXFORD","PO307","ĐEN",600,143640,86184000,"","2026-05-29","NEW IN - NEWIN","Pending","Pending","Pending","","","",175,200,150,75,""],["0158/2026/PLMR-GLX","Sơ mi TAY NGẮN OXFORD","PO307","NAVY",600,143640,86184000,"","2026-05-29","NEW IN - NEWIN","Pending","Pending","Pending","","","",175,200,150,75,""],["0161/2026/PLMR-AT","BASIC DIAMOND","PO166","CHOCO",600,128520,77112000,"","2026-06-13","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","",175,200,150,75,""],["0162/2026/PLMR-AT","BASIC DIAMOND","PO166","XANH LÁ",600,128520,77112000,"","2026-06-13","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","",175,200,150,75,""],["0164/2026/PLMR-AT","CLASSIC DIAMOND V2","PO276","NAVY",600,126360,75816000,"","2026-06-18","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","",175,200,150,75,""],["0165/2026/PLMR-AT","CLASSIC DIAMOND V2","PO276","TRẮNG",600,126360,75816000,"","2026-06-18","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","",175,200,150,75,""],["0166/2026/PLMR-TLN","BASIC SYMBOL","PO88","TRẮNG",1000,112860,112860000,"","2026-06-03","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","",300,300,250,150,""],["0167/2026/PLMR-TLN","BASIC SYMBOL","PO88","NAVY",800,112860,90288000,"","2026-06-12","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","",250,250,200,100,""],["0168/2026/PLMR-TLN","BASIC SYMBOL","PO88","KEM NHẠT",600,112860,67716000,"","2026-06-12","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","",175,200,150,75,""],["0169/2026/PLMR-TLN","BASIC SYMBOL","PO88","XANH LÁ",600,112860,67716000,"","2026-06-12","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","",175,200,150,75,""],["0171/2026/PLMR-TLN","BASIC SYMBOL","PO88","KEM VÀNG",600,112860,67716000,"","2026-06-09","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","",175,200,150,75,""],["0173/2026/PLMR-TLN","LOKI PMD19","PO225","NAVY",800,127656,102124800,"","2026-06-24","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",250,250,200,100,""],["0177/2026/PLMR-TLN","DALE  PMB86","PO305","KEM VÀNG",550,137052,75378600,"","2026-06-03","NEW IN - NEWIN","Pending","Pending","Pending","","","",125,175,175,75,""],["0179/2026/PLMR-LC","SHORT KAKI","PO99","ĐEN",600,123120,73872000,"","2026-06-11","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","",50,170,200,180,"",""],["0180/2026/PLMR-LC","SHORT KAKI","PO99","BE ĐẬM",600,123120,73872000,"","2026-06-11","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","",50,170,200,180,"",""],["0181/2026/PLMR-LC","SHORT KAKI","PO99","TRẮNG",800,123120,98496000,"","2026-06-11","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","",50,250,300,200,"",""],["0185/2026/PLMR-LC","KAKI SD","PO126","ĐEN",500,136080,68040000,"","2026-06-27","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","",50,150,150,100,50,""],["0186/2026/PLMR-LC","KAKI SD","PO126","BE",500,136080,68040000,"","2026-06-27","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","",50,150,150,100,50,""],["0187/2026/PLMR-LC","KAKI SD","PO126","NÂU",500,136080,68040000,"","2026-06-27","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","",50,150,150,100,50,""],["0189/2026/PLMR-LC","QUẦN TÂY LƯNG CHUN","PO86","BE",500,168480,84240000,"","2026-06-27","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","",50,150,150,100,50,""],["0196/2026/PLMR-AT","BASIC CLASSIC","PO119","XÁM NHẠT",600,118800,71280000,"","2026-07-07","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","",175,200,150,75,""],["0198/2026/PLMR-AT","BASIC CLASSIC","PO119","NAVY KEM",600,118800,71280000,"","2026-07-17","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","",175,200,150,75,""],["0200/2026/PLMR-AT","CLASSIC DIAMOND V2","PO276","BE NHẠT",600,128520,77112000,"","2026-07-25","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","",175,200,150,75,""],["0201/2026/PLMR-TLN","BASIC SYMBOL","PO88","TRẮNG",1500,112860,169290000,"","2026-07-07","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","",400,500,400,200,""],["0202/2026/PLMR-TLN","BASIC SYMBOL","PO88","ĐEN",800,112860,90288000,"","2026-07-07","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","",250,250,200,100,""],["0203/2026/PLMR-TLN","BASIC SYMBOL","PO88","NAVY",800,112860,90288000,"","2026-07-15","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","",250,250,200,100,""],["0204/2026/PLMR-TLN","BASIC SYMBOL","PO88","BE",800,112860,90288000,"","2026-07-18","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","",250,250,200,100,""],["0205/2026/PLMR-TLN","BASIC SYMBOL","PO88","BE NHẠT",600,112860,67716000,"","2026-07-18","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","",175,200,150,75,""],["0207/2026/PLMR-TLN","BASIC SYMBOL","PO88","MINT",800,112860,90288000,"","2026-07-02","NEW IN - NEWIN","Pending","Pending","Pending","","","",250,250,200,100,""],["0208/2026/PLMR-TLN","BASIC SYMBOL","PO88","OLIU",800,112860,90288000,"","2026-07-02","NEW IN - NEWIN","Pending","Pending","Pending","","","",250,250,200,100,""],["0209/2026/PLMR-TLN","BASIC SYMBOL","PO88","DENIM",800,127656,102124800,"","2026-07-02","NEW IN - NEWIN","Pending","Pending","Pending","","","",250,250,200,100,""],["0210/2026/PLMR-TLN","ADEN","PO105","TRẮNG",800,127656,102124800,"","2026-07-15","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",250,250,200,100,""],["0212/2026/PLMR-TLN","RUM","PO241","KEM NHẠT",800,126576,101260800,"","2026-07-05","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",250,250,200,100,""],["0214/2026/PLMR-TLN","KANE","PO235","NAVY",600,129816,77889600,"","2026-07-24","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",175,200,150,75,""],["0215/2026/PLMR-TLN","WADE","PO236","NAVY",600,128736,77241600,"","2026-07-24","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",175,200,150,75,""],["0216/2026/PLMR-TLN","WICK","PO226","BE ĐẬM",800,126576,101260800,"","2026-07-10","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",250,250,200,100,""],["0217/2026/PLMR-TLN","RUM PMK36","PO241","KHAKI",600,126576,75945600,"","2026-07-05","NEW IN - NEWIN","Pending","Pending","Pending","","","",175,200,150,75,""],["0218/2026/PLMR-TLN","LEDO PMB87","PO306","KEM NHẠT",600,132948,79768800,"","2026-07-05","NEW IN - NEWIN","Pending","Pending","Pending","","","",175,200,150,75,""],["0219/2026/PLMR-LC","JEAN STRAIGHT","PO216","ĐEN",600,194400,116640000,"","2026-07-15","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","",100,125,150,125,100,""],["0220/2026/PLMR-LC","JEAN STRAIGHT","PO216","XANH ĐẬM",600,194400,116640000,"","2026-07-15","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","",100,125,150,125,100,""],["0221/2026/PLMR-LC","JEAN STRAIGHT","PO216","XANH NHẠT",600,194400,116640000,"","2026-07-04","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","",100,125,150,125,100,""],["0222/2026/PLMR-LC","JEAN STRAIGHT","PO216","INDIGO",800,194400,155520000,"","2026-07-04","NEW IN - NEWIN","Pending","Pending","Pending","","",125,175,200,175,125,""],["0223/2026/PLMR-LC","SHORT KAKI","PO99","ĐEN",800,123120,98496000,"","2026-07-17","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","",50,250,300,200,"",""],["0224/2026/PLMR-LC","SHORT KAKI","PO99","BE ĐẬM",600,123120,73872000,"","2026-07-17","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","",50,170,200,180,"",""],["0226/2026/PLMR-LC","KAKI SD","PO126","ĐEN",500,136080,68040000,"","2026-07-22","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","",50,125,150,125,50,""],["0227/2026/PLMR-LC","KAKI SD","PO126","BE",500,136080,68040000,"","2026-07-22","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","",50,125,150,125,50,""],["0229/2026/PLMR-TLN","TRAVIS","PO98","NAVY",800,124524,99619200,"","2026-06-20","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",250,250,200,100,""],["0230/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","TRẮNG 02",800,150120,120096000,"","2026-07-28","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",200,250,250,100,""],["0231/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","NAVY 35",800,159840,127872000,"","2026-07-28","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",200,250,250,100,""],["0232/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","XANH NHẠT 07",600,150120,90072000,"","2026-07-28","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",175,200,150,75,""],["0233/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","BE",600,150120,90072000,"","2026-07-28","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",175,200,150,75,""],["0234/2026/PLMR-GLX","Sơ mi OXFORD PREMIUM","PO252","ĐEN",600,159840,95904000,"","2026-07-28","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",175,200,150,75,""],["0235/2026/PLMR-GLX","Sơ mi TAY NGẮN  POPLIN","PO308","ĐEN",600,133380,80028000,"","2026-07-03","NEW IN - NEWIN","Pending","Pending","Pending","","","",175,200,150,75,""],["0236/2026/PLMR-GLX","Sơ mi TAY NGẮN  POPLIN","PO308","CAFE",600,133380,80028000,"","2026-07-03","NEW IN - NEWIN","Pending","Pending","Pending","","","",175,200,150,75,""],["0237/2026/PLMR-TLN","MAVEN","PO230","NAVY",800,135000,108000000,"","2026-06-24","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",250,250,200,100,""],["0238/2026/PLMR-TLN","IRISH PMD35","PO260","KEM",800,135000,108000000,"","2026-07-10","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",250,250,200,100,""],["0239/2026/PLMR-AT","IRISH PMD35","PO260","KEM",250,139320,34830000,"","2026-05-08","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",100,150,"","",""],["0240/2026/PLMR-AT","ZYBER","PO210","ĐEN",700,135000,94500000,"","2026-06-20","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","",250,250,125,75,""],["0241/2026/PLMR-HN KNIT","VỚ LOGO","VO5","TRẮNG",2000,11000,22000000,"","2026-04-12","Hoàn thành","Pending","Pending","Pending","","",2000,"","","","",""],["0242/2026/PLMR-HN KNIT","VỚ LOGO","VO5","ĐEN",2000,11000,22000000,"","2026-04-12","Hoàn thành","Pending","Pending","Pending","","",2000,"","","","",""],["0245/2026/PLMR-HN KNIT","VỚ LOGO","VO5","TRẮNG",2000,11000,22000000,"","2026-06-30","RESTOCK - PHỄU","Pending","Pending","Pending","","",2000,"","","","",""],["0246/2026/PLMR-HN KNIT","VỚ LOGO","VO5","ĐEN",2000,11000,22000000,"","2026-06-30","RESTOCK - PHỄU","Pending","Pending","Pending","","",2000,"","","","",""],["0249/2026/PLMR-TLN","BASIC SYMBOL","PO88","TRẮNG",550,112860,62073000,"","2026-03-28","Hoàn thành","Pending","Pending","Pending","","","",280,270,"","",""],["0250/2026/PLMR-TLN","TÚI GIẶT","PO401","TRẮNG",2000,17496,34992000,"","2026-05-05","NEW IN - PHỄU","Pending","Pending","Pending","","",2000,"","","","",""],["0251/2026/PLMR-TLN","TÚI GIẶT","PO401","TRẮNG",2000,17496,34992000,"","2026-06-05","RESTOCK - PHỄU","Pending","Pending","Pending","","",2000,"","","","",""],["0252/2026/PLMR-TLN","TÚI GIẶT","PO401","TRẮNG",2000,17496,34992000,"","2026-07-09","RESTOCK - PHỄU","Pending","Pending","Pending","","",2000,"","","","",""],["0253/2026/PLMR-TLN","BASIC SYMBOL","PO88","XANH LÁ",800,112860,90288000,"","","RESTOCK - CHỦ LỰC","Pending","Pending","Pending","","","",250,250,200,100,""],["0260/2026/PLMR-TLN","RICHIE","PO403","TRẮNG KEM",600,142344,85406400,"","2026-07-03","NEW IN - DUY TRÌ","Pending","Pending","Pending","","","",150,250,150,50,""],["0261/2026/PLMR-TLN","RICHIE","PO403","TRẮNG KEM",600,142344,85406400,"","2026-07-03","NEW IN - DUY TRÌ","Pending","Pending","Pending","","","",150,250,150,50,""],["0262/2026/PLMR-KP","TSHIRT BASIC US","PO217","TRẮNG",800,86400,69120000,"","2026-06-04","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",230,270,200,100,""],["0270/2026/PLMR-VH","TANKTOP BASIC","PO404","TRẮNG",1000,24000,24000000,"","2026-06-06","NEW IN - DUY TRÌ","Pending","Pending","Pending","","","",280,370,230,120,""],["0271/2026/PLMR-VH","TANKTOP BASIC","PO404","ĐEN",1000,24000,24000000,"","2026-06-06","NEW IN - DUY TRÌ","Pending","Pending","Pending","","","",280,370,230,120,""],["0272/2026/PLMR-VH","TANKTOP BASIC","PO404","TRẮNG",1000,24000,24000000,"","","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",280,370,230,120,""],["0273/2026/PLMR-VH","TANKTOP BASIC","PO404","ĐEN",1000,24000,24000000,"","","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",280,370,230,120,""],["0274/2026/PLMR-VH","TANKTOP BASIC","PO404","TRẮNG",1000,24000,24000000,"","","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",280,370,230,120,""],["0275/2026/PLMR-VH","TANKTOP BASIC","PO404","ĐEN",1000,24000,24000000,"","","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",280,370,230,120,""],["0276/2026/PLMR-VH","TANKTOP BASIC","PO404","TRẮNG",1000,24000,24000000,"","","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",280,370,230,120,""],["0277/2026/PLMR-VH","TANKTOP BASIC","PO404","ĐEN",1000,24000,24000000,"","","RESTOCK - DUY TRÌ","Pending","Pending","Pending","","","",280,370,230,120,""]];
  var nc=21;
  d=d.map(function(r){var row=r.slice(0,nc);while(row.length<nc)row.push("");return row;});

  // Convert T.Gian Giao (col 8) to Date objects
  d.forEach(function(row) { row[8] = toDate(row[8]); });
  if(d.length>0)detailSheet.getRange(lr+1,1,d.length,nc).setValues(d);
  if(d.length>0)detailSheet.getRange(lr+1,9,d.length,1).setNumberFormat("dd/mm/yyyy");
  var orderSheet = ss.getSheetByName("data_order");
  var olr=orderSheet.getLastRow();
  var o=[["2026-05-06T01:54:13.903Z","0149/2026/PLMR-LC","2026-04-23","System Import","POLOMANOR","LC","",0,97200000,0,97200000,"5/2026","Pending","2026-05-11","2026-05-14","2026-05-15","2026-05-20","Pending","Pending","","RESTOCK - CHỦ LỰC",500,"JEAN STRAIGHT","XANH ĐẬM"],["2026-05-06T01:54:13.903Z","0150/2026/PLMR-LC","2026-04-28","System Import","POLOMANOR","LC","",0,81648000,0,81648000,"5/2026","Pending","2026-05-16","2026-05-19","2026-05-20","2026-05-25","Pending","Pending","","RESTOCK - CHỦ LỰC",600,"KAKI SD","BE"],["2026-05-06T01:54:13.903Z","0152/2026/PLMR-GLX","2026-04-24","System Import","POLOMANOR","GLX","",0,120096000,0,120096000,"5/2026","Pending","2026-05-12","2026-05-15","2026-05-16","2026-05-21","Pending","Pending","","RESTOCK - DUY TRÌ",800,"Sơ mi  OXFORD PREMIUM","TRẮNG 02"],["2026-05-06T01:54:13.903Z","0153/2026/PLMR-GLX","2026-04-24","System Import","POLOMANOR","GLX","",0,127872000,0,127872000,"5/2026","Pending","2026-05-12","2026-05-15","2026-05-16","2026-05-21","Pending","Pending","","RESTOCK - DUY TRÌ",800,"Sơ mi OXFORD PREMIUM","NAVY 35"],["2026-05-06T01:54:13.903Z","0154/2026/PLMR-GLX","2026-04-24","System Import","POLOMANOR","GLX","",0,105084000,0,105084000,"5/2026","Pending","2026-05-12","2026-05-15","2026-05-16","2026-05-21","Pending","Pending","","RESTOCK - DUY TRÌ",700,"Sơ mi OXFORD PREMIUM","BE"],["2026-05-06T01:54:13.903Z","0155/2026/PLMR-GLX","2026-04-24","System Import","POLOMANOR","GLX","",0,95904000,0,95904000,"5/2026","Pending","2026-05-12","2026-05-15","2026-05-16","2026-05-21","Pending","Pending","","RESTOCK - DUY TRÌ",600,"Sơ mi OXFORD PREMIUM","ĐEN"],["2026-05-06T01:54:13.903Z","0156/2026/PLMR-GLX","2026-05-01","System Import","POLOMANOR","GLX","",0,82296000,0,82296000,"5/2026","Pending","2026-05-19","2026-05-22","2026-05-23","2026-05-28","Pending","Pending","","NEW IN - NEWIN",600,"Sơ mi TAY NGẮN OXFORD","TRẮNG"],["2026-05-06T01:54:13.903Z","0157/2026/PLMR-GLX","2026-05-01","System Import","POLOMANOR","GLX","",0,86184000,0,86184000,"5/2026","Pending","2026-05-19","2026-05-22","2026-05-23","2026-05-28","Pending","Pending","","NEW IN - NEWIN",600,"Sơ mi TAY NGẮN OXFORD","ĐEN"],["2026-05-06T01:54:13.903Z","0158/2026/PLMR-GLX","2026-05-01","System Import","POLOMANOR","GLX","",0,86184000,0,86184000,"5/2026","Pending","2026-05-19","2026-05-22","2026-05-23","2026-05-28","Pending","Pending","","NEW IN - NEWIN",600,"Sơ mi TAY NGẮN OXFORD","NAVY"],["2026-05-06T01:54:13.903Z","0161/2026/PLMR-AT","2026-05-16","System Import","POLOMANOR","AT","",0,77112000,0,77112000,"6/2026","Pending","2026-06-03","2026-06-06","2026-06-07","2026-06-12","Pending","Pending","","RESTOCK - CHỦ LỰC",600,"BASIC DIAMOND","CHOCO"],["2026-05-06T01:54:13.903Z","0162/2026/PLMR-AT","2026-05-16","System Import","POLOMANOR","AT","",0,77112000,0,77112000,"6/2026","Pending","2026-06-03","2026-06-06","2026-06-07","2026-06-12","Pending","Pending","","RESTOCK - CHỦ LỰC",600,"BASIC DIAMOND","XANH LÁ"],["2026-05-06T01:54:13.903Z","0164/2026/PLMR-AT","2026-05-21","System Import","POLOMANOR","AT","",0,75816000,0,75816000,"6/2026","Pending","2026-06-08","2026-06-11","2026-06-12","2026-06-17","Pending","Pending","","RESTOCK - CHỦ LỰC",600,"CLASSIC DIAMOND V2","NAVY"],["2026-05-06T01:54:13.903Z","0165/2026/PLMR-AT","2026-05-21","System Import","POLOMANOR","AT","",0,75816000,0,75816000,"6/2026","Pending","2026-06-08","2026-06-11","2026-06-12","2026-06-17","Pending","Pending","","RESTOCK - CHỦ LỰC",600,"CLASSIC DIAMOND V2","TRẮNG"],["2026-05-06T01:54:13.903Z","0166/2026/PLMR-TLN","2026-05-06","System Import","POLOMANOR","TLN","",0,112860000,0,112860000,"6/2026","Pending","2026-05-24","2026-05-27","2026-05-28","2026-06-02","Pending","Pending","","RESTOCK - CHỦ LỰC",1000,"BASIC SYMBOL","TRẮNG"],["2026-05-06T01:54:13.903Z","0167/2026/PLMR-TLN","2026-05-15","System Import","POLOMANOR","TLN","",0,90288000,0,90288000,"6/2026","Pending","2026-06-02","2026-06-05","2026-06-06","2026-06-11","Pending","Pending","","RESTOCK - CHỦ LỰC",800,"BASIC SYMBOL","NAVY"],["2026-05-06T01:54:13.903Z","0168/2026/PLMR-TLN","2026-05-15","System Import","POLOMANOR","TLN","",0,67716000,0,67716000,"6/2026","Pending","2026-06-02","2026-06-05","2026-06-06","2026-06-11","Pending","Pending","","RESTOCK - CHỦ LỰC",600,"BASIC SYMBOL","KEM NHẠT"],["2026-05-06T01:54:13.903Z","0169/2026/PLMR-TLN","2026-05-15","System Import","POLOMANOR","TLN","",0,67716000,0,67716000,"6/2026","Pending","2026-06-02","2026-06-05","2026-06-06","2026-06-11","Pending","Pending","","RESTOCK - CHỦ LỰC",600,"BASIC SYMBOL","XANH LÁ"],["2026-05-06T01:54:13.903Z","0171/2026/PLMR-TLN","2026-05-12","System Import","POLOMANOR","TLN","",0,67716000,0,67716000,"6/2026","Pending","2026-05-30","2026-06-02","2026-06-03","2026-06-08","Pending","Pending","","RESTOCK - CHỦ LỰC",600,"BASIC SYMBOL","KEM VÀNG"],["2026-05-06T01:54:13.903Z","0173/2026/PLMR-TLN","2026-05-27","System Import","POLOMANOR","TLN","",0,102124800,0,102124800,"6/2026","Pending","2026-06-14","2026-06-17","2026-06-18","2026-06-23","Pending","Pending","","RESTOCK - DUY TRÌ",800,"LOKI PMD19","NAVY"],["2026-05-06T01:54:13.903Z","0177/2026/PLMR-TLN","2026-05-06","System Import","POLOMANOR","TLN","",0,75378600,0,75378600,"6/2026","Pending","2026-05-24","2026-05-27","2026-05-28","2026-06-02","Pending","Pending","","NEW IN - NEWIN",550,"DALE  PMB86","KEM VÀNG"],["2026-05-06T01:54:13.903Z","0179/2026/PLMR-LC","2026-05-14","System Import","POLOMANOR","LC","",0,73872000,0,73872000,"6/2026","Pending","2026-06-01","2026-06-04","2026-06-05","2026-06-10","Pending","Pending","","RESTOCK - CHỦ LỰC",600,"SHORT KAKI","ĐEN"],["2026-05-06T01:54:13.903Z","0180/2026/PLMR-LC","2026-05-14","System Import","POLOMANOR","LC","",0,73872000,0,73872000,"6/2026","Pending","2026-06-01","2026-06-04","2026-06-05","2026-06-10","Pending","Pending","","RESTOCK - CHỦ LỰC",600,"SHORT KAKI","BE ĐẬM"],["2026-05-06T01:54:13.903Z","0181/2026/PLMR-LC","2026-05-14","System Import","POLOMANOR","LC","",0,98496000,0,98496000,"6/2026","Pending","2026-06-01","2026-06-04","2026-06-05","2026-06-10","Pending","Pending","","RESTOCK - CHỦ LỰC",800,"SHORT KAKI","TRẮNG"],["2026-05-06T01:54:13.903Z","0185/2026/PLMR-LC","2026-05-30","System Import","POLOMANOR","LC","",0,68040000,0,68040000,"6/2026","Pending","2026-06-17","2026-06-20","2026-06-21","2026-06-26","Pending","Pending","","RESTOCK - CHỦ LỰC",500,"KAKI SD","ĐEN"],["2026-05-06T01:54:13.903Z","0186/2026/PLMR-LC","2026-05-30","System Import","POLOMANOR","LC","",0,68040000,0,68040000,"6/2026","Pending","2026-06-17","2026-06-20","2026-06-21","2026-06-26","Pending","Pending","","RESTOCK - CHỦ LỰC",500,"KAKI SD","BE"],["2026-05-06T01:54:13.903Z","0187/2026/PLMR-LC","2026-05-30","System Import","POLOMANOR","LC","",0,68040000,0,68040000,"6/2026","Pending","2026-06-17","2026-06-20","2026-06-21","2026-06-26","Pending","Pending","","RESTOCK - CHỦ LỰC",500,"KAKI SD","NÂU"],["2026-05-06T01:54:13.903Z","0189/2026/PLMR-LC","2026-05-30","System Import","POLOMANOR","LC","",0,84240000,0,84240000,"6/2026","Pending","2026-06-17","2026-06-20","2026-06-21","2026-06-26","Pending","Pending","","RESTOCK - CHỦ LỰC",500,"QUẦN TÂY LƯNG CHUN","BE"],["2026-05-06T01:54:13.903Z","0196/2026/PLMR-AT","2026-06-09","System Import","POLOMANOR","AT","",0,71280000,0,71280000,"7/2026","Pending","2026-06-27","2026-06-30","2026-07-01","2026-07-06","Pending","Pending","","RESTOCK - CHỦ LỰC",600,"BASIC CLASSIC","XÁM NHẠT"],["2026-05-06T01:54:13.903Z","0198/2026/PLMR-AT","2026-06-19","System Import","POLOMANOR","AT","",0,71280000,0,71280000,"7/2026","Pending","2026-07-07","2026-07-10","2026-07-11","2026-07-16","Pending","Pending","","RESTOCK - CHỦ LỰC",600,"BASIC CLASSIC","NAVY KEM"],["2026-05-06T01:54:13.903Z","0200/2026/PLMR-AT","2026-06-27","System Import","POLOMANOR","AT","",0,77112000,0,77112000,"7/2026","Pending","2026-07-15","2026-07-18","2026-07-19","2026-07-24","Pending","Pending","","RESTOCK - CHỦ LỰC",600,"CLASSIC DIAMOND V2","BE NHẠT"],["2026-05-06T01:54:13.903Z","0201/2026/PLMR-TLN","2026-06-09","System Import","POLOMANOR","TLN","",0,169290000,0,169290000,"7/2026","Pending","2026-06-27","2026-06-30","2026-07-01","2026-07-06","Pending","Pending","","RESTOCK - CHỦ LỰC",1500,"BASIC SYMBOL","TRẮNG"],["2026-05-06T01:54:13.903Z","0202/2026/PLMR-TLN","2026-06-09","System Import","POLOMANOR","TLN","",0,90288000,0,90288000,"7/2026","Pending","2026-06-27","2026-06-30","2026-07-01","2026-07-06","Pending","Pending","","RESTOCK - CHỦ LỰC",800,"BASIC SYMBOL","ĐEN"],["2026-05-06T01:54:13.903Z","0203/2026/PLMR-TLN","2026-06-17","System Import","POLOMANOR","TLN","",0,90288000,0,90288000,"7/2026","Pending","2026-07-05","2026-07-08","2026-07-09","2026-07-14","Pending","Pending","","RESTOCK - CHỦ LỰC",800,"BASIC SYMBOL","NAVY"],["2026-05-06T01:54:13.903Z","0204/2026/PLMR-TLN","2026-06-20","System Import","POLOMANOR","TLN","",0,90288000,0,90288000,"7/2026","Pending","2026-07-08","2026-07-11","2026-07-12","2026-07-17","Pending","Pending","","RESTOCK - CHỦ LỰC",800,"BASIC SYMBOL","BE"],["2026-05-06T01:54:13.903Z","0205/2026/PLMR-TLN","2026-06-20","System Import","POLOMANOR","TLN","",0,67716000,0,67716000,"7/2026","Pending","2026-07-08","2026-07-11","2026-07-12","2026-07-17","Pending","Pending","","RESTOCK - CHỦ LỰC",600,"BASIC SYMBOL","BE NHẠT"],["2026-05-06T01:54:13.903Z","0207/2026/PLMR-TLN","2026-06-04","System Import","POLOMANOR","TLN","",0,90288000,0,90288000,"7/2026","Pending","2026-06-22","2026-06-25","2026-06-26","2026-07-01","Pending","Pending","","NEW IN - NEWIN",800,"BASIC SYMBOL","MINT"],["2026-05-06T01:54:13.903Z","0208/2026/PLMR-TLN","2026-06-04","System Import","POLOMANOR","TLN","",0,90288000,0,90288000,"7/2026","Pending","2026-06-22","2026-06-25","2026-06-26","2026-07-01","Pending","Pending","","NEW IN - NEWIN",800,"BASIC SYMBOL","OLIU"],["2026-05-06T01:54:13.903Z","0209/2026/PLMR-TLN","2026-06-04","System Import","POLOMANOR","TLN","",0,102124800,0,102124800,"7/2026","Pending","2026-06-22","2026-06-25","2026-06-26","2026-07-01","Pending","Pending","","NEW IN - NEWIN",800,"BASIC SYMBOL","DENIM"],["2026-05-06T01:54:13.903Z","0210/2026/PLMR-TLN","2026-06-17","System Import","POLOMANOR","TLN","",0,102124800,0,102124800,"7/2026","Pending","2026-07-05","2026-07-08","2026-07-09","2026-07-14","Pending","Pending","","RESTOCK - DUY TRÌ",800,"ADEN","TRẮNG"],["2026-05-06T01:54:13.903Z","0212/2026/PLMR-TLN","2026-06-07","System Import","POLOMANOR","TLN","",0,101260800,0,101260800,"7/2026","Pending","2026-06-25","2026-06-28","2026-06-29","2026-07-04","Pending","Pending","","RESTOCK - DUY TRÌ",800,"RUM","KEM NHẠT"],["2026-05-06T01:54:13.903Z","0214/2026/PLMR-TLN","2026-06-26","System Import","POLOMANOR","TLN","",0,77889600,0,77889600,"7/2026","Pending","2026-07-14","2026-07-17","2026-07-18","2026-07-23","Pending","Pending","","RESTOCK - DUY TRÌ",600,"KANE","NAVY"],["2026-05-06T01:54:13.903Z","0215/2026/PLMR-TLN","2026-06-26","System Import","POLOMANOR","TLN","",0,77241600,0,77241600,"7/2026","Pending","2026-07-14","2026-07-17","2026-07-18","2026-07-23","Pending","Pending","","RESTOCK - DUY TRÌ",600,"WADE","NAVY"],["2026-05-06T01:54:13.903Z","0216/2026/PLMR-TLN","2026-06-12","System Import","POLOMANOR","TLN","",0,101260800,0,101260800,"7/2026","Pending","2026-06-30","2026-07-03","2026-07-04","2026-07-09","Pending","Pending","","RESTOCK - DUY TRÌ",800,"WICK","BE ĐẬM"],["2026-05-06T01:54:13.903Z","0217/2026/PLMR-TLN","2026-06-07","System Import","POLOMANOR","TLN","",0,75945600,0,75945600,"7/2026","Pending","2026-06-25","2026-06-28","2026-06-29","2026-07-04","Pending","Pending","","NEW IN - NEWIN",600,"RUM PMK36","KHAKI"],["2026-05-06T01:54:13.903Z","0218/2026/PLMR-TLN","2026-06-07","System Import","POLOMANOR","TLN","",0,79768800,0,79768800,"7/2026","Pending","2026-06-25","2026-06-28","2026-06-29","2026-07-04","Pending","Pending","","NEW IN - NEWIN",600,"LEDO PMB87","KEM NHẠT"],["2026-05-06T01:54:13.903Z","0219/2026/PLMR-LC","2026-06-17","System Import","POLOMANOR","LC","",0,116640000,0,116640000,"7/2026","Pending","2026-07-05","2026-07-08","2026-07-09","2026-07-14","Pending","Pending","","RESTOCK - CHỦ LỰC",600,"JEAN STRAIGHT","ĐEN"],["2026-05-06T01:54:13.903Z","0220/2026/PLMR-LC","2026-06-17","System Import","POLOMANOR","LC","",0,116640000,0,116640000,"7/2026","Pending","2026-07-05","2026-07-08","2026-07-09","2026-07-14","Pending","Pending","","RESTOCK - CHỦ LỰC",600,"JEAN STRAIGHT","XANH ĐẬM"],["2026-05-06T01:54:13.903Z","0221/2026/PLMR-LC","2026-06-06","System Import","POLOMANOR","LC","",0,116640000,0,116640000,"7/2026","Pending","2026-06-24","2026-06-27","2026-06-28","2026-07-03","Pending","Pending","","RESTOCK - CHỦ LỰC",600,"JEAN STRAIGHT","XANH NHẠT"],["2026-05-06T01:54:13.903Z","0222/2026/PLMR-LC","2026-06-06","System Import","POLOMANOR","LC","",0,155520000,0,155520000,"7/2026","Pending","2026-06-24","2026-06-27","2026-06-28","2026-07-03","Pending","Pending","","NEW IN - NEWIN",800,"JEAN STRAIGHT","INDIGO"],["2026-05-06T01:54:13.903Z","0223/2026/PLMR-LC","2026-06-19","System Import","POLOMANOR","LC","",0,98496000,0,98496000,"7/2026","Pending","2026-07-07","2026-07-10","2026-07-11","2026-07-16","Pending","Pending","","RESTOCK - CHỦ LỰC",800,"SHORT KAKI","ĐEN"],["2026-05-06T01:54:13.903Z","0224/2026/PLMR-LC","2026-06-19","System Import","POLOMANOR","LC","",0,73872000,0,73872000,"7/2026","Pending","2026-07-07","2026-07-10","2026-07-11","2026-07-16","Pending","Pending","","RESTOCK - CHỦ LỰC",600,"SHORT KAKI","BE ĐẬM"],["2026-05-06T01:54:13.903Z","0226/2026/PLMR-LC","2026-06-24","System Import","POLOMANOR","LC","",0,68040000,0,68040000,"7/2026","Pending","2026-07-12","2026-07-15","2026-07-16","2026-07-21","Pending","Pending","","RESTOCK - CHỦ LỰC",500,"KAKI SD","ĐEN"],["2026-05-06T01:54:13.903Z","0227/2026/PLMR-LC","2026-06-24","System Import","POLOMANOR","LC","",0,68040000,0,68040000,"7/2026","Pending","2026-07-12","2026-07-15","2026-07-16","2026-07-21","Pending","Pending","","RESTOCK - CHỦ LỰC",500,"KAKI SD","BE"],["2026-05-06T01:54:13.903Z","0229/2026/PLMR-TLN","2026-05-23","System Import","POLOMANOR","TLN","",0,99619200,0,99619200,"6/2026","Pending","2026-06-10","2026-06-13","2026-06-14","2026-06-19","Pending","Pending","","RESTOCK - DUY TRÌ",800,"TRAVIS","NAVY"],["2026-05-06T01:54:13.903Z","0230/2026/PLMR-GLX","2026-06-30","System Import","POLOMANOR","GLX","",0,120096000,0,120096000,"7/2026","Pending","2026-07-18","2026-07-21","2026-07-22","2026-07-27","Pending","Pending","","RESTOCK - DUY TRÌ",800,"Sơ mi OXFORD PREMIUM","TRẮNG 02"],["2026-05-06T01:54:13.903Z","0231/2026/PLMR-GLX","2026-06-30","System Import","POLOMANOR","GLX","",0,127872000,0,127872000,"7/2026","Pending","2026-07-18","2026-07-21","2026-07-22","2026-07-27","Pending","Pending","","RESTOCK - DUY TRÌ",800,"Sơ mi OXFORD PREMIUM","NAVY 35"],["2026-05-06T01:54:13.903Z","0232/2026/PLMR-GLX","2026-06-30","System Import","POLOMANOR","GLX","",0,90072000,0,90072000,"7/2026","Pending","2026-07-18","2026-07-21","2026-07-22","2026-07-27","Pending","Pending","","RESTOCK - DUY TRÌ",600,"Sơ mi OXFORD PREMIUM","XANH NHẠT 07"],["2026-05-06T01:54:13.903Z","0233/2026/PLMR-GLX","2026-06-30","System Import","POLOMANOR","GLX","",0,90072000,0,90072000,"7/2026","Pending","2026-07-18","2026-07-21","2026-07-22","2026-07-27","Pending","Pending","","RESTOCK - DUY TRÌ",600,"Sơ mi OXFORD PREMIUM","BE"],["2026-05-06T01:54:13.903Z","0234/2026/PLMR-GLX","2026-06-30","System Import","POLOMANOR","GLX","",0,95904000,0,95904000,"7/2026","Pending","2026-07-18","2026-07-21","2026-07-22","2026-07-27","Pending","Pending","","RESTOCK - DUY TRÌ",600,"Sơ mi OXFORD PREMIUM","ĐEN"],["2026-05-06T01:54:13.903Z","0235/2026/PLMR-GLX","2026-06-05","System Import","POLOMANOR","GLX","",0,80028000,0,80028000,"7/2026","Pending","2026-06-23","2026-06-26","2026-06-27","2026-07-02","Pending","Pending","","NEW IN - NEWIN",600,"Sơ mi TAY NGẮN  POPLIN","ĐEN"],["2026-05-06T01:54:13.903Z","0236/2026/PLMR-GLX","2026-06-05","System Import","POLOMANOR","GLX","",0,80028000,0,80028000,"7/2026","Pending","2026-06-23","2026-06-26","2026-06-27","2026-07-02","Pending","Pending","","NEW IN - NEWIN",600,"Sơ mi TAY NGẮN  POPLIN","CAFE"],["2026-05-06T01:54:13.903Z","0237/2026/PLMR-TLN","2026-05-27","System Import","POLOMANOR","TLN","",0,108000000,0,108000000,"6/2026","Pending","2026-06-14","2026-06-17","2026-06-18","2026-06-23","Pending","Pending","","RESTOCK - DUY TRÌ",800,"MAVEN","NAVY"],["2026-05-06T01:54:13.903Z","0238/2026/PLMR-TLN","2026-06-12","System Import","POLOMANOR","TLN","",0,108000000,0,108000000,"7/2026","Pending","2026-06-30","2026-07-03","2026-07-04","2026-07-09","Pending","Pending","","RESTOCK - DUY TRÌ",800,"IRISH PMD35","KEM"],["2026-05-06T01:54:13.903Z","0239/2026/PLMR-AT","2026-04-10","System Import","POLOMANOR","AT","",0,34830000,0,34830000,"5/2026","Pending","2026-04-28","2026-05-01","2026-05-02","2026-05-07","Pending","Pending","","RESTOCK - DUY TRÌ",250,"IRISH PMD35","KEM"],["2026-05-06T01:54:13.903Z","0240/2026/PLMR-AT","2026-05-23","System Import","POLOMANOR","AT","",0,94500000,0,94500000,"6/2026","Pending","2026-06-10","2026-06-13","2026-06-14","2026-06-19","Pending","Pending","","RESTOCK - CHỦ LỰC",700,"ZYBER","ĐEN"],["2026-05-06T01:54:13.903Z","0241/2026/PLMR-HN KNIT","2026-03-15","System Import","POLOMANOR","HN KNIT","",0,22000000,0,22000000,"4/2026","Pending","2026-04-02","2026-04-05","2026-04-06","2026-04-11","Pending","Pending","","Hoàn thành",2000,"VỚ LOGO","TRẮNG"],["2026-05-06T01:54:13.903Z","0242/2026/PLMR-HN KNIT","2026-03-15","System Import","POLOMANOR","HN KNIT","",0,22000000,0,22000000,"4/2026","Pending","2026-04-02","2026-04-05","2026-04-06","2026-04-11","Pending","Pending","","Hoàn thành",2000,"VỚ LOGO","ĐEN"],["2026-05-06T01:54:13.903Z","0245/2026/PLMR-HN KNIT","2026-06-02","System Import","POLOMANOR","HN KNIT","",0,22000000,0,22000000,"6/2026","Pending","2026-06-20","2026-06-23","2026-06-24","2026-06-29","Pending","Pending","","RESTOCK - PHỄU",2000,"VỚ LOGO","TRẮNG"],["2026-05-06T01:54:13.903Z","0246/2026/PLMR-HN KNIT","2026-06-02","System Import","POLOMANOR","HN KNIT","",0,22000000,0,22000000,"6/2026","Pending","2026-06-20","2026-06-23","2026-06-24","2026-06-29","Pending","Pending","","RESTOCK - PHỄU",2000,"VỚ LOGO","ĐEN"],["2026-05-06T01:54:13.904Z","0249/2026/PLMR-TLN","2026-02-28","System Import","POLOMANOR","TLN","",0,62073000,0,62073000,"3/2026","Pending","2026-03-18","2026-03-21","2026-03-22","2026-03-27","Pending","Pending","","Hoàn thành",550,"BASIC SYMBOL","TRẮNG"],["2026-05-06T01:54:13.904Z","0250/2026/PLMR-TLN","2026-04-07","System Import","POLOMANOR","TLN","",0,34992000,0,34992000,"5/2026","Pending","2026-04-25","2026-04-28","2026-04-29","2026-05-04","Pending","Pending","","NEW IN - PHỄU",2000,"TÚI GIẶT","TRẮNG"],["2026-05-06T01:54:13.904Z","0251/2026/PLMR-TLN","2026-05-08","System Import","POLOMANOR","TLN","",0,34992000,0,34992000,"6/2026","Pending","2026-05-26","2026-05-29","2026-05-30","2026-06-04","Pending","Pending","","RESTOCK - PHỄU",2000,"TÚI GIẶT","TRẮNG"],["2026-05-06T01:54:13.904Z","0252/2026/PLMR-TLN","2026-06-11","System Import","POLOMANOR","TLN","",0,34992000,0,34992000,"7/2026","Pending","2026-06-29","2026-07-02","2026-07-03","2026-07-08","Pending","Pending","","RESTOCK - PHỄU",2000,"TÚI GIẶT","TRẮNG"],["2026-05-06T01:54:13.904Z","0253/2026/PLMR-TLN","","System Import","POLOMANOR","TLN","",0,90288000,0,90288000,"8/2026","Pending","","","","","Pending","Pending","","RESTOCK - CHỦ LỰC",800,"BASIC SYMBOL","XANH LÁ"],["2026-05-06T01:54:13.904Z","0260/2026/PLMR-TLN","2026-06-05","System Import","POLOMANOR","TLN","",0,85406400,0,85406400,"7/2026","Pending","2026-06-23","2026-06-26","2026-06-27","2026-07-02","Pending","Pending","","NEW IN - DUY TRÌ",600,"RICHIE","TRẮNG KEM"],["2026-05-06T01:54:13.904Z","0261/2026/PLMR-TLN","2026-06-05","System Import","POLOMANOR","TLN","",0,85406400,0,85406400,"7/2026","Pending","2026-06-23","2026-06-26","2026-06-27","2026-07-02","Pending","Pending","","NEW IN - DUY TRÌ",600,"RICHIE","TRẮNG KEM"],["2026-05-06T01:54:13.904Z","0262/2026/PLMR-KP","2026-05-07","System Import","POLOMANOR","KP","",0,69120000,0,69120000,"6/2026","Pending","2026-05-25","2026-05-28","2026-05-29","2026-06-03","Pending","Pending","","RESTOCK - DUY TRÌ",800,"TSHIRT BASIC US","TRẮNG"],["2026-05-06T01:54:13.904Z","0270/2026/PLMR-VH","2026-05-09","System Import","POLOMANOR","VH","",0,24000000,0,24000000,"6/2026","Pending","2026-05-27","2026-05-30","2026-05-31","2026-06-05","Pending","Pending","","NEW IN - DUY TRÌ",1000,"TANKTOP BASIC","TRẮNG"],["2026-05-06T01:54:13.904Z","0271/2026/PLMR-VH","2026-05-09","System Import","POLOMANOR","VH","",0,24000000,0,24000000,"6/2026","Pending","2026-05-27","2026-05-30","2026-05-31","2026-06-05","Pending","Pending","","NEW IN - DUY TRÌ",1000,"TANKTOP BASIC","ĐEN"],["2026-05-06T01:54:13.904Z","0272/2026/PLMR-VH","","System Import","POLOMANOR","VH","",0,24000000,0,24000000,"7/2026","Pending","","","","","Pending","Pending","","RESTOCK - DUY TRÌ",1000,"TANKTOP BASIC","TRẮNG"],["2026-05-06T01:54:13.904Z","0273/2026/PLMR-VH","","System Import","POLOMANOR","VH","",0,24000000,0,24000000,"7/2026","Pending","","","","","Pending","Pending","","RESTOCK - DUY TRÌ",1000,"TANKTOP BASIC","ĐEN"],["2026-05-06T01:54:13.904Z","0274/2026/PLMR-VH","","System Import","POLOMANOR","VH","",0,24000000,0,24000000,"8/2026","Pending","","","","","Pending","Pending","","RESTOCK - DUY TRÌ",1000,"TANKTOP BASIC","TRẮNG"],["2026-05-06T01:54:13.904Z","0275/2026/PLMR-VH","","System Import","POLOMANOR","VH","",0,24000000,0,24000000,"8/2026","Pending","","","","","Pending","Pending","","RESTOCK - DUY TRÌ",1000,"TANKTOP BASIC","ĐEN"],["2026-05-06T01:54:13.904Z","0276/2026/PLMR-VH","","System Import","POLOMANOR","VH","",0,24000000,0,24000000,"9/2026","Pending","","","","","Pending","Pending","","RESTOCK - DUY TRÌ",1000,"TANKTOP BASIC","TRẮNG"],["2026-05-06T01:54:13.904Z","0277/2026/PLMR-VH","","System Import","POLOMANOR","VH","",0,24000000,0,24000000,"9/2026","Pending","","","","","Pending","Pending","","RESTOCK - DUY TRÌ",1000,"TANKTOP BASIC","ĐEN"]];
  var noc=24;
  o=o.map(function(r){var row=r.slice(0,noc);while(row.length<noc)row.push("");return row;});

  // Convert date columns to Date objects
  o.forEach(function(row) {
    row[2] = toDate(row[2]);   // Ngày đặt hàng
    row[13] = toDate(row[13]); // Hạn Duyệt
    row[14] = toDate(row[14]); // Hạn Cắt Vải
    row[15] = toDate(row[15]); // Hạn Lên Chuyền
    row[16] = toDate(row[16]); // Hạn Hoàn Thành
  });
  if(o.length>0)orderSheet.getRange(olr+1,1,o.length,noc).setValues(o);
  if(o.length>0) {
    orderSheet.getRange(olr+1,3,o.length,1).setNumberFormat("dd/mm/yyyy");
    orderSheet.getRange(olr+1,14,o.length,4).setNumberFormat("dd/mm/yyyy");
  }
  SpreadsheetApp.getUi().alert("Import hoan tat! Tong: 171 don hang.");
}
