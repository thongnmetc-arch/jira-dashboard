import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Wifi, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, LogIn, LogOut, ArrowLeft, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';
import { testJiraConnection, fetchJiraIssues } from '../utils/jiraApi';

export default function JiraConnect({ mode, onConnected, onBack }) {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const isWizard = mode === 'wizard';
  const [connectSuccess, setConnectSuccess] = useState(false);

  const [form, setForm] = useState({ url: '', token: '', projectKey: '', assignee: '', jql: '' });
  const [showToken, setShowToken] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [jiraError, setJiraError] = useState('');
  const [cookieLoginStatus, setCookieLoginStatus] = useState(null); // null | 'loading' | 'loggedin' | 'error'

  // Electron: check cookie-based login status on mount + listen for login success
  useEffect(() => {
    let cleanup = null;

    async function init() {
      if (window.electronAPI?.isElectron) {
        // Check if cookies exist
        try {
          const status = await window.electronAPI.jiraLoginStatus();
          if (status.loggedIn) {
            setCookieLoginStatus('loggedin');
          }
        } catch (e) {
          console.warn('Failed to check cookie login status:', e);
        }

        // Listen for login-success from main process
        cleanup = window.electronAPI.onLoginSuccess(() => {
          setCookieLoginStatus('loggedin');
        });
      }
    }

    init();

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // On mount, try loading saved config (from Electron store or localStorage)
  useEffect(() => {
    async function loadSavedConfig() {
      // Electron: load from persistent store first
      if (window.electronAPI?.isElectron) {
        try {
          const saved = await window.electronAPI.storeGet('jira-config');
          if (saved) {
            setForm({
              url: saved.url || 'https://20.84.97.109:3033',
              token: saved.token || '',
              projectKey: saved.projectKey || 'BXDBE',
              assignee: saved.assignee || '',
              jql: saved.jql || '',
            });
            return;
          }
        } catch (e) {
          console.warn('Failed to load Electron store, falling back to localStorage:', e);
        }
      }

      // Fallback: load from context (localStorage)
      if (state.jiraConfig.url && state.jiraConfig.projectKey) {
        setForm({ url: state.jiraConfig.url, token: state.jiraConfig.token, projectKey: state.jiraConfig.projectKey, assignee: state.jiraConfig.assignee || '', jql: state.jiraConfig.jql || '' });
      } else {
        // Set defaults for self-hosted JIRA
        setForm({ url: 'https://20.84.97.109:3033', token: '', projectKey: 'BXDBE', assignee: '', jql: '' });
      }
    }
    loadSavedConfig();
  }, []);

  const handleFormChange = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (jiraError) setJiraError('');
  }, [jiraError]);

  const handleConnect = useCallback(async () => {
    const { url, token } = form;

    // Validate — wizard mode doesn't require projectKey
    if (!url.trim()) { setJiraError(t('connect.enterUrl')); return; }
    if (!token.trim()) { setJiraError(t('connect.enterToken')); return; }
    if (!isWizard && !form.projectKey.trim()) { setJiraError(t('connect.enterProject')); return; }

    // Basic URL validation
    try {
      const parsed = new URL(url);
      if (!parsed.protocol.startsWith('http')) {
        setJiraError(t('connect.enterUrl'));
        return;
      }
    } catch {
      setJiraError(t('connect.enterUrl'));
      return;
    }

    setConnecting(true);
    setJiraError('');
    setConnectSuccess(false);

    // Test connection
    const testResult = await testJiraConnection(url.trim(), token.trim());

    if (!testResult.success) {
      setJiraError(testResult.error);
      setConnecting(false);
      return;
    }

    // Build config to save
    const configToSave = {
      url: url.trim(),
      token: token.trim(),
      projectKey: form.projectKey.trim().toUpperCase(),
      assignee: form.assignee.trim(),
      jql: form.jql,
    };

    // In wizard mode: only test connection, then show success
    if (isWizard) {
      setConnectSuccess(true);
      setConnecting(false);
      return;
    }

    // Dashboard mode: also fetch issues
    try {
      const tasks = await fetchJiraIssues(url.trim(), token.trim(), form.projectKey.trim().toUpperCase(), form.assignee.trim(), form.jql);

      if (tasks.length === 0) {
        setJiraError(t('connect.testError'));
        setConnecting(false);
        return;
      }

      const activeTasks = tasks.filter(t => { const s = t.status?.toLowerCase(); return s === 'resolved' || s === 'closed'; });
      const totalHr = activeTasks.reduce((s, t) => s + t.timeSpentHr, 0);
      const totalEst = activeTasks.reduce((s, t) => s + (t.originalEstimateHr || t.estimateHr || 0), 0);
      const stats = `${activeTasks.length} ${t('common.tasks')} · ${totalHr.toFixed(1)}h`;

      // Electron: save config to persistent store
      if (window.electronAPI?.isElectron) {
        try {
          await window.electronAPI.storeSet('jira-config', configToSave);
        } catch (e) {
          console.warn('Failed to save config to Electron store:', e);
        }
      }

      dispatch({ type: 'SET_JIRA_CONFIG', payload: configToSave });
      dispatch({ type: 'SET_JIRA_CONNECTED', payload: true });
      dispatch({ type: 'SET_DATA_SOURCE', payload: 'jira' });
      dispatch({ type: 'SET_FILE_INFO', payload: { fileName: form.projectKey.trim().toUpperCase(), fileStats: stats } });
      dispatch({ type: 'SET_TASKS', payload: tasks });
      dispatch({ type: 'SET_OT_LEAVE', payload: { otTotal: 0, leaveTotal: 0 } });
      try { localStorage.removeItem('jira-dash-ot-leave'); } catch(e) {}
      dispatch({ type: 'SET_JQL_USED', payload: form.jql ? form.jql.trim().replace(/\n/g, ' ') : '' });
      dispatch({ type: 'SET_LAST_REFRESH_TIME', payload: new Date().toISOString() });

    } catch (err) {
      setJiraError(err.message || t('common.error'));
    } finally {
      setConnecting(false);
    }
  }, [form, dispatch, isWizard, t]);

  // Allow reconnecting with different credentials
  const handleReconnect = useCallback(() => {
    dispatch({ type: 'SET_JIRA_CONNECTED', payload: false });
  }, [dispatch]);

  // ── Cookie-based login (Electron SSO) ──────────────────────────────

  // Open JIRA login window (Microsoft SSO)
  const handleCookieLogin = useCallback(async () => {
    setJiraError('');
    setCookieLoginStatus('loading');
    try {
      await window.electronAPI.jiraLogin();
      // The login-success event (caught by useEffect above) will set status to 'loggedin'
    } catch (err) {
      setJiraError(t('connect.title') + ': ' + err.message);
      setCookieLoginStatus('error');
    }
  }, [t]);

  // After cookie login succeeds, fetch data using cookie-based API
  const handleCookieFetchData = useCallback(async (projectKey) => {
    if (!projectKey) {
      setJiraError(t('connect.enterProject'));
      return;
    }
    setConnecting(true);
    setJiraError('');
    setConnectSuccess(false);

    try {
      // Step 1: Test connection with cookies (no token needed)
      const testResult = await testJiraConnection('', '');
      if (!testResult.success) {
        setJiraError(testResult.error);
        setConnecting(false);
        return;
      }

      // In wizard mode: only test connection
      if (isWizard) {
        setConnectSuccess(true);
        setConnecting(false);
        return;
      }

      // Step 2: Fetch issues using cookie-based API (no url/email/token)
      const tasks = await fetchJiraIssues('', '', projectKey.trim().toUpperCase(), form.assignee.trim(), form.jql);

      if (tasks.length === 0) {
        setJiraError(t('connect.testError'));
        setConnecting(false);
        return;
      }

      const activeTasks = tasks.filter(t => { const s = t.status?.toLowerCase(); return s === 'resolved' || s === 'closed'; });
      const totalHr = activeTasks.reduce((s, t) => s + t.timeSpentHr, 0);
      const totalEst = activeTasks.reduce((s, t) => s + (t.originalEstimateHr || t.estimateHr || 0), 0);
      const stats = `${activeTasks.length} ${t('common.tasks')} · ${totalHr.toFixed(1)}h`;

      // Save JIRA config (project key only, no token needed)
      const configToSave = { url: JIRA_URL, token: '', projectKey: projectKey.trim().toUpperCase(), assignee: form.assignee.trim(), jql: form.jql };
      if (window.electronAPI?.isElectron) {
        try {
          await window.electronAPI.storeSet('jira-config', configToSave);
        } catch (e) {
          console.warn('Failed to save config to Electron store:', e);
        }
      }

      dispatch({ type: 'SET_JIRA_CONFIG', payload: configToSave });
      dispatch({ type: 'SET_JIRA_CONNECTED', payload: true });
      dispatch({ type: 'SET_DATA_SOURCE', payload: 'jira' });
      dispatch({ type: 'SET_FILE_INFO', payload: { fileName: projectKey.trim().toUpperCase(), fileStats: stats } });
      dispatch({ type: 'SET_TASKS', payload: tasks });
      dispatch({ type: 'SET_OT_LEAVE', payload: { otTotal: 0, leaveTotal: 0 } });
      try { localStorage.removeItem('jira-dash-ot-leave'); } catch(e) {}
      dispatch({ type: 'SET_JQL_USED', payload: form.jql ? form.jql.trim().replace(/\n/g, ' ') : '' });
      dispatch({ type: 'SET_LAST_REFRESH_TIME', payload: new Date().toISOString() });
    } catch (err) {
      setJiraError(err.message || t('common.error'));
    } finally {
      setConnecting(false);
    }
  }, [form, dispatch, isWizard, t]);

  // Auto-fetch data when cookie login succeeds (if user has already filled project key)
  useEffect(() => {
    let cleanup = null;
    if (window.electronAPI?.isElectron) {
      cleanup = window.electronAPI.onLoginSuccess(async () => {
        setCookieLoginStatus('loggedin');
        if (isWizard) {
          // In wizard mode, just test connection on successful login
          const testResult = await testJiraConnection('', '');
          if (testResult.success) {
            setConnectSuccess(true);
          } else {
            setJiraError(testResult.error);
          }
          return;
        }
        // If user already entered a project key, auto-fetch
        if (form.projectKey.trim()) {
          await handleCookieFetchData(form.projectKey);
        }
      });
    }
    return () => {
      if (cleanup) cleanup();
    };
  }, [form.projectKey, handleCookieFetchData, isWizard]);

  const JIRA_URL = 'https://20.84.97.109:3033';

  const handleProceed = useCallback(() => {
    if (onConnected) {
      onConnected({
        url: form.url.trim(),
        token: form.token.trim(),
      });
    }
  }, [form, onConnected]);

  return (
    <motion.div
      key="jira-connect"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`w-full max-w-lg mx-auto ${isWizard ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl p-0.5 shadow-xl border border-slate-200 dark:border-slate-700' : ''}`}
    >
      <div className={`space-y-4 ${isWizard ? 'bg-white dark:bg-slate-800 rounded-2xl p-6' : ''}`}>
        {isWizard && (
          <>
            {/* Back button */}
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('common.back')}
              </button>
            )}

            {/* Step title */}
            <div className="text-center mb-2">
              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                  <span className="text-xs font-bold text-white">1</span>
                </div>
                <div className="w-6 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 ring-2 ring-blue-500/40">
                  <span className="text-xs font-bold text-white">2</span>
                </div>
                <div className="w-6 h-0.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">3</span>
                </div>
                <div className="w-6 h-0.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">4</span>
                </div>
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{t('connect.title')}</h2>
              <p className="text-sm text-[var(--text-tertiary)] mt-1">Bước 2/4</p>
            </div>
          </>
        )}

        {/* Previously connected info (dashboard mode only) */}
        {!isWizard && state.jiraConnected && state.jiraConfig.projectKey && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 text-sm flex items-start gap-2.5 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
            <div className="text-[var(--text-primary)]">
              {t('connect.connected')} <strong>{state.jiraConfig.projectKey}</strong> (
              <span className="text-[var(--text-secondary)]">{state.jiraConfig.url}</span>)
              <br />
              <span className="text-xs text-[var(--text-tertiary)]">
                <button
                  onClick={handleReconnect}
                  className="text-[var(--accent)] hover:underline cursor-pointer"
                >
                  {t('connect.reConnect')}
                </button>
                {' · '}
                <button
                  onClick={() => dispatch({ type: 'RESET' })}
                  className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:underline cursor-pointer"
                >
                  {t('common.back')}
                </button>
              </span>
            </div>
          </div>
        )}

        {/* Success message (wizard mode) */}
        {isWizard && connectSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 text-sm flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-800/40 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">{t('common.success')}</span>
              <br />
              <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                {t('connect.title')} — OK
              </span>
            </div>
          </motion.div>
        )}

        {/* Electron: In-app JIRA login (SSO) */}
        {window.electronAPI?.isElectron && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <LogIn className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                {t('connect.title')} (SSO)
              </span>
              {cookieLoginStatus === 'loggedin' && (
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full ml-auto">
                  {t('common.success')}
                </span>
              )}
            </div>

            <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
              {t('connect.title')} — {t('connect.optional')}
            </p>

            {cookieLoginStatus === 'loggedin' ? (
              <div className="space-y-2">
                  <input
                    type="text"
                    value={form.projectKey}
                    onChange={(e) => handleFormChange('projectKey', e.target.value.toUpperCase())}
                    placeholder="BXDBE"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all uppercase"
                    disabled={connecting}
                  />
                  <button
                    onClick={() => handleCookieFetchData(form.projectKey)}
                    disabled={connecting || !form.projectKey.trim()}
                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isWizard ? t('common.loading') : t('common.loading')}
                    </>
                  ) : (
                    <>
                      <Wifi className="w-4 h-4" />
                      {isWizard ? t('connect.test') : t('connect.connectBtn')}
                    </>
                  )}
                </button>
                <button
                  onClick={async () => {
                    await window.electronAPI.jiraLogout();
                    setCookieLoginStatus(null);
                  }}
                  className="w-full py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center justify-center gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  {t('common.logout')}
                </button>
              </div>
            ) : (
                <button
                  onClick={handleCookieLogin}
                  disabled={cookieLoginStatus === 'loading'}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
              >
                {cookieLoginStatus === 'loading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    {t('connect.title')} (SSO)
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* URL */}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
            {t('connect.url')}
          </label>
          <input
            type="text"
            value={form.url}
            onChange={(e) => handleFormChange('url', e.target.value)}
            placeholder="https://jira.company.com"
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            disabled={connecting}
          />
        </div>

        {/* API Token */}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
            {t('connect.token')}
          </label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={form.token}
              onChange={(e) => handleFormChange('token', e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConnect(); }}
              placeholder={t('connect.token')}
              className="w-full pr-10 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              disabled={connecting}
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer p-1"
              tabIndex={-1}
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* JQL (tùy chọn) — only in dashboard mode */}
        {!isWizard && (
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              {t('connect.jql')} <span className="text-[var(--text-tertiary)] font-normal">({t('connect.optional')})</span>
            </label>
            <textarea
              value={form.jql || ''}
              onChange={(e) => handleFormChange('jql', e.target.value)}
              placeholder={t('query.jqlPlaceholder')}
              rows={3}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
              disabled={connecting}
            />
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">{t('query.emptyJql')}</p>
          </div>
        )}

        {/* Error message */}
        {jiraError && (
          <div className="p-3 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[var(--danger)] mt-0.5 flex-shrink-0" />
            <span className="text-[var(--danger)] whitespace-pre-line">{jiraError}</span>
          </div>
        )}

        {/* Connect / Kiểm tra kết nối button */}
        {!connectSuccess && (
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            {connecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('common.loading')}
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4" />
                {isWizard ? t('connect.test') : (state.jiraConnected ? t('connect.reConnect') : t('connect.connectBtn'))}
              </>
            )}
          </button>
        )}

        {/* Tiếp tục button (wizard mode, after success) */}
        {isWizard && connectSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <button
              onClick={handleProceed}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white rounded-xl font-medium text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <ArrowRight className="w-4 h-4" />
              {t('connect.connectBtn')}
            </button>
          </motion.div>
        )}


      </div>
    </motion.div>
  );
}
