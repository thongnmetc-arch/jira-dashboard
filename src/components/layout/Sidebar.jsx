import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  History,
  Bookmark,
  Calendar,
  Clock,
  Table,
  BarChart3,
  CalendarRange,
  PlusCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n';

function SubItem({ icon: Icon, label, onClick, isActive }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
        isActive
          ? 'bg-[var(--accent-light)] text-[var(--accent)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-[var(--accent)]' : ''}`} />
      <span className="truncate">{label}</span>
    </motion.button>
  );
}

export default function Sidebar() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const { sidebarCollapsed, activeSection, dashboardTab } = state;
  const [dashboardExpanded, setDashboardExpanded] = useState(true);
  const [weeklyExpanded, setWeeklyExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith('/work-plan')) {
      setWeeklyExpanded(true);
    }
  }, [location.pathname]);

  const isDashboardActive = activeSection === 'dashboard' && !location.pathname.startsWith('/work-plan');
  const isWeeklyPlanner = location.pathname.startsWith('/work-plan');

  const toggleCollapse = () => {
    dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: !sidebarCollapsed });
  };

  // Tab navigation for OT, Labels, History — now inline tabs, not drawers

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
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
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
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center">
            <BarChart3 className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {/* Dashboard parent */}
        <motion.button
          onClick={() => {
            navigate('/dashboard/overview');
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

        {/* Sub-items: tabs + tools */}
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
              {/* Dashboard tab navigation */}
              <SubItem icon={LayoutDashboard} label={t('tabs.overview')} isActive={dashboardTab === 'overview'} onClick={() => { navigate('/dashboard/overview'); dispatch({ type: 'SET_DASHBOARD_TAB', payload: 'overview' }); }} />
              <SubItem icon={BarChart3} label={t('tabs.charts')} isActive={dashboardTab === 'charts'} onClick={() => { navigate('/dashboard/charts'); dispatch({ type: 'SET_DASHBOARD_TAB', payload: 'charts' }); }} />
              <SubItem icon={Table} label={t('tabs.data')} isActive={dashboardTab === 'data'} onClick={() => { navigate('/dashboard/data'); dispatch({ type: 'SET_DASHBOARD_TAB', payload: 'data' }); }} />
              <SubItem icon={CalendarRange} label={t('tabs.gantt')} isActive={dashboardTab === 'gantt'} onClick={() => { navigate('/dashboard/gantt'); dispatch({ type: 'SET_DASHBOARD_TAB', payload: 'gantt' }); }} />
              <SubItem icon={BarChart3} label={t('tabs.compare')} isActive={dashboardTab === 'compare'} onClick={() => { navigate('/dashboard/compare'); dispatch({ type: 'SET_DASHBOARD_TAB', payload: 'compare' }); }} />
              <SubItem icon={Clock} label={t('tabs.ot')} isActive={dashboardTab === 'ot'} onClick={() => { navigate('/dashboard/ot'); dispatch({ type: 'SET_DASHBOARD_TAB', payload: 'ot' }); }} />
              <SubItem icon={History} label={t('tabs.history')} isActive={dashboardTab === 'history'} onClick={() => { navigate('/dashboard/history'); dispatch({ type: 'SET_DASHBOARD_TAB', payload: 'history' }); }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Weekly Planner parent */}
        <motion.button
          onClick={() => {
            navigate('/work-plan/weekly');
            setWeeklyExpanded(!weeklyExpanded);
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            isWeeklyPlanner
              ? 'bg-[var(--accent-light)] text-[var(--accent)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
          } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
          title={sidebarCollapsed ? t('sidebar.weeklyPlanner') : undefined}
        >
          <Calendar className={`w-4 h-4 flex-shrink-0 ${isWeeklyPlanner ? 'text-[var(--accent)]' : ''}`} />
          {!sidebarCollapsed && (
            <>
              <span className="truncate flex-1 text-left">{t('sidebar.weeklyPlanner')}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${weeklyExpanded ? 'rotate-180' : ''}`} />
            </>
          )}
        </motion.button>

        {/* Weekly Planner sub-items */}
          {!sidebarCollapsed && weeklyExpanded && (
          <div className="ml-5 space-y-0.5 mb-1">
            <SubItem icon={Calendar} label={t('sidebar.weeklyTasks')} isActive={isWeeklyPlanner && location.pathname === '/work-plan/weekly'}
              onClick={() => navigate('/work-plan/weekly')} />
            <SubItem icon={PlusCircle} label={t('sidebar.createTask')} isActive={isWeeklyPlanner && location.pathname === '/work-plan/create'}
              onClick={() => navigate('/work-plan/create')} />
          </div>
        )}

        {/* Bookmarklet */}
        <button
          onClick={() => dispatch({ type: 'SET_BOOKMARKLET_PANEL_OPEN', payload: true })}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            sidebarCollapsed ? 'justify-center px-0' : ''
          } text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]`}
          title={sidebarCollapsed ? t('sidebar.bookmarklet') : undefined}
        >
          <Bookmark className="w-4 h-4 flex-shrink-0" />
          {!sidebarCollapsed && (
            <span className="truncate">{t('sidebar.bookmarklet')}</span>
          )}
        </button>
      </nav>

      {/* Collapse button */}
      <div className="border-t border-[var(--border-primary)] p-2">
        <button
          onClick={toggleCollapse}
          className="w-full flex items-center justify-center p-1.5 rounded-md text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
          title={sidebarCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
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
