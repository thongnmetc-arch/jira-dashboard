import { Sun, Moon, Menu, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';

const sectionNames = {
  dashboard: 'Tổng quan',
  data: 'Dữ liệu',
  burndown: 'Burndown',
  'month-compare': 'So sánh tháng',
  report: 'Báo cáo',
  ot: 'OT & Nghỉ phép',
  history: 'Lịch sử',
  labels: 'Quản lý nhãn',
  export: 'Xuất báo cáo',
  settings: 'Cài đặt',
};

export default function TopBar({ onToggleMobile }) {
  const { state, dispatch } = useApp();

  const toggleTheme = () => {
    dispatch({ type: 'SET_DARK_MODE', payload: !state.darkMode });
  };

  const handleSourceClick = () => {
    if (state.isLoaded) {
      dispatch({ type: 'RESET' });
    }
  };

  return (
    <header className="h-12 flex items-center justify-between px-4 bg-[var(--bg-primary)] border-b border-[var(--border-primary)]">
      {/* Left: mobile menu + breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleMobile}
          className="md:hidden p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
          aria-label="Mở menu"
        >
          <Menu className="w-4 h-4" />
        </button>
        <nav className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">Dashboard</span>
          {state.activeSection !== 'dashboard' && (
            <>
              <span className="text-[var(--text-tertiary)]">/</span>
              <span className="text-[var(--text-secondary)]">
                {sectionNames[state.activeSection] || 'Tổng quan'}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Right: connection badge + theme toggle */}
      <div className="flex items-center gap-2">
        {/* Connection status badge */}
        {state.isLoaded && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleSourceClick}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[0.65rem] font-medium transition-colors cursor-pointer hover:bg-[var(--bg-secondary)]"
            title="Nhấn để quay lại màn hình kết nối"
          >
            {state.dataSource === 'jira' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
                <span className="text-[var(--success)]">JIRA: {state.jiraConfig.projectKey}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-[var(--text-tertiary)]" />
                <span className="text-[var(--text-tertiary)]">
                  {state.fileName || 'File'}
                </span>
              </>
            )}
          </motion.button>
        )}

        <span className="hidden sm:inline text-xs font-medium text-[var(--text-tertiary)] mr-1">
          JIRA Dashboard
        </span>
        <motion.button
          onClick={toggleTheme}
          whileTap={{ scale: 0.9 }}
          className="p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
          aria-label="Đổi giao diện sáng/tối"
        >
          <motion.div
            key={state.darkMode ? 'moon' : 'sun'}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {state.darkMode ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </motion.div>
        </motion.button>

        {/* Separator */}
        <span className="w-px h-5 bg-[var(--border-primary)]" />

        {/* Logout button */}
        <button
          onClick={() => {
            localStorage.removeItem('jira-dash-auth');
            window.location.reload();
          }}
          className="p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
          title="Đăng xuất"
          aria-label="Đăng xuất"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
