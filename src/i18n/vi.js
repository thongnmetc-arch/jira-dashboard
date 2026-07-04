const vi = {
  // Login
  login: { title: 'Đăng nhập', username: 'Tài khoản', password: 'Mật khẩu', loginBtn: 'Đăng nhập', remember: 'Ghi nhớ đăng nhập', forgot: 'Quên mật khẩu?', error: 'Sai tài khoản hoặc mật khẩu', setup: 'Thiết lập mật khẩu', setupBtn: 'Thiết lập', setupLink: 'Thiết lập mật khẩu lần đầu', newPassword: 'Mật khẩu mới', confirmPassword: 'Xác nhận mật khẩu', accountName: 'Tên tài khoản', backToLogin: 'Quay lại đăng nhập', lockoutTitle: 'Tạm khóa', lockoutMsg: 'Quá nhiều lần thử sai. Vui lòng thử lại sau.', errorRequired: 'Vui lòng nhập tài khoản', errorPasswordLength: 'Mật khẩu phải có ít nhất 4 ký tự', errorPasswordMatch: 'Mật khẩu xác nhận không khớp', errorSetup: 'Lỗi khi thiết lập. Vui lòng thử lại.', errorAuth: 'Lỗi xác thực. Vui lòng thử lại.', errorTooMany: 'Quá nhiều lần thử sai. Vui lòng thử lại sau 30 phút.', errorAttempt: 'Sai tài khoản hoặc mật khẩu (còn {n} lần)', showPassword: 'Hiện mật khẩu', hidePassword: 'Ẩn mật khẩu', tagline: 'Theo dõi thời gian làm việc — Trực quan & Hiệu quả', feature1: 'Phân tích dữ liệu JIRA với 5+ biểu đồ trực quan', feature2: 'Quản lý nhãn thông minh, tự động phân loại công việc', feature3: 'Lưu & so sánh lịch sử phân tích theo thời gian', feature4: 'Ứng dụng desktop — Không cần trình duyệt' },
  // Sidebar
  sidebar: { overview: 'Tổng quan', data: 'Dữ liệu', burndown: 'Burndown', monthCompare: 'So sánh tháng', report: 'Báo cáo', ot: 'OT & Nghỉ phép', labels: 'Quản lý nhãn', history: 'Lịch sử', weeklyPlanner: 'Lập kế hoạch', weeklyTasks: 'Công việc theo tuần', createTask: 'Tạo công việc', expand: 'Mở rộng', collapse: 'Thu gọn' },
  // Dashboard
  dashboard: { title: 'JIRA Dashboard', noData: 'Chưa có dữ liệu', backToTop: 'Lên đầu trang', lastUpdate: 'Cập nhật lần cuối:', updating: 'Đang cập nhật...', source: 'Nguồn:', jiraApi: 'JIRA API', htmlExport: 'HTML Export', historySource: 'Lịch sử', csvSource: 'File', refreshError: 'Tự động cập nhật thất bại:', manualRefreshError: 'Cập nhật thất bại:', noTasksFound: 'Không tìm thấy công việc nào.', taskCount: 'công việc', logged: 'đã log', changeProject: 'Đổi dự án', manualRefresh: 'Cập nhật thủ công', otPrefix: 'Tăng ca: +', leavePrefix: 'Nghỉ phép: -', overdueMore: 'và', otherTask: 'task khác' },
  // Stats
  stats: { totalTasks: 'Tổng số công việc', totalHours: 'Tổng giờ đã log', totalEstimate: 'Tổng giờ ước tính', avgPerTask: 'Thời gian TB mỗi task', effort: 'Effort', effortMonth: 'Effort tháng', effortAvg: 'Effort TB', overview: 'Tổng quan', currentMonth: 'Tháng hiện tại', allStatuses: 'tất cả trạng thái', above: '✅ Vượt', below: '⚠️ Thiếu', sufficient: '✅ Đủ', avgDetail: 'Trung bình ({n} tháng)', effortWarning: '⚠️ Effort > 1 — kiểm tra lại xem đã log đủ task chưa' },
  // Filter
  filter: { sprint: 'Sprint', component: 'Phân hệ', assignee: 'Người thực hiện', fromDate: 'Từ ngày', toDate: 'Đến ngày', reset: 'Xóa bộ lọc', all: 'Tất cả', allSprints: 'Tất cả Sprint', allComponents: 'Tất cả phân hệ', clearAll: 'Xóa tất cả bộ lọc' },
  // DataTable
  table: { key: 'Issue Key', summary: 'Tóm tắt', component: 'Phân hệ', sprint: 'Sprint', assignee: 'Người thực hiện', hoursLogged: 'Giờ log', hoursEstimate: 'Giờ ước tính', status: 'Trạng thái', labels: 'Nhãn', search: 'Tìm kiếm...', noResults: 'Không tìm thấy kết quả', close: 'Đóng', bulkClose: 'Đóng hàng loạt', bulkLabel: 'Gán nhãn', export: 'Xuất', title: 'Bảng dữ liệu chi tiết', rows: 'dòng', page: 'Trang', selectedCount: 'Đã chọn', markDone: 'Đánh dấu đã xong', exportCsv: 'Xuất CSV', appOnly: 'Thay đổi chỉ hiển thị trong app, không đồng bộ JIRA', selectAll: 'Chọn tất cả', deselectAll: 'Bỏ chọn tất cả', bulkLabelFor: 'Gán nhãn cho' },
  // Connect
  connect: { title: 'Kết nối JIRA', url: 'URL JIRA', token: 'API Token', projectKey: 'Project Key', assignee: 'Email người thực hiện', jql: 'JQL', connectBtn: 'Kết nối & Tải dữ liệu', reConnect: 'Kết nối lại', connected: 'Đã kết nối', test: 'Kiểm tra kết nối', testError: 'Không thể kết nối', enterUrl: 'Vui lòng nhập URL JIRA', enterToken: 'Vui lòng nhập API Token', enterProject: 'Vui lòng nhập Project Key', optional: 'tùy chọn' },
  // Project Selector
  projects: { title: 'Chọn dự án', search: 'Tìm kiếm dự án...', next: 'Tiếp tục', back: 'Quay lại', loading: 'Đang tải danh sách dự án...', error: 'Không thể tải danh sách dự án', noProjects: 'Không tìm thấy dự án nào', switchProject: 'Đổi dự án', step3: 'Bước 3/4', connected: 'Đã kết nối: ', searchPlaceholder: 'Tìm kiếm dự án theo tên hoặc mã...', project: 'dự án', noMatch: 'Không tìm thấy dự án phù hợp.', enterHint: 'Nhấn Enter để chọn' },
  // Query Config
  query: { title: 'Cấu hình truy vấn', assigneeLabel: 'Email người thực hiện', assigneePlaceholder: 'user@company.com', jqlLabel: 'JQL (tùy chọn)', jqlPlaceholder: 'VD: status != Cancelled ORDER BY created DESC', start: 'Bắt đầu phân tích', back: 'Quay lại', step4: 'Bước 4/4', notEntered: 'Chưa nhập', emptyJql: 'Để trống JQL để lấy tất cả issues trong project.', skipAll: 'Bỏ qua, xem tất cả issues' },
  // Weekly Planner
  planner: { save: 'Lưu', logToJira: 'Log lên JIRA', logged: 'Đã log!', noTasks: 'Chưa có công việc nào', target: 'Mục tiêu' },
  // OT Panel
  ot: { otHours: 'Giờ OT', leaveHours: 'Giờ nghỉ phép', save: 'Lưu & Tính lại Effort', effortFormula: 'Effort sẽ tự động tính lại: (Ngày công × 7 + OT - Nghỉ) / Tổng giờ ước tính' },
  // Create Task
  createTask: { title: 'Tạo công việc', subtitle: 'Tạo issue mới trong JIRA', projectKey: 'Dự án', issueType: 'Loại công việc', summary: 'Tóm tắt', summaryPlaceholder: 'Nhập tóm tắt công việc...', description: 'Mô tả', descriptionPlaceholder: 'Nhập mô tả (không bắt buộc)...', assignee: 'Người thực hiện', assigneePlaceholder: 'user@company.com', sprint: 'Sprint', sprintPlaceholder: 'Nhập tên Sprint...', startDate: 'Ngày bắt đầu', dueDate: 'Ngày kết thúc', estimate: 'Thời gian dự kiến (giờ)', button: 'Tạo công việc', creating: 'Đang tạo...', success: 'Tạo thành công:' },
  // History
  history: { title: 'Lịch sử', save: 'Lưu bản hiện tại', name: 'Tên bản lưu', compare: 'So sánh', delete: 'Xóa', restore: 'Khôi phục', storage: 'Dung lượng', noSnapshots: 'Chưa có bản lưu nào' },
  // Dashboard tabs
  tabs: { overview: 'Tổng quan', charts: 'Biểu đồ', data: 'Dữ liệu', gantt: 'Gantt', compare: 'So sánh', ot: 'OT & Nghỉ phép', history: 'Lịch sử' },
  // Common
  common: { cancel: 'Hủy', delete: 'Xóa', close: 'Đóng', loading: 'Đang tải...', error: 'Lỗi', success: 'Thành công', overdue: 'task chưa được đóng', viewTable: 'Xem bảng', openMenu: 'Mở menu', file: 'File', toggleTheme: 'Đổi giao diện sáng/tối', logout: 'Đăng xuất', retry: 'Thử lại', hours: 'giờ', tasks: 'task', restore: 'Khôi phục', deleteConfirm: 'Xóa', back: 'Quay lại' },
  // Language
  lang: { vi: 'Tiếng Việt', en: 'English', switch: 'Đổi ngôn ngữ' },

};
export default vi;
