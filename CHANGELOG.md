# Changelog

## v1.2.0 (2026-07-01)

### Added
- Màn hình đăng nhập bảo vệ app (SHA-256, khóa 5 lần sai)
- Flow wizard: Login → Connect JIRA → Select Project → Config → Dashboard
- Weekly Planner: lên lịch tuần, tự động load JIRA tasks, log worklog
- Dashboard phân tab: Tổng quan / Dữ liệu / Gantt / So sánh
- Dark/Light mode trên màn hình đăng nhập (thiết kế 2 cột)
- Project selector dạng grid card với tìm kiếm
- Nút đổi dự án từ Dashboard
- Font Consolas toàn bộ ứng dụng

### Changed
- Sidebar phân cấp: Dashboard menu cha-con
- Giao diện login thiết kế lại 2 cột
- Mật khẩu mặc định: 123456aA@
- FilterBar gọn một hàng
- Project selector layout hiện đại

### Fixed
- Icon đè placeholder trong các ô input
- Dark mode Tailwind class strategy
- Label dropdown nhảy vị trí
- Save message không tự tắt
- Restore snapshot thiếu dates

## v1.1.0 (2026-06-30)

### Added
- Label Manager (tạo/gán/lọc nhãn, auto-rule)
- History Manager (lưu/xem/so sánh snapshot)
- Electron SSO login
- Auto Report + Month Comparison

## v1.0.0 (2026-06-28)

- Initial release
