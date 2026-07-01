import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';
import AppShell from './components/layout/AppShell';
import JiraConnect from './components/JiraConnect';
import ProjectSelector from './components/ProjectSelector';
import QueryConfig from './components/QueryConfig';
import Dashboard from './components/Dashboard';
import WeeklyPlanner from './components/WeeklyPlanner';
import LoginScreen from './components/LoginScreen';
import { fetchJiraIssues } from './utils/jiraApi';

// ── Shared content component (used in both existing and wizard dashboard flows) ──

function AppContent({ jiraConfig: wizardConfig, selectedProject: wizardProject }) {
  const { state, dispatch } = useApp();
  const wizardInitRef = useRef(false);

  // Wizard dashboard initialization: seed context and load issues
  useEffect(() => {
    if (!wizardConfig || !wizardProject || wizardInitRef.current) return;
    wizardInitRef.current = true;

    const config = {
      url: wizardConfig.url,
      token: wizardConfig.token,
      projectKey: wizardProject,
      assignee: wizardConfig.assignee || '',
      jql: wizardConfig.jql || '',
    };

    dispatch({ type: 'SET_JIRA_CONFIG', payload: config });
    dispatch({ type: 'SET_JIRA_CONNECTED', payload: true });
    dispatch({ type: 'SET_DATA_SOURCE', payload: 'jira' });
    dispatch({ type: 'SET_SELECTED_PROJECT', payload: wizardProject });
    dispatch({ type: 'SET_LOADING', payload: true });

    (async () => {
      try {
        const tasks = await fetchJiraIssues(
          config.url,
          config.token,
          wizardProject,
          config.assignee,
          config.jql
        );

        if (tasks.length === 0) {
          dispatch({
            type: 'SET_ERROR',
            payload:
              'Không tìm thấy công việc nào trong project "' +
              wizardProject +
              '".',
          });
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }

        const activeTasks = tasks.filter((t) => {
          const s = t.status?.toLowerCase();
          return s === 'resolved' || s === 'closed';
        });
        const totalHr = activeTasks.reduce((s, t) => s + t.timeSpentHr, 0);
        const totalEst = activeTasks.reduce(
          (s, t) => s + (t.originalEstimateHr || t.estimateHr || 0),
          0
        );
        const stats = `${activeTasks.length} công việc · ${totalHr.toFixed(1)} giờ đã log · ${totalEst.toFixed(1)} giờ ước tính`;

        dispatch({
          type: 'SET_FILE_INFO',
          payload: { fileName: wizardProject, fileStats: stats },
        });
        dispatch({ type: 'SET_TASKS', payload: tasks });
        dispatch({ type: 'SET_OT_LEAVE', payload: { otTotal: 0, leaveTotal: 0 } });
        try {
          localStorage.removeItem('jira-dash-ot-leave');
        } catch (e) {}
        dispatch({ type: 'SET_JQL_USED', payload: '' });
        dispatch({ type: 'SET_LAST_REFRESH_TIME', payload: new Date().toISOString() });
      } catch (err) {
        dispatch({
          type: 'SET_ERROR',
          payload: err.message || 'Không thể tải dữ liệu từ JIRA.',
        });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
            const tasks = data.tasks.map((t) => ({
              ...t,
              created: t.created ? new Date(t.created) : null,
              resolved: t.resolved ? new Date(t.resolved) : null,
              startDate: t.startDate ? new Date(t.startDate) : null,
            }));

            try {
              localStorage.setItem('jira-dash-data', JSON.stringify(data));
            } catch (e) {}

            dispatch({ type: 'SET_TASKS', payload: tasks });
            dispatch({ type: 'SET_OT_LEAVE', payload: { otTotal: 0, leaveTotal: 0 } });
            try {
              localStorage.removeItem('jira-dash-ot-leave');
            } catch (e) {}
            dispatch({ type: 'SET_DATA_SOURCE', payload: 'jira-bookmarklet' });
            if (data.jql) {
              dispatch({ type: 'SET_JQL_USED', payload: data.jql });
            }

            window.history.replaceState(null, '', window.location.pathname);
          }
        } catch (e) {
          console.error('Lỗi đọc dữ liệu JIRA từ URL:', e);
        }
      }
    };

    readHash();
    window.addEventListener('hashchange', readHash);
    return () => window.removeEventListener('hashchange', readHash);
  }, [dispatch]);

  // Listen for HTML import events from sidebar
  useEffect(() => {
    const handleStart = () => dispatch({ type: 'SET_LOADING', payload: true });
    const handleData = (e) => {
      const tasks = e.detail.tasks;
      const totalHr = tasks.reduce((s, t) => s + t.estimateHr, 0);
      dispatch({
        type: 'SET_FILE_INFO',
        payload: {
          fileName: e.detail.fileName,
          fileStats:
            tasks.length +
            ' công việc · ' +
            totalHr.toFixed(1) +
            ' giờ ước tính',
        },
      });
      dispatch({ type: 'SET_TASKS', payload: tasks });
      dispatch({ type: 'SET_OT_LEAVE', payload: { otTotal: 0, leaveTotal: 0 } });
      try {
        localStorage.removeItem('jira-dash-ot-leave');
      } catch (e) {}
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
          <p className="text-sm text-[var(--text-secondary)]">
            {wizardConfig
              ? 'Đang tải dữ liệu từ JIRA...'
              : 'Đang xử lý dữ liệu...'}
          </p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {!state.isLoaded && !state.loading ? (
          <div key="connect" className="py-6 md:py-10">
            <JiraConnect />
          </div>
        ) : state.isLoaded ? (
          state.showWeeklyPlanner ? (
            <WeeklyPlanner key="weekly-planner" />
          ) : (
            <Dashboard key="dashboard" />
          )
        ) : null}
      </AnimatePresence>
    </AppShell>
  );
}

// ── Wizard dashboard initializer ────────────────────────────────────────────

function WizardDashboard({ jiraConfig, selectedProject, onChangeProject }) {
  return (
    <AppProvider onChangeProject={onChangeProject}>
      <AppContent jiraConfig={jiraConfig} selectedProject={selectedProject} />
    </AppProvider>
  );
}

// ── Wizard steps renderer ───────────────────────────────────────────────────

function WizardSteps({ step, jiraConfig, setJiraConfig, setStep, selectedProject, setSelectedProject, queryConfig, setQueryConfig, onChangeProject }) {
  return (
    <AppProvider onChangeProject={onChangeProject}>
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {step === 'connect' && (
              <motion.div
                key="wizard-connect"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <JiraConnect
                  mode="wizard"
                  onConnected={(config) => {
                    setJiraConfig(config);
                    setStep('project');
                  }}
                  onBack={() => setStep('login')}
                />
              </motion.div>
            )}
            {step === 'project' && (
              <motion.div
                key="wizard-project"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ProjectSelector
                  jiraConfig={jiraConfig}
                  onSelect={(key) => {
                    setSelectedProject(key);
                    setStep('query');
                  }}
                  onBack={() => setStep('connect')}
                />
              </motion.div>
            )}
            {step === 'reselect-project' && (
              <motion.div
                key="wizard-reselect-project"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ProjectSelector
                  key="reselect"
                  jiraConfig={jiraConfig}
                  onSelect={(key) => {
                    setSelectedProject(key);
                    setStep('query');
                  }}
                  reselect
                />
              </motion.div>
            )}
            {step === 'query' && (
              <motion.div
                key="wizard-query"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <QueryConfig
                  jiraConfig={jiraConfig}
                  selectedProject={selectedProject}
                  onStart={(config) => {
                    setQueryConfig(config);
                    setStep('dashboard');
                  }}
                  onBack={() => setStep('project')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppProvider>
  );
}

// ── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [step, setStep] = useState('login');
  const [jiraConfig, setJiraConfig] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [queryConfig, setQueryConfig] = useState(null);

  const handleChangeProject = () => {
    setStep('reselect-project');
  };

  // Login screen
  if (step === 'login') {
    return <LoginScreen onUnlock={() => setStep('connect')} />;
  }

  // Wizard steps 2-4 (connect + project + query) and reselect-project
  if (step === 'connect' || step === 'project' || step === 'query' || step === 'reselect-project') {
    return (
      <WizardSteps
        step={step}
        jiraConfig={jiraConfig}
        setJiraConfig={setJiraConfig}
        setStep={setStep}
        selectedProject={selectedProject}
        setSelectedProject={setSelectedProject}
        queryConfig={queryConfig}
        setQueryConfig={setQueryConfig}
        onChangeProject={handleChangeProject}
      />
    );
  }

  // Dashboard step (step 4+5)
  const mergedConfig = {
    ...jiraConfig,
    email: queryConfig?.email || '',
    assignee: queryConfig?.email || '',
    jql: queryConfig?.jql || '',
  };

  return (
    <WizardDashboard
      jiraConfig={mergedConfig}
      selectedProject={selectedProject}
      onChangeProject={handleChangeProject}
    />
  );
}
