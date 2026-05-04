import os

file_path = 'index.html'
with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

npl_start_tag = '<!-- TAB: NPL & APPROVAL -->'
history_start_tag = '<!-- TAB: HISTORY -->'

start_index = html.find(npl_start_tag)
end_index = html.find(history_start_tag)

if start_index != -1 and end_index != -1 and end_index > start_index:
    clean_npl_tab = """<!-- TAB: NPL & APPROVAL -->
    <div id="nplTab" class="tab-content">
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-check-double"></i> PHÊ DUYỆT VẢI & NPL</h3>
        </div>
        <div class="card-body">
          <div class="grid-2">
            <div class="form-group">
              <label>Chọn Đơn Hàng (PO) <span style="color: var(--danger)">*</span></label>
              <input id="nplPOSearch" list="nplPOList" placeholder="Nhập mã PO để tìm..." onchange="onNplPOChange(this.value)">
              <datalist id="nplPOList"></datalist>
              <div id="nplLoadMsg" style="font-size:0.8rem; color:var(--accent); margin-top:5px; display:none;">Đang tải danh sách PO...</div>
            </div>
          </div>

          <!-- PO Summary -->
          <div id="nplPOSummary" style="display:none; margin-top:20px;">
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:15px;">
              <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:12px;">
                <div>
                  <span style="display:block; font-size:0.75rem; color:#166534; font-weight:600;">MÃ ĐƠN</span>
                  <span id="nplSummaryPO" style="font-weight:700; color:#151c32;">-</span>
                </div>
                <div>
                  <span style="display:block; font-size:0.75rem; color:#166534; font-weight:600;">NHÀ CUNG CẤP</span>
                  <span id="nplSummaryPartner" style="font-weight:700; color:#151c32;">-</span>
                </div>
                <div>
                  <span style="display:block; font-size:0.75rem; color:#166534; font-weight:600;">NGƯỜI LẬP</span>
                  <span id="nplSummaryCreator" style="font-weight:700; color:#151c32;">-</span>
                </div>
                <div>
                  <span style="display:block; font-size:0.75rem; color:#166534; font-weight:600;">TRẠNG THÁI</span>
                  <span id="nplSummaryStatus" style="font-weight:700; color:#151c32;">-</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Approval Form Area -->
          <div id="nplApprovalFormArea" style="display:none; margin-top:30px;">
            <h4 style="margin-bottom:15px; border-bottom:1px solid #e2e8f0; padding-bottom:10px;"><i class="fas fa-edit"></i> Cập nhật trạng thái phê duyệt</h4>
            <div class="grid-2">
              <div class="form-group">
                <label>Duyệt Vải</label>
                <select id="nplInp_vai" class="form-control">
                  <option value="Pending">Pending</option>
                  <option value="Pass">Pass</option>
                  <option value="Fail">Fail</option>
                </select>
              </div>
              <div class="form-group">
                <label>Duyệt Bo Dệt</label>
                <select id="nplInp_bo" class="form-control">
                  <option value="Pending">Pending</option>
                  <option value="Pass">Pass</option>
                  <option value="Fail">Fail</option>
                </select>
              </div>
              <div class="form-group">
                <label>Đồng Bộ NPL</label>
                <select id="nplInp_npl" class="form-control">
                  <option value="Pending">Pending</option>
                  <option value="Synced">Đã Đồng Bộ</option>
                  <option value="Delayed">Trễ NPL</option>
                </select>
              </div>
              <div class="form-group">
                <label>Ngày Đồng Bộ / Duyệt</label>
                <input type="date" id="nplInp_date" class="form-control">
              </div>
              <div class="form-group" style="grid-column: span 2;">
                <label>Ghi Chú / Sự Cố</label>
                <input type="text" id="nplInp_note" class="form-control" placeholder="Nhập ghi chú hoặc sự cố nếu có...">
              </div>
            </div>
            <div style="margin-top:25px; text-align:right;">
               <button class="btn btn-primary" id="btnNplSave" onclick="saveNplInTab()">
                 <i class="fas fa-save"></i> Lưu Trạng Thái Phê Duyệt
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    """
    new_html = html[:start_index] + clean_npl_tab + html[end_index:]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_html)
    print("Cleanup successful!")
else:
    print(f"Indices not found: {start_index}, {end_index}")
