import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Wifi, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Info, LogIn, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { testJiraConnection, loginWithPassword, fetchJiraIssues } from '../utils/jiraApi';

export default function JiraConnect() {
  const { state, dispatch } = useApp();

  const [form, setForm] = useState({ url: '', email: '', token: '', projectKey: '', jql: '' });
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
              email: saved.email || 'thongnm@etc.vn',
              token: saved.token || '',
              projectKey: saved.projectKey || 'BXDBE',
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
        setForm({ url: state.jiraConfig.url, email: state.jiraConfig.email, token: state.jiraConfig.token, projectKey: state.jiraConfig.projectKey, jql: state.jiraConfig.jql || '' });
      } else {
        // Set defaults for self-hosted JIRA
        setForm({ url: 'https://20.84.97.109:3033', email: '', token: '', projectKey: 'BXDBE', jql: '' });
      }
    }
    loadSavedConfig();
  }, []);

  const handleFormChange = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (jiraError) setJiraError('');
  }, [jiraError]);

  const handleConnect = useCallback(async () => {
    // Validate
    const { url, email, token, projectKey } = form;
    if (!url.trim()) { setJiraError('Vui lòng nhập URL JIRA.'); return; }
    if (!email.trim()) { setJiraError('Vui lòng nhập email.'); return; }
    if (!token.trim()) { setJiraError('Vui lòng nhập mật khẩu.'); return; }
    if (!projectKey.trim()) { setJiraError('Vui lòng nhập Project Key.'); return; }

    // Basic URL validation
    try {
      const parsed = new URL(url);
      if (!parsed.protocol.startsWith('http')) {
        setJiraError('URL phải bắt đầu bằng http:// hoặc https://.');
        return;
      }
    } catch {
      setJiraError('URL không hợp lệ. Vui lòng nhập URL đầy đủ (vd: https://jira.company.com).');
      return;
    }

    setConnecting(true);
    setJiraError('');

    // Step 1: Login with password (session-based)
    const testResult = await loginWithPassword(url.trim(), email.trim(), token.trim());

    if (!testResult.success) {
      setJiraError(testResult.error);
      setConnecting(false);
      return;
    }

    // Step 2: Fetch issues
    try {
      const tasks = await fetchJiraIssues(url.trim(), email.trim(), token.trim(), projectKey.trim().toUpperCase(), form.jql);

      if (tasks.length === 0) {
        setJiraError('Không tìm thấy công việc nào trong project "' + projectKey.trim().toUpperCase() + '". Kiểm tra lại Project Key.');
        setConnecting(false);
        return;
      }

      const activeTasks = tasks.filter(t => { const s = t.status?.toLowerCase(); return s === 'resolved' || s === 'closed'; });
      const totalHr = activeTasks.reduce((s, t) => s + t.timeSpentHr, 0);
      const totalEst = activeTasks.reduce((s, t) => s + (t.originalEstimateHr || t.estimateHr || 0), 0);
      const stats = `${activeTasks.length} công việc · ${totalHr.toFixed(1)} giờ đã log · ${totalEst.toFixed(1)} giờ ước tính`;

      // Electron: save config to persistent store (not localStorage, for security)
      const configToSave = { url: url.trim(), email: email.trim(), token: token.trim(), projectKey: projectKey.trim().toUpperCase(), jql: form.jql };
      if (window.electronAPI?.isElectron) {
        try {
          await window.electronAPI.storeSet('jira-config', configToSave);
        } catch (e) {
          console.warn('Failed to save config to Electron store:', e);
        }
      }

      // Save config in context (also persisted to localStorage via effect)
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
      setJiraError(err.message || 'Lỗi kết nối không xác định.');
    } finally {
      setConnecting(false);
    }
  }, [form, dispatch]);

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
      setJiraError('Không thể mở cửa sổ đăng nhập JIRA: ' + err.message);
      setCookieLoginStatus('error');
    }
  }, []);

  // After cookie login succeeds, fetch data using cookie-based API
  const handleCookieFetchData = useCallback(async (projectKey) => {
    if (!projectKey) {
      setJiraError('Vui lòng nhập Project Key.');
      return;
    }
    setConnecting(true);
    setJiraError('');

    try {
      // Step 1: Test connection with cookies (no token needed)
      const testResult = await testJiraConnection('', '', '');
      if (!testResult.success) {
        setJiraError(testResult.error);
        setConnecting(false);
        return;
      }

      // Step 2: Fetch issues using cookie-based API (no url/email/token)
      const tasks = await fetchJiraIssues('', '', '', projectKey.trim().toUpperCase(), form.jql);

      if (tasks.length === 0) {
        setJiraError('Không tìm thấy công việc nào trong project "' + projectKey.trim().toUpperCase() + '". Kiểm tra lại Project Key.');
        setConnecting(false);
        return;
      }

      const activeTasks = tasks.filter(t => { const s = t.status?.toLowerCase(); return s === 'resolved' || s === 'closed'; });
      const totalHr = activeTasks.reduce((s, t) => s + t.timeSpentHr, 0);
      const totalEst = activeTasks.reduce((s, t) => s + (t.originalEstimateHr || t.estimateHr || 0), 0);
      const stats = `${activeTasks.length} công việc · ${totalHr.toFixed(1)} giờ đã log · ${totalEst.toFixed(1)} giờ ước tính`;

      // Save JIRA config (project key only, no token needed)
      const configToSave = { url: JIRA_URL, email: '', token: '', projectKey: projectKey.trim().toUpperCase(), jql: form.jql };
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
      setJiraError(err.message || 'Lỗi kết nối không xác định.');
    } finally {
      setConnecting(false);
    }
  }, [form, dispatch]);

  // Auto-fetch data when cookie login succeeds (if user has already filled project key)
  useEffect(() => {
    let cleanup = null;
    if (window.electronAPI?.isElectron) {
      cleanup = window.electronAPI.onLoginSuccess(async () => {
        setCookieLoginStatus('loggedin');
        // If user already entered a project key, auto-fetch
        if (form.projectKey.trim()) {
          await handleCookieFetchData(form.projectKey);
        }
      });
    }
    return () => {
      if (cleanup) cleanup();
    };
  }, [form.projectKey, handleCookieFetchData]);

  const JIRA_URL = 'https://20.84.97.109:3033';

  return (
    <motion.div
      key="jira-connect"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full max-w-lg mx-auto"
    >
      <div className="space-y-4">
            {/* Previously connected info */}
            {state.jiraConnected && state.jiraConfig.projectKey && (
              <div className="p-3 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/30 text-sm flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[var(--success)] mt-0.5 flex-shrink-0" />
                <div className="text-[var(--text-primary)]">
                  Đã kết nối <strong>{state.jiraConfig.projectKey}</strong> (
                  <span className="text-[var(--text-secondary)]">{state.jiraConfig.url}</span>)
                  <br />
                  <span className="text-xs text-[var(--text-tertiary)]">
                    <button
                      onClick={handleReconnect}
                      className="text-[var(--accent)] hover:underline cursor-pointer"
                    >
                      Kết nối lại
                    </button>
                    {' · '}
                    <button
                      onClick={() => dispatch({ type: 'RESET' })}
                      className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:underline cursor-pointer"
                    >
                      Quay lại
                    </button>
                  </span>
                </div>
              </div>
            )}

            {/* Electron: In-app JIRA login (SSO) */}
            {window.electronAPI?.isElectron && (
              <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-3">
                  <LogIn className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                    Đăng nhập JIRA (SSO)
                  </span>
                  {cookieLoginStatus === 'loggedin' && (
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full ml-auto">
                      Đã đăng nhập
                    </span>
                  )}
                </div>

                <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                  Đăng nhập qua Microsoft SSO ngay trong ứng dụng. Không cần API Token.
                </p>

                {cookieLoginStatus === 'loggedin' ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={form.projectKey}
                      onChange={(e) => handleFormChange('projectKey', e.target.value.toUpperCase())}
                      placeholder="BXDBE"
                      className="input-like w-full uppercase text-sm"
                      disabled={connecting}
                    />
                    <button
                      onClick={() => handleCookieFetchData(form.projectKey)}
                      disabled={connecting || !form.projectKey.trim()}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {connecting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Đang tải dữ liệu...
                        </>
                      ) : (
                        <>
                          <Wifi className="w-4 h-4" />
                          Tải dữ liệu từ JIRA
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
                      Đăng xuất
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleCookieLogin}
                    disabled={cookieLoginStatus === 'loading'}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {cookieLoginStatus === 'loading' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang mở cửa sổ đăng nhập...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        Đăng nhập JIRA (Microsoft SSO)
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* URL */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                URL JIRA
              </label>
              <input
                type="text"
                value={form.url}
                onChange={(e) => handleFormChange('url', e.target.value)}
                placeholder="https://jira.company.com"
                className="input-like w-full"
                disabled={connecting}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                placeholder="user@company.com"
                className="input-like w-full"
                disabled={connecting}
              />
            </div>

            {/* Mật khẩu JIRA */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Mật khẩu JIRA
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={form.token}
                  onChange={(e) => handleFormChange('token', e.target.value)}
                  placeholder="Mật khẩu JIRA"
                  className="input-like w-full pr-10"
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

            {/* Project Key */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Project Key
              </label>
              <input
                type="text"
                value={form.projectKey}
                onChange={(e) => handleFormChange('projectKey', e.target.value.toUpperCase())}
                placeholder="BXDBE"
                className="input-like w-full uppercase"
                disabled={connecting}
              />
            </div>

            {/* JQL Filter */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                JQL (tùy chọn)
              </label>
              <textarea
                value={form.jql}
                onChange={(e) => handleFormChange('jql', e.target.value)}
                placeholder={`project = "BXDBE" ORDER BY created DESC`}
                rows={3}
                className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] resize-none font-mono"
                disabled={connecting}
              />
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Để trống để lấy tất cả issue trong project.
              </p>
            </div>

            {/* Security warning */}
            <div className="flex items-start gap-2 text-xs text-[var(--warning)] px-1">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{window.electronAPI?.isElectron
                ? 'Token được lưu an toàn trong ổ cứng (Electron userData). Dùng "Đăng nhập JIRA (SSO)" để không cần token.'
                : 'Token được lưu trong trình duyệt. Không dùng trên máy công cộng.'}</span>
            </div>

            {/* Error message */}
            {jiraError && (
              <div className="p-3 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-sm flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[var(--danger)] mt-0.5 flex-shrink-0" />
                <span className="text-[var(--danger)] whitespace-pre-line">{jiraError}</span>
              </div>
            )}

            {/* Connect button */}
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang kết nối...
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4" />
                  {state.jiraConnected ? 'Kết nối lại & Tải dữ liệu' : 'Kết nối & Tải dữ liệu'}
                </>
              )}
            </button>
          </div>
    </motion.div>
  );
}
