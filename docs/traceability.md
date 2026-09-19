# Traceability

Every screen traces back to a feature and forward to the issue that built it.
This table is the single source of truth for Milestone 1 section 6 and for the
Milestone 4 report. Keep it current - a PR that adds a route and does not
update this file should not be approved.

| Route | Purpose | Access | Priority | Feature | Story issue | PR | Status |
|-------|---------|--------|----------|---------|-------------|-----|--------|
| `/` | Trang đăng nhập | G | P0 | F1 - Đăng nhập/Đăng xuất | US01 (#?), US02 (#?) | | Not started |
| `/dashboard` | Tổng quan số hồ sơ, điểm trung bình trong ngày | U | P0 | F2 - Dashboard tổng quan | US08 (#?) | | Not started |
| `/loan-applications/new` | Nhập hồ sơ vay mới | U | P0 | F3 - Nhập & validate hồ sơ vay | US03 (#?), US09 (#?) | | Not started |
| `/loan-applications/:id` | Xem chi tiết hồ sơ: thông tin, điểm, giải thích, lịch sử | U | P0 | F4 - Chấm điểm & giải thích kết quả | US04 (#?), US05 (#?) | | Not started |
| `/loan-applications` | Danh sách toàn bộ hồ sơ đã xử lý | U | P1 | F5 - Lịch sử & quản lý hồ sơ | US06 (#?), US10 (#?) | | Not started |
| `/admin/users` | Quản lý tài khoản nhân viên | A | P2 | F6 - Quản trị người dùng | *(chưa có issue — cần tạo thêm story P2)* | | Not started |

> `#?` = điền số issue GitHub thật ngay khi tạo issue tương ứng trên board. Cột `PR` điền số PR khi màn hình đó bắt đầu được code (từ Sprint 2 trở đi). Cột `Status` cập nhật `In progress`/`Done` theo tiến độ thật, không đợi tới cuối kỳ mới sửa hàng loạt.

**Access codes:** G = guest (not logged in) · U = authenticated user · A = admin

**Status:** Not started / In progress / Done

## Business rules

Numbered, so issues and tests can cite them.

| # | Rule | Enforced where | Tested by |
|---|------|----------------|-----------|
| BR1 | Điểm tín dụng trả về phải nằm trong [0, 100] | API `/score`, validate trước khi trả response | Unit test mô hình |
| BR2 | Thu nhập khai báo phải > 0 VNĐ, nếu không hồ sơ bị từ chối trước khi chấm điểm | API nhận hồ sơ vay, validate trước khi lưu DB | Unit test API |
| BR3 | Một hồ sơ chỉ được chấm điểm lại tối đa 3 lần trong 24 giờ | API `/score`, kiểm tra số lần gọi theo hồ sơ | Integration test luồng chấm điểm |
| BR4 | Điểm <40 → "Từ chối đề xuất"; 40–69 → "Cần xem xét thêm"; ≥70 → "Đủ điều kiện đề xuất" | Business logic layer (service chấm điểm) | Unit test mô hình + API |
| BR5 | Không lưu đầy đủ CCCD/số tài khoản trong log — chỉ lưu 4 số cuối | Logging middleware (backend) | Test xử lý dữ liệu nhạy cảm |
| BR6 | User chỉ xem hồ sơ do mình tạo; Admin xem toàn bộ hồ sơ chi nhánh | API middleware phân quyền (auth) | Unit test auth & phân quyền |