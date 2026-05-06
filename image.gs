/**
 * image.gs — Đổ hình ảnh sản phẩm từ Google Drive vào Sheet
 * 
 * CÁCH DÙNG:
 *   Bước 1: Chạy scanImages()    → quét folder, lưu vào sheet data_images
 *   Bước 2: Chạy embedImages()   → nhúng ảnh trực tiếp vào data_order_details
 *           (nếu timeout thì chạy lại, nó sẽ bỏ qua ảnh đã nhúng)
 */

const IMAGE_FOLDER_ID = "1kTunkTKY_YekEiTWEmB52SZWN6qxSaIN";

/**
 * BƯỚC 1: Quét folder gốc + folder con, lưu File ID vào sheet data_images.
 */
function scanImages() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const rootFolder = DriveApp.getFolderById(IMAGE_FOLDER_ID);
  const allImages = [];
  
  // Quét folder gốc
  const rootFiles = rootFolder.getFiles();
  while (rootFiles.hasNext()) {
    const file = rootFiles.next();
    if (!file.getMimeType().startsWith("image/")) continue;
    allImages.push([file.getName(), file.getName().replace(/\.[^/.]+$/, "").trim(), "", file.getId()]);
  }
  
  // Quét folder con cấp 1
  const subFolders = rootFolder.getFolders();
  while (subFolders.hasNext()) {
    const sub = subFolders.next();
    const subName = sub.getName();
    const subFiles = sub.getFiles();
    let c = 0;
    while (subFiles.hasNext()) {
      const file = subFiles.next();
      if (!file.getMimeType().startsWith("image/")) continue;
      c++;
      allImages.push([file.getName(), file.getName().replace(/\.[^/.]+$/, "").trim(), subName, file.getId()]);
      if (c >= 3) break;
    }
    // Cấp 2
    const gFolders = sub.getFolders();
    while (gFolders.hasNext()) {
      const g = gFolders.next();
      const gFiles = g.getFiles();
      let gc = 0;
      while (gFiles.hasNext()) {
        const file = gFiles.next();
        if (!file.getMimeType().startsWith("image/")) continue;
        gc++;
        allImages.push([file.getName(), file.getName().replace(/\.[^/.]+$/, "").trim(), subName + "/" + g.getName(), file.getId()]);
        if (gc >= 2) break;
      }
    }
  }
  
  let imgSheet = ss.getSheetByName("data_images");
  if (!imgSheet) imgSheet = ss.insertSheet("data_images");
  imgSheet.clearContents();
  
  const h = ["Tên file", "Key", "Folder", "File ID"];
  imgSheet.getRange(1, 1, 1, h.length).setValues([h]);
  imgSheet.getRange(1, 1, 1, h.length).setFontWeight("bold").setBackground("#fce5cd");
  imgSheet.setFrozenRows(1);
  
  if (allImages.length > 0) {
    imgSheet.getRange(2, 1, allImages.length, h.length).setValues(allImages);
  }
  
  SpreadsheetApp.getUi().alert("✅ Scan xong! " + allImages.length + " ảnh.\n\n👉 Tiếp: chạy embedImages()");
}

/**
 * BƯỚC 2: Nhúng ảnh trực tiếp vào cell (không cần share folder).
 * Đọc blob → base64 → CellImage.
 * Nếu timeout, chạy lại — sẽ bỏ qua ảnh đã nhúng.
 */
function embedImages() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Đọc data_images
  const imgSheet = ss.getSheetByName("data_images");
  if (!imgSheet) { SpreadsheetApp.getUi().alert("Chạy scanImages() trước!"); return; }
  const imgData = imgSheet.getDataRange().getValues();
  
  // Build lookup: key → fileId
  const imageMap = {};
  for (let i = 1; i < imgData.length; i++) {
    const baseName = String(imgData[i][1]).trim().toUpperCase();
    const folderName = String(imgData[i][2]).trim().toUpperCase();
    const fileId = String(imgData[i][3]).trim();
    if (!fileId) continue;
    
    if (baseName && !imageMap[baseName]) imageMap[baseName] = fileId;
    if (folderName && !imageMap[folderName]) imageMap[folderName] = fileId;
    if (folderName.includes("/")) {
      folderName.split("/").forEach(p => {
        const k = p.trim();
        if (k && !imageMap[k]) imageMap[k] = fileId;
      });
    }
  }
  
  // Đọc data_order_details
  const detailSheet = ss.getSheetByName("data_order_details");
  if (!detailSheet) { SpreadsheetApp.getUi().alert("Không tìm thấy data_order_details!"); return; }
  
  const detailData = detailSheet.getDataRange().getValues();
  const headers = detailData[0];
  
  // Tìm/thêm cột "Hình ảnh"
  let imgColIdx = headers.indexOf("Hình ảnh");
  if (imgColIdx === -1) {
    imgColIdx = headers.length;
    detailSheet.getRange(1, imgColIdx + 1).setValue("Hình ảnh");
    detailSheet.getRange(1, imgColIdx + 1).setFontWeight("bold").setBackground("#fff2cc");
  }
  
  // Cache: tránh đọc blob cùng 1 file nhiều lần
  const blobCache = {};
  let matchCount = 0;
  let skipCount = 0;
  const startTime = new Date().getTime();
  
  for (let i = 1; i < detailData.length; i++) {
    // Kiểm tra timeout (dừng trước 5 phút)
    if (new Date().getTime() - startTime > 270000) {
      SpreadsheetApp.getUi().alert(
        "⏱️ Tạm dừng để tránh timeout!\n\n" +
        "Đã nhúng: " + matchCount + " ảnh\n" +
        "👉 Chạy lại embedImages() để tiếp tục."
      );
      return;
    }
    
    // Bỏ qua nếu đã có ảnh
    const existing = detailSheet.getRange(i + 1, imgColIdx + 1).getValue();
    if (existing && String(existing).length > 0) { skipCount++; continue; }
    
    const tenSP = String(detailData[i][1] || "").trim().toUpperCase();
    const artCode = String(detailData[i][2] || "").trim().toUpperCase();
    const mau = String(detailData[i][3] || "").trim().toUpperCase();
    
    // Tìm fileId match
    let fileId = null;
    if (artCode && imageMap[artCode]) fileId = imageMap[artCode];
    if (!fileId && tenSP && imageMap[tenSP]) fileId = imageMap[tenSP];
    if (!fileId && artCode && mau && imageMap[artCode + "_" + mau]) fileId = imageMap[artCode + "_" + mau];
    if (!fileId && artCode && mau && imageMap[artCode + " " + mau]) fileId = imageMap[artCode + " " + mau];
    if (!fileId && tenSP && mau && imageMap[tenSP + "_" + mau]) fileId = imageMap[tenSP + "_" + mau];
    
    // Partial match
    if (!fileId && artCode) {
      for (const key in imageMap) {
        if (key.includes(artCode) || artCode.includes(key)) { fileId = imageMap[key]; break; }
      }
    }
    if (!fileId && tenSP) {
      for (const key in imageMap) {
        if (key.includes(tenSP) || tenSP.includes(key)) { fileId = imageMap[key]; break; }
      }
    }
    
    if (!fileId) continue;
    
    try {
      // Dùng cache nếu đã đọc blob trước đó
      let cellImage;
      if (blobCache[fileId]) {
        cellImage = blobCache[fileId];
      } else {
        const blob = DriveApp.getFileById(fileId).getBlob();
        const base64 = Utilities.base64Encode(blob.getBytes());
        const dataUrl = "data:" + blob.getContentType() + ";base64," + base64;
        cellImage = SpreadsheetApp.newCellImage()
          .setSourceUrl(dataUrl)
          .setAltTextTitle(tenSP + " - " + mau)
          .build();
        blobCache[fileId] = cellImage;
      }
      
      detailSheet.getRange(i + 1, imgColIdx + 1).setValue(cellImage);
      matchCount++;
    } catch(e) {
      Logger.log("Lỗi embed ảnh dòng " + (i+1) + ": " + e);
    }
  }
  
  SpreadsheetApp.getUi().alert(
    "✅ Nhúng ảnh xong!\n\n" +
    "🖼️ Đã nhúng: " + matchCount + " ảnh\n" +
    "⏩ Đã bỏ qua: " + skipCount + " (đã có ảnh)\n" +
    "📋 Cột 'Hình ảnh' đã cập nhật."
  );
}

/**
 * Debug: Xem danh sách folder con
 */
function listSubFolders() {
  const folder = DriveApp.getFolderById(IMAGE_FOLDER_ID);
  const subs = folder.getFolders();
  let count = 0;
  while (subs.hasNext()) {
    count++;
    Logger.log(count + ". " + subs.next().getName());
  }
  Logger.log("Tổng: " + count + " folder con");
}
