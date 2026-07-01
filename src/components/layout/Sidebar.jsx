import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  Tag,
  History,
  Bookmark,
  Calendar,
  Clock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

function SubItem({ icon: Icon, label, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </motion.button>
  );
}

export default function Sidebar() {
  const { state, dispatch } = useApp();
  const { sidebarCollapsed, activeSection, showWeeklyPlanner } = state;
  const [dashboardExpanded, setDashboardExpanded] = useState(true);

  const isDashboardActive = !showWeeklyPlanner && activeSection === 'dashboard';

  const toggleCollapse = () => {
    dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: !sidebarCollapsed });
  };

  const openOT = () => dispatch({ type: 'SET_OT_PANEL_OPEN', payload: true });
  const openLabels = () => dispatch({ type: 'SET_LABEL_PANEL_OPEN', payload: true });
  const openHistory = () => dispatch({ type: 'SET_HISTORY_PANEL_OPEN', payload: true });

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
        {/* Dashboard parent */}
        <motion.button
          onClick={() => {
            dispatch({ type: 'SET_ACTIVE_SECTION', payload: 'dashboard' });
            dispatch({ type: 'SET_DASHBOARD_TAB', payload: 'overview' });
            dispatch({ type: 'SET_SHOW_WEEKLY_PLANNER', payload: false });
            setDashboardExpanded(!dashboardExpanded);
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            isDashboardActive
              ? 'bg-[var(--accent-light)] text-[var(--accent)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
          } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
          title={sidebarCollapsed ? 'Dashboard' : undefined}
        >
          <LayoutDashboard className={`w-4 h-4 flex-shrink-0 ${isDashboardActive ? 'text-[var(--accent)]' : ''}`} />
          {!sidebarCollapsed && (
            <span className="truncate">Dashboard</span>
          )}
          {!sidebarCollapsed && (
            <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${dashboardExpanded ? 'rotate-180' : ''}`} />
          )}
          {isDashboardActive && !sidebarCollapsed && (
            <motion.div
              layoutId="activeIndicator"
              className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
        </motion.button>

        {/* Sub-items: OT, Labels, History */}
        <AnimatePresence>
          {dashboardExpanded && isDashboardActive && !sidebarCollapsed && (
            <motion.div
              key="dashboard-subitems"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden ml-4 space-y-0.5"
            >
              <SubItem icon={Clock} label="OT & Nghỉ phép" onClick={openOT} />
              <SubItem icon={Tag} label="Quản lý nhãn" onClick={openLabels} />
              <SubItem icon={History} label="Lịch sử" onClick={openHistory} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lên lịch tuần */}
        <motion.button
          onClick={() => {
            dispatch({ type: 'SET_ACTIVE_SECTION', payload: 'weekly-planner' });
            dispatch({ type: 'SET_SHOW_WEEKLY_PLANNER', payload: true });
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            activeSection === 'weekly-planner' && showWeeklyPlanner
              ? 'bg-[var(--accent-light)] text-[var(--accent)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
          } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
          title={sidebarCollapsed ? 'Lên lịch tuần' : undefined}
        >
          <Calendar className={`w-4 h-4 flex-shrink-0 ${activeSection === 'weekly-planner' && showWeeklyPlanner ? 'text-[var(--accent)]' : ''}`} />
          {!sidebarCollapsed && (
            <span className="truncate">Lên lịch tuần</span>
          )}
        </motion.button>

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

        {/* Bookmarklet */}
        <button
          onClick={() => dispatch({ type: 'SET_BOOKMARKLET_PANEL_OPEN', payload: true })}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            sidebarCollapsed ? 'justify-center px-0' : ''
          } text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]`}
          title={sidebarCollapsed ? 'Bookmarklet' : undefined}
        >
          <Bookmark className="w-4 h-4 flex-shrink-0" />
          {!sidebarCollapsed && (
            <span className="truncate">Bookmarklet</span>
          )}
        </button>
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
