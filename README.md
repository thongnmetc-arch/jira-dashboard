
<div align="center">
  <h1>📊 JIRA Time Tracking Dashboard</h1>
  <p>
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19"/>
    <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" alt="Vite 6"/>
    <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4"/>
    <img src="https://img.shields.io/badge/Chart.js-4-FF6384?logo=chartdotjs&logoColor=white" alt="Chart.js 4"/>
    <img src="https://img.shields.io/badge/Electron-42-47848F?logo=electron&logoColor=white" alt="Electron 42"/>
    <img src="https://img.shields.io/badge/License-MIT-yellow" alt="MIT License"/>
  </p>
  <p><em>Ứng dụng web đơn trang (SPA) giúp trực quan hóa dữ liệu thời gian làm việc từ JIRA</em></p>
</div>

---

## 📖 Giới thiệu

**JIRA Time Tracking Dashboard** là ứng dụng web đơn trang (Single Page Application) được xây dựng với React 19, cho phép nhập và phân tích dữ liệu thời gian làm việc từ JIRA qua nhiều kênh khác nhau. 

Ứng dụng hỗ trợ nhập dữ liệu từ **CSV**, **HTML export** từ Excel, **JIRA API** (Basic Auth), và **Bookmarklet** — giúp bạn linh hoạt lựa chọn phương thức phù hợp nhất với quy trình hiện tại.

Sau khi nhập dữ liệu, dashboard cung cấp:
- **Phân tích effort** với biểu đồ trực quan (Chart.js)
- **Quản lý OT và nghỉ phép** với các nút quick-add
- **Gán nhãn** thủ công, hàng loạt hoặc tự động qua auto-rule
- **Lưu snapshot lịch sử**, so sánh delta giữa 2 phiên bản
- **Xuất báo cáo** dạng CSV hoặc JSON
- Giao diện **Dark/Light theme** với hiệu ứng chuyển cảnh Framer Motion

---

## ✨ Tính năng chính

### 📥 Import dữ liệu

| Phương thức | Mô tả |
|-------------|-------|
| **CSV** | Export Worklog từ JIRA → kéo thả file CSV vào dashboard |
| **HTML** | Export Excel (HTML Table) từ JIRA → import qua sidebar |
| **JIRA API** | Nhập URL, Email, API Token, Project Key → tự động fetch dữ liệu |
| **Bookmarklet** | Tạo bookmark → click trên tab JIRA → tự động thu thập và gửi dữ liệu |

### 📊 Dashboard & Biểu đồ

- **5 biểu đồ Chart.js**:
  - `TypeDoughnutChart` — Phân bố loại công việc (Bug, Task, Story...)
  - `SprintBarChart` — So sánh effort theo Sprint
  - `AssigneeBarChart` — Effort theo từng thành viên
  - `ComponentBarChart` — Effort theo component
  - `DailyTrendChart` — Xu hướng thời gian theo ngày
  - `BurndownChart` — Biểu đồ burndown tiến độ
- **Gantt Chart** trực quan theo timeline
- **DataTable** với phân trang, sắp xếp, tìm kiếm
- **Stats Grid** — Thống kê tổng quan (tổng giờ, số task, trung bình...)

### 📈 Effort Tracking

- Tính toán **ratio effort** (thời gian thực tế / ước tính)
- **Gauge bar** trực quan hóa mức độ hoàn thành
- Cảnh báo khi effort vượt ngưỡng cho phép

### ⏱ Quản lý OT & Nghỉ phép

- Bảng nhập OT và nghỉ phép riêng biệt
- **Quick-add buttons**: thêm nhanh giờ OT hoặc ngày nghỉ
- Tự động tính tổng và hiển thị trên dashboard

### 🏷 Quản lý nhãn (Label Manager)

- **Tạo nhãn** với màu sắc tùy chỉnh
- **Gán nhãn thủ công** từng task hoặc **hàng loạt** (bulk select)
- **Auto-rule**: thiết lập quy tắc tự động gán nhãn dựa trên điều kiện (component, assignee, loại task...)
- **Trình soạn thảo rule** (`RuleEditor`) trực quan

### 💾 Lịch sử (History Manager)

- **Lưu snapshot** dữ liệu hiện tại
- **Xem lại** các snapshot đã lưu
- **So sánh delta** giữa 2 bản (so sánh khác biệt về effort, số lượng task...)
- Lưu trữ trong `localStorage` và có thể xuất ra file

### 🌓 Giao diện

- **Dark/Light theme** với CSS variables
- **Framer Motion** animation cho chuyển cảnh mượt mà
- **Sidebar** thu gọn/mở rộng
- **Responsive** — hỗ trợ mobile và desktop

### 🖥 Electron Desktop App

- Ứng dụng desktop độc lập với Electron
- **SSO Login** với Microsoft (qua JIRA)
- **Cookie persistence** — giữ phiên đăng nhập qua các lần khởi động
- IPC bridge cho phép renderer gọi JIRA API mà không bị CORS
- Build portable `.exe` với electron-builder

### 📤 Xuất báo cáo

- Xuất dữ liệu hiện tại ra file **CSV**
- Xuất ra file **JSON** (bao gồm cả nhãn và OT)

---

## 🛠 Công nghệ sử dụng

| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|----------|
| **React** | ^19.0.0 | UI library, component-based architecture |
| **Vite** | ^6.0.0 | Build tool, dev server với HMR nhanh |
| **Tailwind CSS** | ^4.0.0 | Utility-first CSS framework |
| **Framer Motion** | ^12.0.0 | Animation & transition |
| **Chart.js** | ^4.4.7 | Biểu đồ dạng canvas hiệu suất cao |
| **react-chartjs-2** | ^5.3.0 | React wrapper cho Chart.js |
| **Lucide React** | ^0.400.0 | Icon library (hỗ trợ tree-shaking) |
| **Electron** | ^42.5.0 | Desktop application shell |
| **electron-builder** | ^26.15.3 | Build & package desktop app |
| **Context API + useReducer** | — | State management toàn cục |
| **@vitejs/plugin-react** | ^4.3.4 | React Fast Refresh cho Vite |
| **@tailwindcss/vite** | ^4.0.0 | Tailwind CSS Vite plugin |

---

## 🚀 Cài đặt & Chạy

### Yêu cầu
- **Node.js** ≥ 18
- **npm** ≥ 9

### Cài đặt

```bash
git clone https://github.com/thongnmetc-arch/jira-dashboard.git
cd jira-dashboard
npm install
```

### Chạy môi trường phát triển (Web)

```bash
npm run dev
```

Truy cập [http://localhost:5173](http://localhost:5173) — dev server với HMR (Hot Module Replacement).

### Build production

```bash
npm run build
```

Build output tại thư mục `dist/`. Chạy preview:

```bash
npm run preview
```

### Electron Desktop App

#### Chạy môi trường phát triển (Electron + Vite)

```bash
npm run electron:dev
```

Khởi động đồng thời Vite dev server (localhost:5173) và cửa sổ Electron.

#### Build portable .exe

```bash
npm run electron:build
```

Tạo file `release/JIRA-Dashboard.exe` (portable, không cần cài đặt).

#### Build NSIS installer

```bash
npm run electron:dist
```

---

## 🔨 Build file .exe (Windows)

### Yêu cầu
- **Node.js 18+** — tải từ https://nodejs.org
- **Windows** — bản build `--win portable` chỉ hoạt động trên Windows
- **Git** — để clone repository

### Các bước
```bash
# 1. Clone repository
git clone https://github.com/thongnmetc-arch/jira-dashboard.git
cd jira-dashboard

# 2. Cài đặt dependencies
npm install

# 3. Build file .exe portable (1 file duy nhất, không cần cài đặt)
npm run electron:build
```

Sau khi build xong, file `JIRA-Dashboard.exe` sẽ nằm trong thư mục `release/`.
Copy file này sang máy khác là chạy được ngay — không cần cài Node.js hay bất kỳ thứ gì khác.

### Diễn giải lệnh build
```
npm run electron:build
  ├── vite build                    ← Build React app → thư mục dist/
  └── electron-builder --win portable  ← Đóng gói thành 1 file .exe
```

### Lưu ý
- File `.exe` có dung lượng ~100-150 MB (bao gồm Chromium + Node.js runtime)
- Chỉ cần copy 1 file `JIRA-Dashboard.exe` — chạy trực tiếp, không cần cài đặt
- Nếu dùng JIRA API trong app Electron, đảm bảo máy có kết nối mạng đến JIRA server

---

## 📋 Cách sử dụng

### 1. Nhập dữ liệu

#### CSV
1. Trong JIRA, vào tab **Issues** → **Export** → **CSV (All fields)**
2. Kéo thả file CSV vào khu vực **Upload Zone** trên dashboard
3. Dữ liệu tự động được parse và hiển thị

#### HTML (Excel export)
1. Trong JIRA, vào tab **Issues** → **Export** → **Excel (HTML)**
2. Mở file HTML trong trình duyệt (hoặc kéo vào dashboard)
3. Sidebar sẽ tự động phát hiện và import dữ liệu

#### JIRA API
1. Mở **JIRA Connect** panel từ sidebar
2. Nhập:
   - **URL** server JIRA (vd: `https://your-domain.atlassian.net`)
   - **Email** đăng nhập
   - **API Token** (tạo tại [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens))
   - **Project Key** (vd: `PROJ`)
3. Nhấn **Connect** → dữ liệu tự động fetch

#### Bookmarklet
1. Tạo bookmark mới trong trình duyệt
2. Dán đoạn script bookmarklet (xem trong sidebar → Bookmarklet)
3. Mở tab JIRA, click bookmark → tự động thu thập và gửi dữ liệu

### 2. Khám phá Dashboard

Sau khi nhập dữ liệu:
- **Biểu đồ** hiển thị tổng quan effort theo nhiều chiều
- **Gantt Chart** cho timeline công việc
- **DataTable** để xem chi tiết từng task (có thể sắp xếp, tìm kiếm)
- **Filter Bar** để lọc theo Sprint, Component, Assignee, ngày, nhãn
- **Effort Card** hiển thị gauge bar và ratio effort

### 3. Quản lý OT & Nghỉ phép

- Click vào **OT Panel** trong sidebar
- Thêm giờ OT với nút **+ OT**
- Thêm ngày nghỉ với nút **+ Nghỉ phép**
- Tổng OT và nghỉ phép hiển thị trên dashboard

### 4. Gán nhãn

- Mở **Label Manager** từ sidebar
- **Tạo nhãn mới** với tên và màu sắc
- **Gán thủ công**: chọn task → chọn nhãn từ dropdown
- **Gán hàng loạt**: chọn nhiều task → gán nhãn cùng lúc
- **Auto-rule**: thêm quy tắc tự động (vd: "Component = Backend → gán nhãn Backend")

### 5. Lưu & So sánh lịch sử

- Mở **History** từ sidebar
- **Lưu snapshot**: đặt tên → lưu trạng thái hiện tại
- **Xem snapshot**: click vào tên để khôi phục dữ liệu
- **So sánh**: chọn 2 snapshot → xem bảng delta khác biệt

---

## 📁 Cấu trúc thư mục

```
jira-dashboard/
├── electron/
│   ├── main.js          # Main process Electron (IPC, SSO, cookie)
│   ├── preload.js       # Preload script (contextBridge API)
│   └── package.json     # Electron dependencies
│
├── src/
│   ├── main.jsx         # Entry point React
│   ├── App.jsx          # Root component + data import handlers
│   ├── index.css        # Tailwind CSS + CSS variables (themes)
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.jsx     # Khung ứng dụng chính
│   │   │   ├── Sidebar.jsx      # Sidebar điều hướng
│   │   │   └── TopBar.jsx       # Thanh công cụ trên cùng
│   │   │
│   │   ├── charts/
│   │   │   ├── AssigneeBarChart.jsx
│   │   │   ├── BurndownChart.jsx
│   │   │   ├── ComponentBarChart.jsx
│   │   │   ├── DailyTrendChart.jsx
│   │   │   ├── SprintBarChart.jsx
│   │   │   └── TypeDoughnutChart.jsx
│   │   │
│   │   ├── ChartGrid.jsx        # Grid hiển thị các biểu đồ
│   │   ├── Dashboard.jsx        # Trang dashboard chính
│   │   ├── DataTable.jsx        # Bảng dữ liệu (sort, search, page)
│   │   ├── EffortCard.jsx       # Thẻ effort (gauge, ratio)
│   │   ├── FilterBar.jsx        # Thanh lọc dữ liệu
│   │   ├── GanttChart.jsx       # Biểu đồ Gantt
│   │   ├── StatsGrid.jsx        # Thống kê tổng quan
│   │   ├── TaskDetail.jsx       # Chi tiết task
│   │   │
│   │   ├── UploadZone.jsx       # Kéo thả file CSV
│   │   ├── JiraConnect.jsx      # Kết nối JIRA API
│   │   ├── OTPanel.jsx          # Quản lý OT/Nghỉ phép
│   │   │
│   │   ├── LabelManager.jsx     # Quản lý nhãn
│   │   ├── LabelBadge.jsx       # Badge hiển thị nhãn
│   │   ├── LabelDropdown.jsx    # Dropdown chọn nhãn
│   │   ├── LabelFilter.jsx      # Lọc theo nhãn
│   │   ├── RuleEditor.jsx       # Soạn thảo auto-rule
│   │   │
│   │   ├── HistoryPanel.jsx     # Quản lý snapshot lịch sử
│   │   ├── CompareView.jsx      # So sánh delta 2 bản
│   │   ├── MonthComparison.jsx  # So sánh theo tháng
│   │   └── AutoReport.jsx       # Tự động tạo báo cáo
│   │
│   ├── context/
│   │   └── AppContext.jsx       # State toàn cục (Context API + useReducer)
│   │
│   └── utils/
│       ├── csvParser.js         # Parse file CSV
│       ├── htmlParser.js        # Parse HTML export từ JIRA
│       ├── jiraApi.js           # Gọi JIRA REST API
│       ├── dateUtils.js         # Tiện ích xử lý ngày tháng
│       ├── effortCalculator.js  # Tính toán effort ratio
│       ├── labelUtils.js        # Logic gán nhãn & auto-rule
│       ├── historyUtils.js      # Lưu/xóa/so sánh snapshot
│       └── exportUtils.js       # Xuất CSV/JSON
│
├── docs/
│   ├── features/         # Tài liệu tính năng
│   ├── intel/            # Tài liệu kiến trúc & phân tích
│   └── modules/          # Tài liệu module
│
├── public/               # Static assets
├── dist/                 # Build output (generated)
├── release/              # Electron release (generated)
│
├── index.html            # HTML entry point
├── vite.config.js        # Vite configuration
├── package.json          # Dependencies & scripts
└── README.md             # (this file)
```

---

## 🏗 Kiến trúc

### State Management

Ứng dụng sử dụng **Context API + `useReducer`** để quản lý state toàn cục.

- **AppContext** (`src/context/AppContext.jsx`) chứa toàn bộ state của ứng dụng
- **Reducer pattern** giúp state transitions rõ ràng, dễ debug
- Các action điển hình: `SET_TASKS`, `SET_FILTERS`, `SET_OT_LEAVE`, `SET_DARK_MODE`...

```mermaid
graph TD
    A[App] --> B[AppProvider]
    B --> C[AppContent]
    C --> D[AppShell]
    D --> E[Sidebar]
    D --> F[TopBar]
    D --> G[JiraConnect / Dashboard]
    
    G --> H[FilterBar]
    G --> I[StatsGrid]
    G --> J[ChartGrid]
    G --> K[DataTable]
    G --> L[GanttChart]
    G --> M[EffortCard]
    
    J --> J1[TypeDoughnutChart]
    J --> J2[SprintBarChart]
    J --> J3[AssigneeBarChart]
    J --> J4[ComponentBarChart]
    J --> J5[DailyTrendChart]
    J --> J6[BurndownChart]
    
    subgraph State
        S[(AppContext<br/>useReducer)]
    end
    
    C <--> S
    E <--> S
    F <--> S
    G <--> S
```

### Luồng dữ liệu

1. **Import**: User nhập dữ liệu qua CSV / HTML / API / Bookmarklet
2. **Parse**: File được parse bởi các utility (`csvParser`, `htmlParser`, `jiraApi`)
3. **Dispatch**: Dữ liệu được gửi vào `AppContext` qua action `SET_TASKS`
4. **Label sync**: Label auto-rule chạy, gán nhãn tự động
5. **Render**: Dashboard re-render với dữ liệu mới
6. **Filter/Sort**: User lọc, sắp xếp, tìm kiếm — state cập nhật → re-render
7. **Export/Lưu**: User xuất CSV/JSON hoặc lưu snapshot lịch sử

### Electron Architecture

```mermaid
graph LR
    R[Renderer Process<br/>React App] <-->|IPC| M[Main Process<br/>electron/main.js]
    M -->|HTTP| J[JIRA Server]
    M -->|read/write| FS[File System<br/>config.json]
    R -->|contextBridge| B[Browser API<br/>localStorage]
```

Trong môi trường Electron, renderer giao tiếp với main process qua IPC bridge (`preload.js`). Main process xử lý:
- Đăng nhập SSO (mở cửa sổ JIRA login)
- Quản lý cookie session
- Gọi JIRA API (vượt CORS)
- Lưu trữ cấu hình xuống file system

---

## 📄 Giấy phép

Dự án được phân phối dưới giấy phép **MIT**. Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

---

<div align="center">
  <p>🚀 <strong>JIRA Time Tracking Dashboard</strong> — Trực quan hóa thời gian làm việc, tối ưu hiệu suất đội nhóm</p>
</div>
