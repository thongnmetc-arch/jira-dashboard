import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Menu, LogOut, RefreshCw, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n';

function AutoRefreshDropdown() {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const options = [
    { value: 'off', label: 'Tắt' },
    { value: '5', label: '5 phút' },
    { value: '15', label: '15 phút' },
    { value: '30', label: '30 phút' },
    { value: '60', label: '1 giờ' },
  ];

  const selected = options.find(o => o.value === state.globalAutoRefresh);
  const hasValue = state.globalAutoRefresh !== 'off';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 h-7 px-2 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
          hasValue
            ? 'border-[var(--accent)]/40 bg-[var(--accent-light)] text-[var(--accent)]'
            : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
        }`}
        title="Đồng bộ tự động"
      >
        <RefreshCw className="w-3 h-3" />
        <span className="max-w-[60px] truncate">{selected?.label || 'Tắt'}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 z-50 w-36 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-xl py-1">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { dispatch({ type: 'SET_GLOBAL_AUTO_REFRESH', payload: opt.value }); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-[var(--bg-secondary)] cursor-pointer ${
                state.globalAutoRefresh === opt.value
                  ? 'text-[var(--accent)] font-medium bg-[var(--accent-light)]'
                  : 'text-[var(--text-primary)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TopBar({ onToggleMobile }) {
  const { state, dispatch } = useApp();
  const { t, lang, toggleLanguage } = useI18n();
  const navigate = useNavigate();

  const sectionNames = {
    dashboard: t('sidebar.overview'),
    data: t('sidebar.data'),
    burndown: t('sidebar.burndown'),
    'month-compare': t('sidebar.monthCompare'),
    report: t('sidebar.report'),
    ot: t('sidebar.ot'),
    history: t('sidebar.history'),
    labels: t('sidebar.labels'),
    export: 'Xuất báo cáo',
    settings: 'Cài đặt',
  };

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
          aria-label={t('common.openMenu')}
        >
          <Menu className="w-4 h-4" />
        </button>
        <nav className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">Dashboard</span>
          {state.activeSection !== 'dashboard' && (
            <>
              <span className="text-[var(--text-tertiary)]">/</span>
              <span className="text-[var(--text-secondary)]">
                {sectionNames[state.activeSection] || t('sidebar.overview')}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Right: connection badge + theme toggle + lang toggle */}
      <div className="flex items-center gap-2">
        {/* Connection status badge */}
        {state.isLoaded && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleSourceClick}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[0.65rem] font-medium transition-colors cursor-pointer hover:bg-[var(--bg-secondary)]"
            title={t('connect.reConnect')}
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
                  {state.fileName || t('common.file')}
                </span>
              </>
            )}
          </motion.button>
        )}

        <span className="hidden sm:inline text-xs font-medium text-[var(--text-tertiary)] mr-1">
          {t('dashboard.title')}
        </span>

        {/* Language toggle */}
        <motion.button
          onClick={toggleLanguage}
          whileTap={{ scale: 0.9 }}
          className="p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
          aria-label={t('lang.switch')}
          title={lang === 'vi' ? 'English' : 'Tiếng Việt'}
        >
          {lang === 'vi' ? <svg viewBox="0 0 20 14" className="w-5 h-5"><rect width="20" height="14" fill="#DA251D"/><polygon points="10,2 11.5,6 16,6 12.5,8.5 14,12.5 10,10 6,12.5 7.5,8.5 4,6 8.5,6" fill="#FFCD01"/></svg> : <svg viewBox="0 0 20 14" className="w-5 h-5"><rect width="20" height="14" fill="#012169"/><path d="M0 0l8 5.5M20 0l-8 5.5M0 14l8-5.5M20 14l-8-5.5" stroke="white" strokeWidth="2"/><path d="M10 0v14M0 7h20" stroke="white" strokeWidth="3.5"/><path d="M10 0v14M0 7h20" stroke="#C8102E" strokeWidth="1.5"/></svg>}
        </motion.button>

        {/* Auto-refresh dropdown — only when connected to JIRA */}
        {state.jiraConfig?.url && state.jiraConfig?.token && (
          <AutoRefreshDropdown />
        )}

        <motion.button
          onClick={toggleTheme}
          whileTap={{ scale: 0.9 }}
          className="p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
          aria-label={t('common.toggleTheme')}
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
            navigate('/login');
          }}
          className="p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--danger)] transition-colors cursor-pointer"
          title={t('common.logout')}
          aria-label={t('common.logout')}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
