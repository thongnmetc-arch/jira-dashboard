import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { syncTaskLabels, runAutoRules } from '../utils/labelUtils';

const AppContext = createContext();

const initialState = {
  allTasks: [],
  filters: { sprint: '', component: '', assignee: '', dateFrom: '', dateTo: '', labels: [] },
  otLeaveData: { otTotal: 0, leaveTotal: 0 },
  isLoaded: false,
  error: null,
  loading: false,
  fileName: '',
  fileStats: '',
  tableVisible: true,
  tableSortCol: 'timeSpentHr',
  tableSortDir: 'desc',
  tablePage: 1,
  tableSearchTerm: '',
  darkMode: false,
  // Layout state
  sidebarCollapsed: false,
  activeSection: 'dashboard',
  mobileOpen: false,
  otPanelOpen: false,
  // Label Manager state
  labelDefs: {},
  labelAssignments: {},
  autoRules: [],
  // History Manager state
  historyPanelOpen: false,

  // JIRA connection state
  jiraConfig: { url: '', token: '', projectKey: '', assignee: '', jql: '' },
  jiraConnected: false,
  dataSource: '', // '' | 'csv' | 'jira'
  jiraAutoRefresh: 'off', // 'off' | '5' | '15' | '30' | '60'
  globalAutoRefresh: 'off', // 'off' | '5' | '15' | '30' | '60'
  lastRefreshTime: null,
  jqlUsed: '',
  // Electron environment
  isElectron: !!window.electronAPI?.isElectron,
  // Bulk selection state
  selectedTasks: [],
  // Wizard / selected project
  selectedProject: '',
  // Dashboard tab navigation
  dashboardTab: 'overview',
  // History compare snapshots (for CompareView in compare tab)
  compareSnapshots: null,
  // Wizard routing state (set during connect → project → query → dashboard flow)
  wizardJiraConfig: null,
  wizardSelectedProject: '',
  wizardQueryConfig: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_TASKS': {
      const tasks = action.payload.filter(t => t.status?.toLowerCase() !== 'cancelled');
      // Sync labels from existing assignments and run auto-rules
      syncTaskLabels(tasks, state.labelAssignments);
      const autoAssignments = runAutoRules(state.autoRules || [], tasks);
      if (autoAssignments.size > 0) {
        const merged = { ...state.labelAssignments };
        for (const [key, ids] of autoAssignments) {
          const existing = merged[key] || [];
          const combined = [...new Set([...existing, ...ids])];
          merged[key] = combined;
        }
        syncTaskLabels(tasks, merged);
        return { ...state, allTasks: tasks, isLoaded: true, loading: false, error: null, labelAssignments: merged };
      }
      return { ...state, allTasks: tasks, isLoaded: true, loading: false, error: null };
    }
    case 'SET_FILTERS':
      return { ...state, filters: action.payload };
    case 'SET_OT_LEAVE':
      return { ...state, otLeaveData: action.payload };
    case 'SET_FILE_INFO':
      return { ...state, fileName: action.payload.fileName, fileStats: action.payload.fileStats };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'RESET':
      return {
        ...initialState,
        darkMode: state.darkMode,
        otLeaveData: state.otLeaveData,
        sidebarCollapsed: state.sidebarCollapsed,
        activeSection: state.activeSection,
        mobileOpen: state.mobileOpen,
        otPanelOpen: false,
        jiraConfig: state.jiraConfig,
        // Preserve label state across RESET
        labelDefs: state.labelDefs,
        labelAssignments: state.labelAssignments,
        autoRules: state.autoRules,
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_TABLE_SORT':
      return { ...state, tableSortCol: action.payload.col, tableSortDir: action.payload.dir };
    case 'SET_TABLE_PAGE':
      return { ...state, tablePage: action.payload };
    case 'SET_TABLE_SEARCH':
      return { ...state, tableSearchTerm: action.payload, tablePage: 1 };
    case 'SET_DARK_MODE':
      return { ...state, darkMode: action.payload };
    // Layout actions
    case 'SET_SIDEBAR_COLLAPSED':
      return { ...state, sidebarCollapsed: action.payload };
    case 'SET_MOBILE_OPEN':
      return { ...state, mobileOpen: action.payload };
    // JIRA connection actions
    case 'SET_JIRA_CONFIG':
      return { ...state, jiraConfig: action.payload };
    case 'SET_JIRA_CONNECTED':
      return { ...state, jiraConnected: action.payload };
    case 'SET_SELECTED_PROJECT':
      return { ...state, selectedProject: action.payload };
    case 'SET_DATA_SOURCE':
      return { ...state, dataSource: action.payload };
    case 'SET_GLOBAL_AUTO_REFRESH':
      return { ...state, globalAutoRefresh: action.payload };
    case 'SET_LAST_REFRESH_TIME':
      return { ...state, lastRefreshTime: action.payload };
    case 'SET_JQL_USED':
      return { ...state, jqlUsed: action.payload };
    case 'SET_SELECTED_TASKS':
      return { ...state, selectedTasks: action.payload };
    case 'TOGGLE_TASK_SELECTION': {
      const key = action.payload;
      const exists = state.selectedTasks.includes(key);
      return {
        ...state,
        selectedTasks: exists
          ? state.selectedTasks.filter(k => k !== key)
          : [...state.selectedTasks, key],
      };
    }
    case 'BULK_UPDATE_STATUS': {
      const { keys, status } = action.payload;
      return {
        ...state,
        allTasks: state.allTasks.map(t =>
          keys.includes(t.key) ? { ...t, status } : t
        ),
        selectedTasks: [],
      };
    }
    // === Label Manager cases ===
    case 'ASSIGN_LABEL': {
      const { taskKey, labelId } = action.payload;
      const current = state.labelAssignments[taskKey] || [];
      if (current.includes(labelId)) return state;
      return {
        ...state,
        labelAssignments: {
          ...state.labelAssignments,
          [taskKey]: [...current, labelId],
        },
        allTasks: state.allTasks.map(t =>
          t.key === taskKey
            ? { ...t, labels: [...new Set([...(t.labels || []), labelId])] }
            : t
        ),
      };
    }
    case 'REMOVE_LABEL': {
      const { taskKey, labelId } = action.payload;
      const current = state.labelAssignments[taskKey] || [];
      const updated = current.filter(id => id !== labelId);
      if (current.length === updated.length) return state;
      return {
        ...state,
        labelAssignments: {
          ...state.labelAssignments,
          [taskKey]: updated,
        },
        allTasks: state.allTasks.map(t =>
          t.key === taskKey
            ? { ...t, labels: (t.labels || []).filter(l => l !== labelId) }
            : t
        ),
      };
    }
    case 'BULK_ASSIGN_LABELS': {
      const { taskKeys, labelId } = action.payload;
      const newAssignments = { ...state.labelAssignments };
      for (const key of taskKeys) {
        const current = newAssignments[key] || [];
        if (!current.includes(labelId)) {
          newAssignments[key] = [...current, labelId];
        }
      }
      return {
        ...state,
        labelAssignments: newAssignments,
        allTasks: state.allTasks.map(t =>
          taskKeys.includes(t.key)
            ? { ...t, labels: [...new Set([...(t.labels || []), labelId])] }
            : t
        ),
      };
    }
    case 'BULK_REMOVE_LABELS': {
      const { taskKeys, labelId } = action.payload;
      const newAssignments = { ...state.labelAssignments };
      for (const key of taskKeys) {
        const current = newAssignments[key] || [];
        newAssignments[key] = current.filter(id => id !== labelId);
      }
      return {
        ...state,
        labelAssignments: newAssignments,
        allTasks: state.allTasks.map(t =>
          taskKeys.includes(t.key)
            ? { ...t, labels: (t.labels || []).filter(l => l !== labelId) }
            : t
        ),
      };
    }
    // === History Manager cases ===
    case 'RESTORE_SNAPSHOT': {
      const { tasks, name, fileName, otLeaveData, labelDefs, labelAssignments } = action.payload;
      return {
        ...state,
        allTasks: tasks,
        isLoaded: true,
        loading: false,
        fileName: `\uD83D\uDD52 ${name}`,
        fileStats: `${tasks.length} công việc (khôi phục từ lịch sử)`,
        dataSource: 'history',
        tablePage: 1,
        selectedTasks: [],
        filters: { sprint: '', component: '', assignee: '', dateFrom: '', dateTo: '', labels: [] },
        otLeaveData: otLeaveData || { otTotal: 0, leaveTotal: 0 },
        labelDefs: labelDefs || {},
        labelAssignments: labelAssignments || {},
        historyPanelOpen: false,
      };
    }
    case 'SET_DASHBOARD_TAB':
      return { ...state, dashboardTab: action.payload };
    case 'SET_WIZARD_JIRA_CONFIG':
      return { ...state, wizardJiraConfig: action.payload };
    case 'SET_WIZARD_PROJECT':
      return { ...state, wizardSelectedProject: action.payload };
    case 'SET_WIZARD_QUERY_CONFIG':
      return { ...state, wizardQueryConfig: action.payload };
    default:
      return state;
  }
}

export function AppProvider({ children, onChangeProject }) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    // Load persisted state
    let darkMode = false;
    let otLeaveData = { otTotal: 0, leaveTotal: 0 };
    let jiraConfig = { url: '', token: '', projectKey: '', assignee: '' };
    let labelDefs = {};
    let labelAssignments = {};
    let autoRules = [];
    try {
      const savedTheme = localStorage.getItem('jira-dash-theme');
      if (savedTheme) {
        darkMode = savedTheme === 'dark';
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        darkMode = true;
      }
      const saved = localStorage.getItem('jira-dash-ot-leave');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          otLeaveData = {
            otTotal: parsed.otTotal || 0,
            leaveTotal: parsed.leaveTotal || 0,
          };
        } catch(e) {}
      }
      const savedConfig = localStorage.getItem('jira-dash-config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        jiraConfig = { url: '', token: '', projectKey: '', jql: '', ...parsed };
      }
      const savedLabels = localStorage.getItem('jira-dash-labels');
      if (savedLabels) {
        try {
          const parsed = JSON.parse(savedLabels);
          labelDefs = parsed.labelDefs || {};
          labelAssignments = parsed.labelAssignments || {};
          autoRules = parsed.autoRules || [];
        } catch(e) {}
      }
    } catch (e) {}
    return { ...init, darkMode, otLeaveData, jiraConfig, labelDefs, labelAssignments, autoRules };
  });

  // Sync dark mode to DOM
  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('jira-dash-theme', state.darkMode ? 'dark' : 'light');
  }, [state.darkMode]);

  // Persist OT/Leave data
  useEffect(() => {
    try {
      localStorage.setItem('jira-dash-ot-leave', JSON.stringify(state.otLeaveData));
    } catch (e) {}
  }, [state.otLeaveData]);

  // Persist JIRA config to localStorage (only when meaningful data exists)
  useEffect(() => {
    try {
      if (state.jiraConfig?.url && state.jiraConfig?.token) {
        localStorage.setItem('jira-dash-config', JSON.stringify(state.jiraConfig));
      }
    } catch (e) {}
  }, [state.jiraConfig]);

  // Persist label data to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('jira-dash-labels', JSON.stringify({
        labelDefs: state.labelDefs,
        labelAssignments: state.labelAssignments,
        autoRules: state.autoRules,
      }));
    } catch (e) {}
  }, [state.labelDefs, state.labelAssignments, state.autoRules]);

  const getFilteredTasks = useCallback(() => {
    const f = state.filters;
    return state.allTasks.filter(t => {
      if (t.status?.toLowerCase() === 'cancelled') return false;
      if (f.sprint && t.primarySprint !== f.sprint) return false;
      if (f.component && !t.comps.includes(f.component)) return false;
      if (f.assignee && t.assignee !== f.assignee) return false;
      if (f.dateFrom) {
        const d = new Date(f.dateFrom);
        if (t.resolved && t.resolved < d) return false;
        if (!t.resolved && t.created && t.created < d) return false;
      }
      if (f.dateTo) {
        const d = new Date(f.dateTo);
        d.setHours(23, 59, 59);
        if (t.resolved && t.resolved > d) return false;
        if (!t.resolved && t.created && t.created > d) return false;
      }
      if (f.labels && f.labels.length > 0) {
        const taskLabels = t.labels || [];
        if (!f.labels.some(lid => taskLabels.includes(lid))) return false;
      }
      return true;
    });
  }, [state.allTasks, state.filters]);

  return (
    <AppContext.Provider value={{ state, dispatch, getFilteredTasks, onChangeProject }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
