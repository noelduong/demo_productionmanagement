/**
 * image.gs — Đổ hình ảnh sản phẩm từ Google Drive vào Sheet
 * 
 * CÁCH DÙNG:
 *   Bước 1: Chạy scanImages()     → quét folder gốc, lưu vào sheet data_images
 *   Bước 2: Chạy copyAndShare()   → copy ảnh sang folder riêng + share public
 *   Bước 3: Chạy matchImages()    → match ảnh vào data_order_details (dùng =IMAGE())
 */

// Folder gốc (chỉ có quyền xem)
const IMAGE_FOLDER_ID = "1kTunkTKY_YekEiTWEmB52SZWN6qxSaIN";
// Folder riêng sẽ được tạo tự động trong Drive của bạn
const MY_FOLDER_NAME = "PLMR_Product_Images";

/**
 * BƯỚC 1: Quét folder gốc (cấp 1 + cấp 2), lưu File ID vào sheet data_images.
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
    allImages.push([
      file.getName(),
      file.getName().replace(/\.[^/.]+$/, "").trim(),
      "",
      file.getId(),
      ""
    ]);
  }
  
  // Quét folder con cấp 1
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
      allImages.push([
        file.getName(),
        file.getName().replace(/\.[^/.]+$/, "").trim(),
        subName,
        file.getId(),
        ""
      ]);
      if (count >= 5) break;
    }
    
    // Folder cháu (cấp 2)
    const grandFolders = sub.getFolders();
    while (grandFolders.hasNext()) {
      const grand = grandFolders.next();
      const grandFiles = grand.getFiles();
      let gCount = 0;
      while (grandFiles.hasNext()) {
        const file = grandFiles.next();
        if (!file.getMimeType().startsWith("image/")) continue;
        gCount++;
        allImages.push([
          file.getName(),
          file.getName().replace(/\.[^/.]+$/, "").trim(),
          subName + "/" + grand.getName(),
          file.getId(),
          ""
        ]);
        if (gCount >= 3) break;
      }
    }
  }
  
  // Lưu vào sheet
  let imgSheet = ss.getSheetByName("data_images");
  if (!imgSheet) imgSheet = ss.insertSheet("data_images");
  imgSheet.clearContents();
  
  const h = ["Tên file", "Key", "Folder", "Source File ID", "Public URL"];
  imgSheet.getRange(1, 1, 1, h.length).setValues([h]);
  imgSheet.getRange(1, 1, 1, h.length).setFontWeight("bold").setBackground("#fce5cd");
  imgSheet.setFrozenRows(1);
  
  if (allImages.length > 0) {
    imgSheet.getRange(2, 1, allImages.length, h.length).setValues(allImages);
  }
  
  SpreadsheetApp.getUi().alert(
    "✅ Scan xong! Tìm thấy " + allImages.length + " ảnh.\n\n" +
    "👉 Bước tiếp: chạy copyAndShare() để copy ảnh sang folder riêng."
  );
}

/**
 * BƯỚC 2: Copy ảnh từ folder gốc sang folder riêng của bạn, share public.
 * Tự động tạo folder MY_FOLDER_NAME trong Drive root.
 */
function copyAndShare() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const imgSheet = ss.getSheetByName("data_images");
  if (!imgSheet) {
    SpreadsheetApp.getUi().alert("Chưa có data_images. Chạy scanImages() trước!");
    return;
  }
  
  // Tạo hoặc tìm folder riêng
  let myFolder;
  const existingFolders = DriveApp.getFoldersByName(MY_FOLDER_NAME);
  if (existingFolders.hasNext()) {
    myFolder = existingFolders.next();
  } else {
    myFolder = DriveApp.createFolder(MY_FOLDER_NAME);
  }
  
  // Share folder public
  myFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  const data = imgSheet.getDataRange().getValues();
  let copied = 0;
  let skipped = 0;
  
  for (let i = 1; i < data.length; i++) {
    const sourceId = data[i][3];
    const existingUrl = String(data[i][4] || "").trim();
    
    // Bỏ qua nếu đã copy rồi
    if (existingUrl) { skipped++; continue; }
    if (!sourceId) continue;
    
    try {
      const sourceFile = DriveApp.getFileById(sourceId);
      const copy = sourceFile.makeCopy(sourceFile.getName(), myFolder);
      copy.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      const publicUrl = "https://lh3.googleusercontent.com/d/" + copy.getId();
      imgSheet.getRange(i + 1, 5).setValue(publicUrl);
      copied++;
    } catch(e) {
      Logger.log("Lỗi copy file " + sourceId + ": " + e);
    }
  }
  
  SpreadsheetApp.getUi().alert(
    "✅ Copy xong!\n\n" +
    "📁 Folder: " + MY_FOLDER_NAME + "\n" +
    "📋 Đã copy: " + copied + " | Bỏ qua: " + skipped + "\n\n" +
    "👉 Bước tiếp: chạy matchImages() để gán ảnh vào sản phẩm."
  );
}

/**
 * BƯỚC 3: Match ảnh từ data_images vào data_order_details.
 * Dùng Public URL (cột 5) đã tạo ở bước 2.
 */
function matchImages() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  const imgSheet = ss.getSheetByName("data_images");
  if (!imgSheet) {
    SpreadsheetApp.getUi().alert("Chưa có data_images. Chạy scanImages() trước!");
    return;
  }
  const imgData = imgSheet.getDataRange().getValues();
  
  // Build lookup
  const imageMap = {};
  for (let i = 1; i < imgData.length; i++) {
    const baseName = String(imgData[i][1]).trim().toUpperCase();
    const folderName = String(imgData[i][2]).trim().toUpperCase();
    const publicUrl = String(imgData[i][4] || "").trim();
    
    if (!publicUrl) continue; // Chưa copy → bỏ qua
    
    if (baseName && !imageMap[baseName]) imageMap[baseName] = publicUrl;
    if (folderName && !imageMap[folderName]) imageMap[folderName] = publicUrl;
    
    if (folderName.includes("/")) {
      folderName.split("/").forEach(p => {
        const k = p.trim();
        if (k && !imageMap[k]) imageMap[k] = publicUrl;
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
  
  let imgColIdx = headers.indexOf("Hình ảnh");
  if (imgColIdx === -1) {
    imgColIdx = headers.length;
    detailSheet.getRange(1, imgColIdx + 1).setValue("Hình ảnh");
    detailSheet.getRange(1, imgColIdx + 1).setFontWeight("bold").setBackground("#fff2cc");
  }
  
  let matchCount = 0;
  
  for (let i = 1; i < detailData.length; i++) {
    const tenSP = String(detailData[i][1] || "").trim().toUpperCase();
    const artCode = String(detailData[i][2] || "").trim().toUpperCase();
    const mau = String(detailData[i][3] || "").trim().toUpperCase();
    
    let url = null;
    
    if (artCode && imageMap[artCode]) url = imageMap[artCode];
    if (!url && tenSP && imageMap[tenSP]) url = imageMap[tenSP];
    if (!url && artCode && mau && imageMap[artCode + "_" + mau]) url = imageMap[artCode + "_" + mau];
    if (!url && artCode && mau && imageMap[artCode + " " + mau]) url = imageMap[artCode + " " + mau];
    if (!url && tenSP && mau && imageMap[tenSP + "_" + mau]) url = imageMap[tenSP + "_" + mau];
    
    // Partial match
    if (!url && artCode) {
      for (const key in imageMap) {
        if (key.includes(artCode) || artCode.includes(key)) {
          url = imageMap[key]; break;
        }
      }
    }
    if (!url && tenSP) {
      for (const key in imageMap) {
        if (key.includes(tenSP) || tenSP.includes(key)) {
          url = imageMap[key]; break;
        }
      }
    }
    
    const cell = detailSheet.getRange(i + 1, imgColIdx + 1);
    if (url) {
      cell.setFormula('=IMAGE("' + url + '",1)');
      matchCount++;
    } else {
      cell.setValue("");
    }
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
