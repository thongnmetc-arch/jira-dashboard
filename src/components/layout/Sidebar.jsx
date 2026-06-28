import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Table,
  Clock,
  ChevronLeft,
  ChevronRight,
  Wifi,
  FileText,
  BarChart3,
  CalendarRange,
  Download,
  Tag,
  History,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const navItems = [
  { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'data', label: 'Dữ liệu', icon: Table },
  { id: 'burndown', label: 'Burndown', icon: BarChart3 },
  { id: 'month-compare', label: 'So sánh tháng', icon: CalendarRange },
  { id: 'report', label: 'Báo cáo', icon: Download },
  { id: 'ot', label: 'OT & Nghỉ phép', icon: Clock },
];

export default function Sidebar() {
  const { state, dispatch } = useApp();
  const { sidebarCollapsed, activeSection } = state;

  const handleNavClick = (section, action) => {
    dispatch({ type: 'SET_ACTIVE_SECTION', payload: section });

    switch (action) {
      case 'scroll-top':
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'scroll-table':
        document.getElementById('data-table-section')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'open-ot':
        dispatch({ type: 'SET_OT_PANEL_OPEN', payload: true });
        break;
      case 'scroll-burndown':
        document.getElementById('burndown-section')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'scroll-month-compare':
        document.getElementById('month-comparison-section')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'scroll-report':
        document.getElementById('auto-report-section')?.scrollIntoView({ behavior: 'smooth' });
        break;
      default:
        break;
    }
  };

  const handleResetToConnect = () => {
    dispatch({ type: 'RESET' });
  };

  const toggleCollapse = () => {
    dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: !sidebarCollapsed });
  };

  return (
    <aside
      className={`flex flex-col h-full bg-[var(--bg-primary)] border-r border-[var(--border-primary)] transition-all duration-200 ease-out ${
        sidebarCollapsed ? 'w-14' : 'w-60'
      }`}
    >
      {/* Project name/logo */}
      <div className={`flex items-center h-12 border-b border-[var(--border-primary)] px-3 ${
        sidebarCollapsed ? 'justify-center' : 'justify-between'
      }`}>
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-[var(--accent)] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">J</span>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[var(--text-primary)] truncate leading-tight">
                JIRA Dash
              </div>
              <div className="text-[10px] text-[var(--text-tertiary)] leading-tight">v1.0.0</div>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="w-6 h-6 rounded-md bg-[var(--accent)] flex items-center justify-center">
            <span className="text-white text-xs font-bold">J</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => {
                const actionMap = {
                  dashboard: 'scroll-top',
                  data: 'scroll-table',
                  burndown: 'scroll-burndown',
                  'month-compare': 'scroll-month-compare',
                  report: 'scroll-report',
                  ot: 'open-ot',
                };
                handleNavClick(item.id, actionMap[item.id] || null);
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[var(--accent-light)] text-[var(--accent)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
              } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[var(--accent)]' : ''}`} />
              {!sidebarCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
              {isActive && !sidebarCollapsed && (
                <motion.div
                  layoutId="activeIndicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}

        {/* Import HTML */}
        <button
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.html,.htm';
            input.onchange = async (e) => {
              const file = e.target.files[0];
              if (!file) return;
              window.dispatchEvent(new CustomEvent('html-import-start'));
              try {
                const text = await file.text();
                const { parseJiraHtml } = await import('../../utils/htmlParser');
                const tasks = parseJiraHtml(text);
                if (tasks.length === 0) throw new Error('Không tìm thấy dữ liệu.');
                window.dispatchEvent(new CustomEvent('html-import-data', { detail: { tasks, fileName: file.name } }));
              } catch(err) {
                window.dispatchEvent(new CustomEvent('html-import-error', { detail: { message: err.message } }));
              }
            };
            input.click();
          }}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            sidebarCollapsed ? 'justify-center px-0' : ''
          } text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]`}
          title={sidebarCollapsed ? 'Import HTML' : undefined}
        >
          <FileText className="w-4 h-4 flex-shrink-0" />
          {!sidebarCollapsed && (
            <span className="truncate">Import HTML</span>
          )}
        </button>

        {/* Quản lý nhãn */}
        <button
          onClick={() => dispatch({ type: 'SET_LABEL_PANEL_OPEN', payload: true })}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            sidebarCollapsed ? 'justify-center px-0' : ''
          } text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]`}
          title={sidebarCollapsed ? 'Quản lý nhãn' : undefined}
        >
          <Tag className="w-4 h-4 flex-shrink-0" />
          {!sidebarCollapsed && (
            <span className="truncate">Quản lý nhãn</span>
          )}
        </button>

        {/* Lịch sử */}
        <button
          onClick={() => dispatch({ type: 'SET_HISTORY_PANEL_OPEN', payload: true })}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            sidebarCollapsed ? 'justify-center px-0' : ''
          } text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]`}
          title={sidebarCollapsed ? 'Lịch sử' : undefined}
        >
          <History className="w-4 h-4 flex-shrink-0" />
          {!sidebarCollapsed && (
            <span className="truncate">Lịch sử</span>
          )}
        </button>

        {/* Divider */}
        {!sidebarCollapsed && (
          <div className="my-2 border-t border-[var(--border-primary)]" />
        )}

        {/* Kết nối JIRA */}
        <motion.button
          onClick={handleResetToConnect}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            sidebarCollapsed ? 'justify-center px-0' : ''
          } text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]`}
          title={sidebarCollapsed ? 'Kết nối JIRA' : undefined}
        >
          <Wifi className="w-4 h-4 flex-shrink-0" />
          {!sidebarCollapsed && (
            <span className="truncate">Kết nối JIRA</span>
          )}
        </motion.button>
      </nav>

      {/* Collapse button */}
      <div className="border-t border-[var(--border-primary)] p-2">
        <button
          onClick={toggleCollapse}
          className="w-full flex items-center justify-center p-1.5 rounded-md text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
          title={sidebarCollapsed ? 'Mở rộng' : 'Thu gọn'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
