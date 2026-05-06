/**
 * image.gs — Đổ hình ảnh sản phẩm từ Google Drive vào Sheet
 * Drive Folder: https://drive.google.com/drive/u/0/folders/1nGoPHciSLOJuBqSPCvPX1E6WW6X5vzDI
 */

const IMAGE_FOLDER_ID = "1nGoPHciSLOJuBqSPCvPX1E6WW6X5vzDI";

/**
 * HÀM CHÍNH: Quét folder Drive, tạo sheet mapping hình ảnh,
 * và cập nhật cột "Hình ảnh" trong data_order_details.
 */
function syncProductImages() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // 1. Đọc tất cả file ảnh trong folder + folder con (đệ quy)
  const rootFolder = DriveApp.getFolderById(IMAGE_FOLDER_ID);
  const imageMap = {}; // key (uppercase) -> image info
  const allImages = [];
  
  function scanFolder(folder, folderName) {
    // Quét file ảnh trong folder hiện tại
    const files = folder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      const mimeType = file.getMimeType();
      if (!mimeType.startsWith("image/")) continue;
      
      const fileName = file.getName();
      const fileId = file.getId();
      const imageUrl = "https://drive.google.com/uc?export=view&id=" + fileId;
      const thumbUrl = "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w200";
      const baseName = fileName.replace(/\.[^/.]+$/, "").trim().toUpperCase();
      
      // Lưu mapping theo cả tên file và tên folder con
      imageMap[baseName] = {
        fileName: fileName,
        fileId: fileId,
        imageUrl: imageUrl,
        thumbUrl: thumbUrl,
        mimeType: mimeType,
        folderName: folderName
      };
      
      // Cũng map theo tên folder con (thường đặt theo Art Code / tên SP)
      if (folderName) {
        const folderKey = folderName.trim().toUpperCase();
        if (!imageMap[folderKey]) {
          imageMap[folderKey] = imageMap[baseName];
        }
      }
      
      allImages.push({
        fileName: fileName,
        baseName: baseName,
        fileId: fileId,
        imageUrl: imageUrl,
        thumbUrl: thumbUrl,
        folderName: folderName
      });
    }
    
    // Đệ quy vào các folder con
    const subFolders = folder.getFolders();
    while (subFolders.hasNext()) {
      const sub = subFolders.next();
      scanFolder(sub, sub.getName());
    }
  }
  
  scanFolder(rootFolder, "");
  
  Logger.log("Tìm thấy " + allImages.length + " ảnh trong folder");
  
  // 2. Tạo/cập nhật sheet mapping ảnh
  let imgSheet = ss.getSheetByName("data_images");
  if (!imgSheet) {
    imgSheet = ss.insertSheet("data_images");
  }
  imgSheet.clearContents();
  
  const imgHeaders = ["Tên file", "Key (uppercase)", "Folder", "File ID", "URL Ảnh gốc", "URL Thumbnail"];
  imgSheet.getRange(1, 1, 1, imgHeaders.length).setValues([imgHeaders]);
  imgSheet.getRange(1, 1, 1, imgHeaders.length).setFontWeight("bold").setBackground("#fce5cd");
  imgSheet.setFrozenRows(1);
  
  if (allImages.length > 0) {
    const imgData = allImages.map(img => [
      img.fileName,
      img.baseName,
      img.folderName || "",
      img.fileId,
      img.imageUrl,
      img.thumbUrl
    ]);
    imgSheet.getRange(2, 1, imgData.length, imgHeaders.length).setValues(imgData);
  }
  
  // 3. Cập nhật cột "Hình ảnh" trong data_order_details (nếu có)
  const detailSheet = ss.getSheetByName("data_order_details");
  if (!detailSheet) {
    SpreadsheetApp.getUi().alert("Đã lưu " + allImages.length + " ảnh vào sheet data_images.\nKhông tìm thấy data_order_details để cập nhật.");
    return;
  }
  
  const detailData = detailSheet.getDataRange().getValues();
  const headers = detailData[0];
  
  // Tìm hoặc thêm cột "Hình ảnh"
  let imgColIdx = headers.indexOf("Hình ảnh");
  if (imgColIdx === -1) {
    // Thêm cột mới vào vị trí sau "Art Code" (col 2) hoặc cuối
    const artCodeIdx = headers.indexOf("Art Code");
    if (artCodeIdx >= 0) {
      // Thêm sau Art Code
      imgColIdx = artCodeIdx + 1;
      detailSheet.insertColumnAfter(imgColIdx + 1);
      // Re-read headers
      const newHeaders = detailSheet.getRange(1, 1, 1, detailSheet.getLastColumn()).getValues()[0];
      detailSheet.getRange(1, imgColIdx + 1).setValue("Hình ảnh");
    } else {
      // Thêm vào cuối
      imgColIdx = headers.length;
      detailSheet.getRange(1, imgColIdx + 1).setValue("Hình ảnh");
    }
    detailSheet.getRange(1, imgColIdx + 1).setFontWeight("bold").setBackground("#fff2cc");
  }
  
  // 4. Match ảnh với sản phẩm
  // Thử match theo: Art Code, Tên SP, hoặc Art Code + Màu
  let matchCount = 0;
  
  for (let i = 1; i < detailData.length; i++) {
    const tenSP = String(detailData[i][1] || "").trim().toUpperCase();
    const artCode = String(detailData[i][2] || "").trim().toUpperCase();
    const mau = String(detailData[i][3] || "").trim().toUpperCase();
    
    let matched = null;
    
    // Thử match chính xác theo Art Code
    if (artCode && imageMap[artCode]) {
      matched = imageMap[artCode];
    }
    // Thử match theo Tên SP
    if (!matched && tenSP && imageMap[tenSP]) {
      matched = imageMap[tenSP];
    }
    // Thử match theo Art Code + Màu
    if (!matched && artCode && mau) {
      const combo = artCode + "_" + mau;
      if (imageMap[combo]) matched = imageMap[combo];
      const combo2 = artCode + " " + mau;
      if (!matched && imageMap[combo2]) matched = imageMap[combo2];
    }
    // Thử match theo Tên SP + Màu
    if (!matched && tenSP && mau) {
      const combo = tenSP + "_" + mau;
      if (imageMap[combo]) matched = imageMap[combo];
      const combo2 = tenSP + " " + mau;
      if (!matched && imageMap[combo2]) matched = imageMap[combo2];
    }
    // Partial match: tên file chứa Art Code
    if (!matched && artCode) {
      for (const key in imageMap) {
        if (key.includes(artCode) || artCode.includes(key)) {
          matched = imageMap[key];
          break;
        }
      }
    }
    
    if (matched) {
      detailSheet.getRange(i + 1, imgColIdx + 1).setValue(matched.thumbUrl);
      matchCount++;
    }
  }
  
  SpreadsheetApp.getUi().alert(
    "✅ Hoàn tất!\n\n" +
    "📁 Tổng ảnh trong folder: " + allImages.length + "\n" +
    "🔗 Đã match: " + matchCount + "/" + (detailData.length - 1) + " sản phẩm\n" +
    "📋 Sheet data_images đã cập nhật."
  );
}

/**
 * Xem danh sách tất cả ảnh trong folder (debug)
 */
function listAllImages() {
  const folder = DriveApp.getFolderById(IMAGE_FOLDER_ID);
  const files = folder.getFiles();
  
  let count = 0;
  while (files.hasNext()) {
    const file = files.next();
    if (file.getMimeType().startsWith("image/")) {
      count++;
      Logger.log(count + ". " + file.getName() + " | ID: " + file.getId());
    }
  }
  Logger.log("Tổng: " + count + " ảnh");
}

/**
 * Lấy URL ảnh theo Art Code (dùng cho API)
 */
function getImageByArtCode(artCode) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const imgSheet = ss.getSheetByName("data_images");
  if (!imgSheet) return null;
  
  const data = imgSheet.getDataRange().getValues();
  const searchKey = String(artCode).trim().toUpperCase();
  
  for (let i = 1; i < data.length; i++) {
    const key = String(data[i][1]).trim().toUpperCase();
    if (key === searchKey || key.includes(searchKey)) {
      return {
        imageUrl: data[i][3],
        thumbUrl: data[i][4]
      };
    }
  }
  return null;
}
