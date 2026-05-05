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
         try { deliveryDateStr = new Date(it.deliveryDate).toLocaleDateString('vi-VN'); } catch(e) {}
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




