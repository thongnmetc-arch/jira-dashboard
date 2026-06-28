# Kế hoạch triển khai — History Manager

**Mã tài liệu:** PLAN-HM-001  
**Module:** M-001 (Dashboard Core)  
**Trạng thái:** Đang lên kế hoạch  
**Ngày:** 2026-06-28  
**Framework:** React 19 + Vite 6 + Tailwind CSS 4

---

## 1. Component Tree

```
AppProvider (AppContext.jsx)
├── AppShell
│   ├── Sidebar                   → nút "Lịch sử" mới
│   ├── TopBar                    → menu/history button (optional)
│   ├── Dashboard                 → dispatch RESTORE_SNAPSHOT
│   └── ...
│
├── HistoryPanel       [NEW]      → slide-out drawer (phải)
│   ├── Section A: Save           → ô đặt tên + nút Lưu
│   ├── Section B: List           → danh sách snapshot (tên, ngày, task count)
│   │   ├── nút Khôi phục
│   │   ├── nút Xóa
│   │   └── thẻ dung lượng (storage bar)
│   └── Section C: Compare        → nút "So sánh" mở CompareView
│
├── CompareView        [NEW]      → modal overlay
│   └── Bảng delta               → side-by-side diff (key, time, status, assignee)

components/
└── layout/
    └── HistoryPanel.jsx          → slide-out drawer (mượn pattern từ LabelManager/OTPanel)

utils/
└── historyUtils.js    [NEW]      → all localStorage CRUD + compression
```

**Quan hệ:** HistoryPanel ↔ historyUtils (đọc/ghi snapshot) → AppContext (dispatch RESTORE_SNAPSHOT) → Dashboard (cập nhật allTasks + filters)

---

## 2. Data Flow Diagram

```
┌──────────────┐       saveSnapshot()        ┌──────────────────┐
│   Dashboard   │ ──────────────────────────→ │  localStorage    │
│  (allTasks)   │   compressTasks(tasks)      │  jira-dash-sa_*  │
└──────┬───────┘                              └────────┬─────────┘
       │                                                │
       │ dispatch({type:'RESTORE_SNAPSHOT',...})       │ listSnapshots()
       │                                                │
       ▼                                                ▼
┌─────────────────────────────────────────────────────────────┐
│                  HistoryPanel (slide-out)                    │
│  ┌─────────┐   ┌──────────┐   ┌──────────────┐             │
│  │ Save    │   │ List     │   │ Compare      │             │
│  │ - name  │   │ - row 1  │   │ - chọn 2 mốc  │             │
│  │ - btn   │   │ - row 2  │   │ - xem delta   │             │
│  └─────────┘   └──────────┘   └──────┬───────┘             │
└──────────────────────────────────────┼─────────────────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │  CompareView     │
                              │  (bảng diff)     │
                              └─────────────────┘
```

**Luồng Lưu:** Dashboard (allTasks hiện tại) → historyUtils.saveSnapshot(name, tasks) → mã hóa → localStorage
**Luồng Xem/Khôi phục:** historyUtils.listSnapshots() → hiển thị danh sách → click Khôi phục → dispatch RESTORE_SNAPSHOT → reducer cập nhật allTasks, filters, isLoaded, fileName
**Luồng So sánh:** chọn 2 snapshot → historyUtils.loadSnapshot(id) cho cả 2 → so sánh từng task → CompareView hiển thị delta

---

## 3. State Additions (AppContext)

### 3.1. Thêm vào `initialState`

```js
// === History Manager state ===
historyPanelOpen: false,   // boolean — điều khiển slide-out drawer
```

### 3.2. Thêm vào `reducer`

| Action type            | Payload               | Mô tả                                                    |
|------------------------|-----------------------|----------------------------------------------------------|
| `SET_HISTORY_PANEL_OPEN` | `boolean`           | Mở/đóng HistoryPanel drawer                              |
| `RESTORE_SNAPSHOT`       | `{ tasks, name }`   | Thay thế allTasks, đặt fileName = snapshot name, isLoaded = true, tablePage = 1, filters = mặc định |

**Chi tiết case `RESTORE_SNAPSHOT`:**

```js
case 'RESTORE_SNAPSHOT': {
  const { tasks, name } = action.payload;
  return {
    ...state,
    allTasks: tasks,
    isLoaded: true,
    fileName: `🕒 ${name}`,
    fileStats: `${tasks.length} công việc (khôi phục từ lịch sử)`,
    dataSource: 'history',   // giá trị mới
    tablePage: 1,
    selectedTasks: [],
  };
}
```

### 3.3. Giá trị `dataSource` mới

- `'history'` — dùng để TopBar/Dashboard hiển thị badge "Đã khôi phục từ lịch sử" thay vì "File" hay "JIRA"

---

## 4. File-by-File Changes

### 4.1. [NEW] `src/utils/historyUtils.js`

Module xử lý toàn bộ logic localStorage cho snapshot.

**Hằng số:**
```js
const STORAGE_PREFIX = 'jira-dash-sa_';
const MAX_QUOTA_WARN = 4.5 * 1024 * 1024; // 4.5 MB — cảnh báo trước quota 5MB
```

**Hàm xuất:**

| Hàm                          | Tham số                               | Trả về                   | Mô tả                                                              |
|------------------------------|---------------------------------------|--------------------------|--------------------------------------------------------------------|
| `compressTasks(tasks)`       | `tasks: Task[]`                       | `string` (JSON)          | Rút gọn mỗi task xuống 7 field: key, timeSpentSec, estimateSec, compsStr, primarySprint, assignee, status, summary |
| `decompressTasks(compressed)` | `compressed: string`                  | `Task[]`                 | Giải nén về object đầy đủ (field thiếu nhận giá trị mặc định)      |
| `saveSnapshot(name, tasks)`  | `name: string`, `tasks: Task[]`       | `{ id, name, ... }`     | Nén + lưu localStorage, trả metadata. Ném lỗi nếu quota vượt quá  |
| `loadSnapshot(id)`           | `id: string`                          | `{ id, name, tasks }`   | Giải nén + trả về tasks                                            |
| `listSnapshots()`            | —                                     | `SnapshotMeta[]`         | Quét prefix, trả về [{ id, name, taskCount, savedAt, sizeBytes }] |
| `deleteSnapshot(id)`         | `id: string`                          | `void`                  | Xóa key khỏi localStorage                                          |
| `getStorageUsage()`          | —                                     | `{ usedBytes, ... }`    | Tổng dung lượng các key lịch sử (dùng cho storage bar)            |

**Schema của mỗi snapshot trong localStorage:**

```
Key:   jira-dash-sa_<timestamp>_<slug>
Value: JSON.stringify({
  version: 1,
  name: "Sprint 25",
  savedAt: "2026-06-28T10:30:00.000Z",
  taskCount: 142,
  tasks: [ ... ]   // mảng task đã nén (compressed)
})
```

**Lưu ý:**
- Dùng `localStorage.key()` + `localStorage.getItem()` để quét (không maintain index riêng)
- `saveSnapshot` check `getStorageUsage()` trước khi ghi, warn nếu > 4.5 MB
- Bọc toàn bộ trong try-catch để bắt lỗi `QuotaExceededError` / `SecurityError`

### 4.2. [NEW] `src/components/HistoryPanel.jsx`

Slide-out drawer bên phải, mượn pattern từ LabelManager.jsx (AnimatePresence, overlay, spring animation), width `420px`.

**3 Section:**

#### Section A: Save
- Input text: tên snapshot (placeholder: "VD: Sprint 25, 2026-06-28")
- Nút "Lưu snapshot" → gọi `saveSnapshot()` → thông báo thành công / lỗi
- Storage usage bar: progress bar (dùng `getStorageUsage()`) hiển thị % đã dùng, text "X KB / 5 MB"
- ![CẢNH BÁO] nếu usage > 4.5 MB: callout warning màu cam

#### Section B: Danh sách
- Gọi `listSnapshots()` khi panel mở
- Mỗi snapshot: icon clock, tên, ngày, số lượng task, dung lượng, 2 nút hành động
- Nút "Khôi phục": confirm dialog → dispatch RESTORE_SNAPSHOT → đóng panel
- Nút "Xóa": confirm dialog → gọi `deleteSnapshot()` → refresh list
- Sắp xếp theo `savedAt` giảm dần (mới nhất ở đầu)
- Empty state: "Chưa có snapshot nào"

#### Section C: Compare
- 2 dropdown chọn snapshot (A và B)
- Nút "So sánh" → mở CompareView modal
- Chỉ enable khi chọn đủ 2 snapshot khác nhau

**Dispatch:**
- `SET_HISTORY_PANEL_OPEN` để đóng/mở
- `RESTORE_SNAPSHOT` để khôi phục

### 4.3. [NEW] `src/components/CompareView.jsx`

Modal overlay (mượn pattern deleteConfirm từ LabelManager).

**Input:** snapshotA (tasks), snapshotB (tasks)

**Bảng delta so sánh từng task:**
| Cột       | Mô tả                                            |
|-----------|--------------------------------------------------|
| Task key  | Mã JIRA (màu đỏ nếu chỉ có ở A, xanh nếu chỉ có ở B) |
| Time      | timeSpentSec A → B                              |
| Estimate  | estimateSec A → B                               |
| Status    | status A → status B (màu khác nếu khác)          |
| Assignee  | assignee A → assignee B                         |
| Sprint    | primarySprint A → B                             |
| Tồn tại   | "Cả hai" / "Chỉ A" / "Chỉ B"                   |

**Tổng hợp:**
- Số task giống nhau
- Số task khác time/status/assignee
- Số task mới (chỉ có ở B)
- Số task đã biến mất (chỉ có ở A)

**Đóng:** nút × hoặc click overlay

### 4.4. [MODIFY] `src/context/AppContext.jsx`

**Thêm vào initialState:**
```js
// Dòng sau labelPanelOpen: false,
historyPanelOpen: false,
```

**Thêm vào reducer (trước `default`):**
```js
case 'SET_HISTORY_PANEL_OPEN':
  return { ...state, historyPanelOpen: action.payload };
case 'RESTORE_SNAPSHOT': {
  const { tasks, name } = action.payload;
  return {
    ...state,
    allTasks: tasks,
    isLoaded: true,
    fileName: `🕒 ${name}`,
    fileStats: `${tasks.length} công việc (khôi phục từ lịch sử)`,
    dataSource: 'history',
    tablePage: 1,
    selectedTasks: [],
    filters: { sprint: '', component: '', assignee: '', dateFrom: '', dateTo: '', labels: [] },
  };
}
```

**Import:** Không cần import mới (historyUtils được gọi từ component, không từ context).

### 4.5. [MODIFY] `src/components/layout/Sidebar.jsx`

**Import thêm:**
```jsx
import { History } from 'lucide-react';
// hoặc RotateCcw / Clock nếu History không có trong bản Lucide của project
```

**Thêm vào `navItems`** (sau `{ id: 'ot', label: 'OT & Nghỉ phép', icon: Clock }`):
```js
{ id: 'history', label: 'Lịch sử', icon: History || RotateCcw },
```

**Thêm action trong actionMap:**
```js
history: 'open-history',
```

**Thêm case trong handleNavClick:**
```js
case 'open-history':
  dispatch({ type: 'SET_HISTORY_PANEL_OPEN', payload: true });
  break;
```

### 4.6. [MODIFY] `src/components/Dashboard.jsx`

**Import HistoryPanel:**
```jsx
import HistoryPanel from './HistoryPanel';
```

**Render HistoryPanel** (cùng cấp với OTPanel và LabelManager, sau `<AutoReport />`):
```jsx
<HistoryPanel />
```

**Thêm `dataSource === 'history'`** vào các badge hiển thị nguồn dữ liệu (phần Data Source Info):
```jsx
) : state.dataSource === 'history' ? (
  <>🕒 <span>Nguồn: <strong>Lịch sử</strong></span></>
) : null}
```

### 4.7. [MODIFY] `src/components/layout/TopBar.jsx`

**Thêm section name:**
```js
history: 'Lịch sử',
```

**Cập nhật source badge** (tương tự Dashboard) để hiển thị `🕒 Lịch sử` khi `dataSource === 'history'`.

---

## 5. Integration Points

### 5.1. Sidebar → HistoryPanel

```
User click "Lịch sử" → dispatch SET_HISTORY_PANEL_OPEN(true) → HistoryPanel mở (slide-in từ phải)
```

### 5.2. Save flow

```
HistoryPanel Section A: nhập tên → click Lưu
  → historyUtils.saveSnapshot(name, state.allTasks)
  → Nếu thành công: toast + refresh list
  → Nếu lỗi quota: hiển thị lỗi + gợi ý xóa snapshot cũ
```

### 5.3. View / Restore flow

```
HistoryPanel Section B: click "Khôi phục"
  → Confirm dialog "Khôi phục snapshot [tên] sẽ thay thế dữ liệu hiện tại?"
  → Yes → historyUtils.loadSnapshot(id)
  → dispatch RESTORE_SNAPSHOT({ tasks, name })
  → Dashboard cập nhật toàn bộ dữ liệu, TopBar đổi badge
  → HistoryPanel đóng
```

### 5.4. Compare flow

```
HistoryPanel Section C: chọn snapshot A + B → click "So sánh"
  → historyUtils.loadSnapshot(idA) + loadSnapshot(idB)
  → So sánh từng task.key → tìm thêm / xóa / thay đổi
  → Mở CompareView modal
```

---

## 6. localStorage Strategy

### 6.1. Key prefix

```
jira-dash-sa_<ISO-timestamp>_<slug>
```

Ví dụ: `jira-dash-sa_2026-06-28T10-30-00_sprint-25`

**Không trùng với key hiện tại:**
- `jira-dash-theme` ✓
- `jira-dash-ot-leave` ✓
- `jira-dash-config` ✓
- `jira-dash-labels` ✓

### 6.2. Compression scheme

Mỗi task object (dashboard task) khi lưu được rút gọn xuống 8 field:

| Trường gốc              | Trường nén | Kiểu      | Ghi chú                          |
|-------------------------|------------|-----------|----------------------------------|
| `key`                   | `k`        | `string`  |                                  |
| `timeSpentSec`          | `t`        | `number`  | Giây, không float                |
| `estimateSec`           | `e`        | `number`  | Giây                             |
| `comps` (array)         | `c`        | `string`  | Nối bằng `,` `["FE","API"]` → `"FE,API"` |
| `primarySprint`         | `s`        | `string`  |                                  |
| `assignee`              | `a`        | `string`  |                                  |
| `status`                | `u`        | `string`  |                                  |
| `summary`               | `m`        | `string`  |                                  |

Các field khác (`issueType`, `priority`, `created`, `resolved`, `labels`, `parent`, `fixVersions`, `comps` gốc) được bỏ qua khi nén. Khi giải nén, `comps` được tái tạo từ chuỗi bằng `split(',')`.

**Hiệu quả dự kiến:** Giảm ~60-70% kích thước (từ ~1 KB/task xuống ~300-400 byte/task).

**`version: 1`** trong metadata để sau này có thể nâng cấp compression scheme.

### 6.3. Storage quota warning

```js
const QUOTA_WARN_THRESHOLD = 4.5 * 1024 * 1024; // 4.5 MB
```

- Khi `getStorageUsage() > QUOTA_WARN_THRESHOLD`: hiển thị warning trong HistoryPanel
- Trước mỗi `saveSnapshot`: kiểm tra, nếu vượt quá 5 MB → throw `QuotaExceededError`
- Storage bar: hiển thị `usedBytes / 5 MB` ở Section A

### 6.4. Xóa dữ liệu

- `deleteSnapshot(id)`: xóa key cá nhân
- Khi user click "Reset" trên Dashboard: **không xóa** snapshot (dữ liệu lịch sử độc lập với dữ liệu hiện tại)

---

## 7. Implementation Order

### Phase 1 — Foundation (P1)

| #  | File               | Task                                                        | Phụ thuộc |
|----|--------------------|-------------------------------------------------------------|-----------|
| 1  | `historyUtils.js`  | Viết 6 hàm CRUD + compression/decompression + storage check | —         |
| 2  | `AppContext.jsx`   | Thêm `historyPanelOpen`, `SET_HISTORY_PANEL_OPEN`, `RESTORE_SNAPSHOT`, giá trị `'history'` | —         |
| 3  | Kiểm thử foundation | Unit test historyUtils với tasks mẫu                        | #1        |

### Phase 2 — Core UI (P2)

| #  | File                 | Task                                                        | Phụ thuộc |
|----|----------------------|-------------------------------------------------------------|-----------|
| 4  | `HistoryPanel.jsx`   | Slide-out drawer, Section A (Save), Section B (List), Section C (Compare) | #1, #2   |
| 5  | `CompareView.jsx`    | Modal overlay, bảng delta, thống kê tổng hợp                | #1, #4    |
| 6  | Kiểm thử UI          | Mở panel, save, list, restore, compare                      | #4, #5    |

### Phase 3 — Integration (P3)

| #  | File                   | Task                                                        | Phụ thuộc |
|----|------------------------|-------------------------------------------------------------|-----------|
| 7  | `Sidebar.jsx`          | Thêm nav item "Lịch sử" + action dispatch                   | #2        |
| 8  | `Dashboard.jsx`        | Import + render HistoryPanel, cập nhật source badge         | #4, #2    |
| 9  | `TopBar.jsx`           | Cập nhật sectionNames + source badge                        | #2        |

### Phase 4 — Polish (P4)

| #  | Task                                                     | Mô tả                                            |
|----|----------------------------------------------------------|--------------------------------------------------|
| 10 | Kiểm thử end-to-end                                       | Save → restore → compare, edge cases             |
| 11 | Loading / empty / error states                           | Spinner, empty list, lỗi quota, lỗi parse        |
| 12 | Responsive (mobile)                                      | HistoryPanel drawer `max-w-[90vw]`, Confirm dialog mobile-friendly |
| 13 | Dark mode compatibility                                  | Kiểm tra màu sắc trong dark mode                 |

---

## 8. Edge Cases

| #  | Tình huống                        | Mô tả                                                                 | Xử lý                                                                      |
|----|-----------------------------------|-----------------------------------------------------------------------|----------------------------------------------------------------------------|
| 1  | **Tên snapshot rỗng**             | User click Lưu mà không nhập tên                                      | Disable nút Lưu khi `name.trim() === ''`                                   |
| 2  | **Quota exceeded**                | localStorage 5 MB đầy                                                  | Bắt `QuotaExceededError`, hiển thị lỗi, gợi ý xóa snapshot cũ             |
| 3  | **Quota warning**                 | Đã dùng > 4.5 MB                                                      | Warning bar màu cam + text dung lượng                                      |
| 4  | **Corrupted data**                | `JSON.parse` lỗi vì dữ liệu hỏng                                      | `try-catch` toàn bộ, bỏ qua key lỗi, log lỗi console                       |
| 5  | **Private browsing / SecurityError** | `localStorage` bị chặn (Safari private mode)                        | Bắt `SecurityError` hoặc `DOMException`, hiển thị thông báo thân thiện    |
| 6  | **Không có snapshot nào**         | listSnapshots trả về mảng rỗng                                        | Empty state với text hướng dẫn                                             |
| 7  | **So sánh 2 snapshot giống nhau** | User chọn cùng 1 snapshot cho A và B                                  | Disable nút "So sánh" nếu idA === idB                                      |
| 8  | **Khôi phục khi đang có dữ liệu** | User restore snapshot trong khi dashboard đang hiển thị dữ liệu khác  | Confirm dialog: "Dữ liệu hiện tại sẽ bị thay thế. Tiếp tục?"             |
| 9  | **Khôi phục snapshot rỗng**       | Snapshot có `taskCount === 0`                                         | Vẫn restore (dashboard hiển thị empty state)                               |
| 10 | **Xóa snapshot cuối cùng**        | Xóa snapshot duy nhất → list trống                                    | Refresh list → empty state                                                 |
| 11 | **localStorage biến mất**         | User clear localStorage (F12 → Application → Clear)                   | listSnapshots trả về rỗng, không crash                                     |
| 12 | **Snapshot cũ (version cũ)**      | `version !== 1` trong tương lai                                        | Bỏ qua snapshot lạ (không hiển thị), log warning                           |
| 13 | **Task data bị thiếu field**      | Task object không có `timeSpentSec` hoặc `comps`                      | `decompressTasks` gán giá trị mặc định (0, [])                             |
| 14 | **Tên snapshot trùng**            | User lưu 2 snapshot cùng tên                                           | Cho phép (ID dùng timestamp, không ảnh hưởng)                              |
| 15 | **Performance với 500+ tasks**    | Snapshot lớn, JSON.stringify/parse chậm                                | Compression giảm kích thước, chỉ lưu field cần thiết                       |
| 16 | **Ký tự đặc biệt trong tên**      | Tên snapshot chứa emoji, ký tự Unicode                                | Lưu nguyên vẹn (JSON.stringify hỗ trợ UTF-8)                              |
| 17 | **Reset dữ liệu không xóa history** | User click "Tải file khác" → `RESET` action                          | RESET không ảnh hưởng đến `historyPanelOpen`, snapshot trong localStorage  |
| 18 | **Multiple tabs**                 | Hai tab mở cùng lúc, lưu snapshot ở tab A, list ở tab B               | `listSnapshots()` đọc trực tiếp từ localStorage mỗi lần → không stale      |

---

## Phụ lục: Mẫu giao diện HistoryPanel (text wireframe)

```
┌─────────────────────────────────────┐
│  🕒 Lịch sử                    [×]  │  ← Header
├─────────────────────────────────────┤
│  ── Lưu snapshot ──                 │
│  [Tên snapshot..................]    │
│  [  Lưu snapshot  ]                 │
│  ▓▓▓▓▓▓▓▓░░░░░░  2.1 MB / 5 MB    │  ← Storage bar
│  ⚠ Đã dùng 4.7 MB (gần đầy)        │  ← Warning (nếu > 4.5 MB)
│                                     │
│  ── Danh sách ──                    │
│  🕒 Sprint 25 ... 142 tasks  [Khôi phục] [×] │
│  🕒 Sprint 24 ... 135 tasks  [Khôi phục] [×] │
│  🕒 2026-06-20 ... 98 tasks  [Khôi phục] [×] │
│                                     │
│  ── So sánh ──                      │
│  Snapshot A: [Dropdown ▼]           │
│  Snapshot B: [Dropdown ▼]           │
│  [  So sánh  ]                      │
└─────────────────────────────────────┘
```
