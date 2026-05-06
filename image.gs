/**
 * image.gs — Đổ hình ảnh sản phẩm từ Google Drive vào Sheet
 * Drive Folder: https://drive.google.com/drive/u/0/folders/1nGoPHciSLOJuBqSPCvPX1E6WW6X5vzDI
 * 
 * CÁCH DÙNG:
 *   Bước 1: Chạy scanImages()   → quét folder, lưu vào sheet data_images
 *   Bước 2: Chạy matchImages()  → match ảnh vào data_order_details
 */

const IMAGE_FOLDER_ID = "1nGoPHciSLOJuBqSPCvPX1E6WW6X5vzDI";

/**
 * BƯỚC 1: Chỉ quét folder Drive (cấp 1 + cấp 2) và lưu vào sheet data_images.
 * Lấy ảnh đầu tiên của mỗi folder con làm đại diện.
 */
function scanImages() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const rootFolder = DriveApp.getFolderById(IMAGE_FOLDER_ID);
  const allImages = [];
  
  // Quét ảnh ở folder gốc
  const rootFiles = rootFolder.getFiles();
  while (rootFiles.hasNext()) {
    const file = rootFiles.next();
    if (!file.getMimeType().startsWith("image/")) continue;
    allImages.push({
      fileName: file.getName(),
      baseName: file.getName().replace(/\.[^/.]+$/, "").trim(),
      folderName: "",
      fileId: file.getId()
    });
  }
  
  // Quét folder con cấp 1: lấy ảnh đầu tiên làm đại diện
  const subFolders = rootFolder.getFolders();
  while (subFolders.hasNext()) {
    const sub = subFolders.next();
    const subName = sub.getName();
    const subFiles = sub.getFiles();
    let count = 0;
    
    while (subFiles.hasNext()) {
      const file = subFiles.next();
      if (!file.getMimeType().startsWith("image/")) continue;
      count++;
      allImages.push({
        fileName: file.getName(),
        baseName: file.getName().replace(/\.[^/.]+$/, "").trim(),
        folderName: subName,
        fileId: file.getId()
      });
      // Giới hạn 5 ảnh mỗi folder con để tránh timeout
      if (count >= 5) break;
    }
    
    // Quét folder cháu (cấp 2) nếu có
    const grandFolders = sub.getFolders();
    while (grandFolders.hasNext()) {
      const grand = grandFolders.next();
      const grandName = grand.getName();
      const grandFiles = grand.getFiles();
      let gCount = 0;
      
      while (grandFiles.hasNext()) {
        const file = grandFiles.next();
        if (!file.getMimeType().startsWith("image/")) continue;
        gCount++;
        allImages.push({
          fileName: file.getName(),
          baseName: file.getName().replace(/\.[^/.]+$/, "").trim(),
          folderName: subName + "/" + grandName,
          fileId: file.getId()
        });
        if (gCount >= 3) break;
      }
    }
  }
  
  // Lưu vào sheet
  let imgSheet = ss.getSheetByName("data_images");
  if (!imgSheet) imgSheet = ss.insertSheet("data_images");
  imgSheet.clearContents();
  
  const h = ["Tên file", "Key", "Folder", "File ID", "URL Thumbnail"];
  imgSheet.getRange(1, 1, 1, h.length).setValues([h]);
  imgSheet.getRange(1, 1, 1, h.length).setFontWeight("bold").setBackground("#fce5cd");
  imgSheet.setFrozenRows(1);
  
  if (allImages.length > 0) {
    const rows = allImages.map(img => [
      img.fileName,
      img.baseName,
      img.folderName,
      img.fileId,
      "https://drive.google.com/thumbnail?id=" + img.fileId + "&sz=w200"
    ]);
    imgSheet.getRange(2, 1, rows.length, h.length).setValues(rows);
  }
  
  SpreadsheetApp.getUi().alert("Scan xong! Tìm thấy " + allImages.length + " ảnh.");
}

/**
 * BƯỚC 2: Match ảnh từ data_images vào data_order_details.
 * Đọc sheet data_images (đã tạo ở bước 1) và gán URL vào cột "Hình ảnh".
 */
function matchImages() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Đọc data_images
  const imgSheet = ss.getSheetByName("data_images");
  if (!imgSheet) {
    SpreadsheetApp.getUi().alert("Chưa có data_images. Hãy chạy scanImages() trước!");
    return;
  }
  const imgData = imgSheet.getDataRange().getValues();
  
  // Build lookup: key -> thumbUrl (theo tên file, folder name)
  const imageMap = {};
  for (let i = 1; i < imgData.length; i++) {
    const baseName = String(imgData[i][1]).trim().toUpperCase();
    const folderName = String(imgData[i][2]).trim().toUpperCase();
    const thumbUrl = imgData[i][4];
    
    if (baseName && !imageMap[baseName]) imageMap[baseName] = thumbUrl;
    if (folderName && !imageMap[folderName]) imageMap[folderName] = thumbUrl;
    
    // Cũng map theo phần folder cuối (sau dấu /)
    if (folderName.includes("/")) {
      const parts = folderName.split("/");
      parts.forEach(p => {
        const k = p.trim();
        if (k && !imageMap[k]) imageMap[k] = thumbUrl;
      });
    }
  }
  
  // Đọc data_order_details
  const detailSheet = ss.getSheetByName("data_order_details");
  if (!detailSheet) {
    SpreadsheetApp.getUi().alert("Không tìm thấy data_order_details!");
    return;
  }
  
  const detailData = detailSheet.getDataRange().getValues();
  const headers = detailData[0];
  
  // Tìm hoặc thêm cột "Hình ảnh"
  let imgColIdx = headers.indexOf("Hình ảnh");
  if (imgColIdx === -1) {
    imgColIdx = headers.length;
    detailSheet.getRange(1, imgColIdx + 1).setValue("Hình ảnh");
    detailSheet.getRange(1, imgColIdx + 1).setFontWeight("bold").setBackground("#fff2cc");
  }
  
  // Match
  let matchCount = 0;
  const updates = [];
  
  for (let i = 1; i < detailData.length; i++) {
    const tenSP = String(detailData[i][1] || "").trim().toUpperCase();
    const artCode = String(detailData[i][2] || "").trim().toUpperCase();
    const mau = String(detailData[i][3] || "").trim().toUpperCase();
    
    let url = null;
    
    // Thử match theo thứ tự ưu tiên
    if (artCode && imageMap[artCode]) url = imageMap[artCode];
    if (!url && tenSP && imageMap[tenSP]) url = imageMap[tenSP];
    if (!url && artCode && mau && imageMap[artCode + "_" + mau]) url = imageMap[artCode + "_" + mau];
    if (!url && artCode && mau && imageMap[artCode + " " + mau]) url = imageMap[artCode + " " + mau];
    if (!url && tenSP && mau && imageMap[tenSP + "_" + mau]) url = imageMap[tenSP + "_" + mau];
    if (!url && tenSP && mau && imageMap[tenSP + " " + mau]) url = imageMap[tenSP + " " + mau];
    
    // Partial match
    if (!url && artCode) {
      for (const key in imageMap) {
        if (key.includes(artCode) || artCode.includes(key)) {
          url = imageMap[key];
          break;
        }
      }
    }
    if (!url && tenSP) {
      for (const key in imageMap) {
        if (key.includes(tenSP) || tenSP.includes(key)) {
          url = imageMap[key];
          break;
        }
      }
    }
    
    updates.push([url || ""]);
    if (url) matchCount++;
  }
  
  // Ghi tất cả một lần (nhanh hơn ghi từng dòng)
  if (updates.length > 0) {
    detailSheet.getRange(2, imgColIdx + 1, updates.length, 1).setValues(updates);
  }
  
  SpreadsheetApp.getUi().alert(
    "✅ Match xong!\n\n" +
    "🔗 Đã match: " + matchCount + "/" + (detailData.length - 1) + " sản phẩm\n" +
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
    const sub = subs.next();
    count++;
    Logger.log(count + ". " + sub.getName());
  }
  Logger.log("Tổng: " + count + " folder con");
}
