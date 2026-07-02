import { useEffect, useRef, useCallback } from 'react';
import { Routes, Route, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
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
          <Dashboard key="dashboard" />
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

// ── Route components ────────────────────────────────────────────────────────

/** Route: /login — Login screen */
function LoginRoute() {
  const navigate = useNavigate();
  return <LoginScreen onUnlock={() => navigate('/connect')} />;
}

/** Route: /connect — JIRA connection wizard step */
function ConnectRoute() {
  const navigate = useNavigate();
  const { dispatch } = useApp();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <JiraConnect
          mode="wizard"
          onConnected={(config) => {
            dispatch({ type: 'SET_WIZARD_JIRA_CONFIG', payload: config });
            navigate('/projects');
          }}
          onBack={() => navigate('/')}
        />
      </div>
    </div>
  );
}

/** Route: /projects (and /projects?reselect=true) — Project selection wizard step */
function ProjectsRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, dispatch } = useApp();
  const reselect = searchParams.get('reselect') === 'true';

  if (!state.wizardJiraConfig) {
    return <Navigate to="/connect" replace />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <ProjectSelector
          jiraConfig={state.wizardJiraConfig}
          onSelect={(key) => {
            dispatch({ type: 'SET_WIZARD_PROJECT', payload: key });
            navigate('/query');
          }}
          onBack={reselect ? undefined : () => navigate('/connect')}
          reselect={reselect}
        />
      </div>
    </div>
  );
}

/** Route: /query — Query configuration wizard step */
function QueryRoute() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();

  if (!state.wizardJiraConfig || !state.wizardSelectedProject) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <QueryConfig
          jiraConfig={state.wizardJiraConfig}
          selectedProject={state.wizardSelectedProject}
          onStart={(config) => {
            dispatch({ type: 'SET_WIZARD_QUERY_CONFIG', payload: config });
            navigate('/dashboard');
          }}
          onBack={() => navigate('/projects')}
        />
      </div>
    </div>
  );
}

/** Route: /dashboard (/dashboard/:tab) — Main dashboard view */
function DashboardRoute() {
  const navigate = useNavigate();
  const { state } = useApp();

  const handleChangeProject = useCallback(() => {
    navigate('/projects?reselect=true');
  }, [navigate]);

  if (!state.wizardJiraConfig || !state.wizardSelectedProject) {
    return <Navigate to="/" replace />;
  }

  const mergedConfig = {
    ...state.wizardJiraConfig,
    email: state.wizardQueryConfig?.email || '',
    assignee: state.wizardQueryConfig?.email || '',
    jql: state.wizardQueryConfig?.jql || '',
  };

  return (
    <WizardDashboard
      jiraConfig={mergedConfig}
      selectedProject={state.wizardSelectedProject}
      onChangeProject={handleChangeProject}
    />
  );
}

/** Route: /weekly-planner — Weekly planner view */
function WeeklyPlannerRoute() {
  const navigate = useNavigate();

  const handleChangeProject = useCallback(() => {
    navigate('/projects?reselect=true');
  }, [navigate]);

  return (
    <AppProvider onChangeProject={handleChangeProject}>
      <AppShell>
        <WeeklyPlanner />
      </AppShell>
    </AppProvider>
  );
}

// ── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/connect" element={<ConnectRoute />} />
        <Route path="/projects" element={<ProjectsRoute />} />
        <Route path="/query" element={<QueryRoute />} />
        <Route path="/dashboard" element={<DashboardRoute />} />
        <Route path="/dashboard/:tab" element={<DashboardRoute />} />
        <Route path="/weekly-planner" element={<WeeklyPlannerRoute />} />
      </Routes>
    </AppProvider>
  );
}
