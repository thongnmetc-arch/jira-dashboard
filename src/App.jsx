import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';
import AppShell from './components/layout/AppShell';
import JiraConnect from './components/JiraConnect';
import Dashboard from './components/Dashboard';

function AppContent() {
  const { state, dispatch } = useApp();

  // Read JIRA data from URL hash (cross-origin transfer from bookmarklet)
  useEffect(() => {
    const readHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#jira-data=')) {
        try {
          const encoded = hash.replace('#jira-data=', '');
          const json = decodeURIComponent(escape(atob(encoded)));
          const data = JSON.parse(json);
          
          if (data.tasks && data.tasks.length > 0) {
            const tasks = data.tasks.map(t => ({
              ...t,
              created: t.created ? new Date(t.created) : null,
              resolved: t.resolved ? new Date(t.resolved) : null,
              startDate: t.startDate ? new Date(t.startDate) : null,
            }));
            
            // Save to localStorage for persistence
            try {
              localStorage.setItem('jira-dash-data', JSON.stringify(data));
            } catch(e) {}
            
            dispatch({ type: 'SET_TASKS', payload: tasks });
            dispatch({ type: 'SET_OT_LEAVE', payload: { otTotal: 0, leaveTotal: 0 } });
            try { localStorage.removeItem('jira-dash-ot-leave'); } catch(e) {}
            dispatch({ type: 'SET_DATA_SOURCE', payload: 'jira-bookmarklet' });
            if (data.jql) {
              dispatch({ type: 'SET_JQL_USED', payload: data.jql });
            }
            
            // Clean URL
            window.history.replaceState(null, '', window.location.pathname);
          }
        } catch(e) {
          console.error('Lỗi đọc dữ liệu JIRA từ URL:', e);
        }
      }
    };
    
    // Read on mount
    readHash();
    
    // Listen for hash changes (bookmarklet updates existing tab)
    window.addEventListener('hashchange', readHash);
    
    return () => window.removeEventListener('hashchange', readHash);
  }, [dispatch]);

  // Listen for HTML import events from sidebar
  useEffect(() => {
    const handleStart = () => dispatch({ type: 'SET_LOADING', payload: true });
    const handleData = (e) => {
      const tasks = e.detail.tasks;
      const totalHr = tasks.reduce((s, t) => s + t.estimateHr, 0);
      dispatch({ type: 'SET_FILE_INFO', payload: { fileName: e.detail.fileName, fileStats: tasks.length + ' công việc · ' + totalHr.toFixed(1) + ' giờ ước tính' } });
      dispatch({ type: 'SET_TASKS', payload: tasks });
      dispatch({ type: 'SET_OT_LEAVE', payload: { otTotal: 0, leaveTotal: 0 } });
      try { localStorage.removeItem('jira-dash-ot-leave'); } catch(e) {}
      dispatch({ type: 'SET_JQL_USED', payload: '' });
      dispatch({ type: 'SET_DATA_SOURCE', payload: 'html' });
      dispatch({ type: 'SET_LOADED', payload: true });
      dispatch({ type: 'SET_LOADING', payload: false });
    };
    const handleError = (e) => {
      dispatch({ type: 'SET_ERROR', payload: 'Lỗi: ' + e.detail.message });
      dispatch({ type: 'SET_LOADING', payload: false });
    };

    window.addEventListener('html-import-start', handleStart);
    window.addEventListener('html-import-data', handleData);
    window.addEventListener('html-import-error', handleError);
    return () => {
      window.removeEventListener('html-import-start', handleStart);
      window.removeEventListener('html-import-data', handleData);
      window.removeEventListener('html-import-error', handleError);
    };
  }, [dispatch]);

  return (
    <AppShell>
      {/* Error message */}
      {state.error && (
        <div className="p-3.5 mb-5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 text-sm leading-relaxed">
          {state.error}
        </div>
      )}

      {/* Loading */}
      {state.loading && (
        <div className="text-center py-16">
          <div className="w-9 h-9 border-4 border-[var(--border-secondary)] border-t-[var(--accent)] rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-[var(--text-secondary)]">Đang xử lý dữ liệu...</p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {!state.isLoaded && !state.loading ? (
          <div key="connect" className="py-6 md:py-10">
            <JiraConnect />
          </div>
        ) : state.isLoaded ? (
          <Dashboard key="dashboard" />
        ) : null}
      </AnimatePresence>
    </AppShell>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
