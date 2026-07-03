import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Eye, EyeOff, AlertCircle, AlertTriangle, Sun, Moon, BarChart3, Zap } from 'lucide-react';
import { useI18n } from '../i18n';
import {
  hashPassword,
  isPasswordSet,
  getFailedAttempts,
  incrementFailedAttempts,
  resetFailedAttempts,
  isLockedOut,
  setLockout,
  getRemainingLockoutSeconds,
  saveCredentials,
  getStoredUsername,
  verifyCredentials,
  initializeDefaultCredentials,
} from '../utils/authUtils';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;

const REMEMBER_KEY = 'jira-dash-remember-me';

/* ───── static data ───── */

function getFeatures(t) {
  return [
    { icon: '\u{1F4CA}', text: t('login.feature1') },
    { icon: '\u{1F3F7}\uFE0F', text: t('login.feature2') },
    { icon: '\u{1F4BE}', text: t('login.feature3') },
    { icon: '\u{1F5A5}\uFE0F', text: t('login.feature4') },
  ];
}

const FEATURE_CIRCLE_COLORS = [
  'bg-white/20 backdrop-blur-sm border border-white/20 hover:bg-white/30 hover:scale-110 hover:shadow-lg transition-all duration-200',
  'bg-white/15 backdrop-blur-sm border border-white/20 hover:bg-white/25 hover:scale-110 hover:shadow-lg transition-all duration-200',
  'bg-white/20 backdrop-blur-sm border border-white/20 hover:bg-white/30 hover:scale-110 hover:shadow-lg transition-all duration-200',
  'bg-white/15 backdrop-blur-sm border border-white/20 hover:bg-white/25 hover:scale-110 hover:shadow-lg transition-all duration-200',
];

/* ───── Framer Motion variants ───── */

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const titleVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const featureItemVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

const shakeVariants = {
  shake: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.4 },
  },
};

/* ───── floating blob configs ───── */

const BLOBS = [
  { size: 'w-80 h-80', pos: '-top-20 -left-20', color: 'bg-white/10 dark:bg-indigo-400/20', dur: 10, del: 0 },
  { size: 'w-96 h-96', pos: '-bottom-32 -right-10', color: 'bg-white/5 dark:bg-purple-400/15', dur: 8, del: 2 },
  { size: 'w-96 h-96', pos: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2', color: 'bg-white/8 dark:bg-pink-400/10', dur: 12, del: 4 },
];

const DECORATIVE_DOTS = [
  { pos: 'top-[15%] left-[10%]', size: 'w-2 h-2', opacity: 'opacity-30' },
  { pos: 'top-[30%] right-[20%]', size: 'w-1.5 h-1.5', opacity: 'opacity-20' },
  { pos: 'bottom-[25%] left-[25%]', size: 'w-3 h-3', opacity: 'opacity-25' },
  { pos: 'top-[60%] right-[15%]', size: 'w-1 h-1', opacity: 'opacity-40' },
  { pos: 'bottom-[40%] right-[35%]', size: 'w-2.5 h-2.5', opacity: 'opacity-15' },
  { pos: 'top-[12%] right-[45%]', size: 'w-1.5 h-1.5', opacity: 'opacity-35' },
  { pos: 'bottom-[55%] left-[8%]', size: 'w-2 h-2', opacity: 'opacity-20' },
  { pos: 'top-[70%] left-[40%]', size: 'w-1 h-1', opacity: 'opacity-30' },
  { pos: 'top-[45%] right-[8%]', size: 'w-3 h-3', opacity: 'opacity-25' },
];

/**
 * LoginScreen — redesigned two-column login screen with app intro panel.
 *
 * Props:
 *   onUnlock  – callback invoked after a successful authentication
 *
 * Behaviour:
 *   - Two-column split: left panel (60%) shows app intro with gradient bg;
 *     right panel (40%) shows the login form.
 *   - Username + password authentication against stored credentials.
 *   - Default admin / 123qwe credentials are auto-created on first launch.
 *   - Max 5 failed attempts → 30-minute lockout with live countdown.
 *   - First-time password setup is supported via a hidden link.
 *   - Password hashed with SHA-256 via SubtleCrypto; hash stored in localStorage.
 *   - All UI text is Vietnamese.
 */
export default function LoginScreen({ onUnlock }) {
  const { t, lang, toggleLanguage } = useI18n();
  const FEATURES = getFeatures(t);
  /* ───── state ───── */
  const [mode, setMode] = useState('loading'); // 'loading' | 'login' | 'setup' | 'lockout'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [remember, setRemember] = useState(() => {
    return localStorage.getItem(REMEMBER_KEY) === 'true';
  });
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [errorKey, setErrorKey] = useState(0);
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('jira-dash-theme');
    if (stored !== null) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const usernameRef = useRef(null);
  const timerRef = useRef(null);

  /* ───── lockout timer update ───── */
  const updateLockoutTimer = useCallback(() => {
    const remaining = getRemainingLockoutSeconds();
    setLockoutRemaining(remaining);
    if (remaining <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Clean up lockout state so the next UI render shows the unlock form
      resetFailedAttempts();
      setFailedAttempts(0);
    }
  }, []);

  /* ───── initialise on mount ───── */
  useEffect(() => {
    let mounted = true;

    async function init() {
      // Ensure default admin / 123qwe credentials exist (first launch)
      await initializeDefaultCredentials();

      if (!mounted) return;

      if (isLockedOut()) {
        setMode('lockout');
        setLockoutRemaining(getRemainingLockoutSeconds());
        timerRef.current = setInterval(updateLockoutTimer, 1000);
      } else {
        setMode('login');
        setFailedAttempts(getFailedAttempts());
        // Restore remember-me state
        const savedRemember = localStorage.getItem(REMEMBER_KEY) === 'true';
        setRemember(savedRemember);
      }
    }

    init();

    return () => {
      mounted = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [updateLockoutTimer]);

  /* ───── auto-focus the username input when login mode settles ───── */
  useEffect(() => {
    if (mode === 'login' && usernameRef.current) {
      usernameRef.current.focus();
    }
  }, [mode]);

  /* ───── sync darkMode to <html> and localStorage ───── */
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('jira-dash-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  /* ───── helpers ───── */
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  /* ───── login handler ───── */
  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setErrorKey((k) => k + 1);

    if (isLockedOut()) return;

    if (!username.trim()) {
      setError(t('login.errorRequired'));
      return;
    }

    try {
      const valid = await verifyCredentials(username.trim(), password);
      if (valid) {
        resetFailedAttempts();
        onUnlock();

        if (remember) {
          localStorage.setItem(REMEMBER_KEY, 'true');
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
      } else {
        const attempts = incrementFailedAttempts();
        setFailedAttempts(attempts);
        const remaining = MAX_ATTEMPTS - attempts;

        if (remaining <= 0) {
          setLockout(LOCKOUT_MINUTES);
          const rem = getRemainingLockoutSeconds();
          setLockoutRemaining(rem);
          timerRef.current = setInterval(updateLockoutTimer, 1000);
          setMode('lockout');
          setError(t('login.errorTooMany'));
        } else {
          setError(t('login.errorAttempt').replace('{n}', remaining));
        }
        setPassword('');
      }
    } catch (err) {
      setError(t('login.errorAuth'));
    }
  }

  /* ───── first-time / change-password setup handler ───── */
  async function handleSetup(e) {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError(t('login.errorRequired'));
      return;
    }
    if (password.length < 4) {
      setError(t('login.errorPasswordLength'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('login.errorPasswordMatch'));
      return;
    }

    try {
      await saveCredentials(username.trim(), password);
      resetFailedAttempts();
      onUnlock();
    } catch (err) {
      setError(t('login.errorSetup'));
    }
  }

  /* ──────────────────────────────────────────────
     LOCKOUT SCREEN (full-viewport overlay)
     ────────────────────────────────────────────── */
  if (mode === 'lockout' || (mode !== 'loading' && isLockedOut())) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[var(--bg-secondary)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-sm mx-4"
        >
          <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl shadow-xl p-8 text-center">
            <div className="w-12 h-12 bg-[var(--danger)]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-[var(--danger)]" />
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              {t('login.lockoutTitle')}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              {t('login.lockoutMsg')}
            </p>
            <p className="text-2xl font-mono font-bold text-[var(--accent)] tabular-nums">
              {formatTime(lockoutRemaining)}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ───── loading state ───── */
  if (mode === 'loading') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[var(--bg-secondary)]">
        <div className="w-9 h-9 border-4 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin" />
      </div>
    );
  }

  /* ──────────────────────────────────────────────
     TWO-COLUMN LAYOUT
     ────────────────────────────────────────────── */
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row relative bg-[var(--bg-secondary)]">
      {/* ══════════════════════════════════════════
          LEFT PANEL — App Introduction (60%)
          ══════════════════════════════════════════ */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          onClick={toggleLanguage}
          className="p-2 rounded-full backdrop-blur-sm transition-colors bg-[var(--bg-secondary)]/80 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
          aria-label={t('lang.switch')}
          title={lang === 'vi' ? 'English' : 'Tiếng Việt'}
        >
          {lang === 'vi' ? <svg viewBox="0 0 20 14" className="w-5 h-5"><rect width="20" height="14" fill="#DA251D"/><polygon points="10,2 11.5,6 16,6 12.5,8.5 14,12.5 10,10 6,12.5 7.5,8.5 4,6 8.5,6" fill="#FFCD01"/></svg> : <svg viewBox="0 0 20 14" className="w-5 h-5"><rect width="20" height="14" fill="#012169"/><path d="M0 0l8 5.5M20 0l-8 5.5M0 14l8-5.5M20 14l-8-5.5" stroke="white" strokeWidth="2"/><path d="M10 0v14M0 7h20" stroke="white" strokeWidth="3.5"/><path d="M10 0v14M0 7h20" stroke="#C8102E" strokeWidth="1.5"/></svg>}
        </button>
        <button
          onClick={() => setDarkMode((prev) => !prev)}
          className="p-2 rounded-full backdrop-blur-sm transition-colors bg-[var(--bg-secondary)]/80 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
          aria-label={t('common.toggleTheme')}
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
      <div className="relative w-full md:w-[60%] min-h-[40vh] md:min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 dark:from-[var(--bg-primary)] dark:via-indigo-950 dark:to-purple-950">
        {/* — decorative floating blobs — */}
        {BLOBS.map((blob, i) => (
          <motion.div
            key={i}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.15, 0.4, 0.15],
            }}
            transition={{
              duration: blob.dur,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: blob.del,
            }}
            className={`absolute ${blob.size} ${blob.pos} ${blob.color} rounded-full blur-3xl pointer-events-none`}
          />
        ))}

        {/* — decorative dots — */}
<div className="absolute inset-0 pointer-events-none">
            {DECORATIVE_DOTS.map((dot, i) => (
              <div
                key={i}
                className={`absolute ${dot.pos} ${dot.size} ${dot.opacity} bg-white/30 dark:bg-white rounded-full`}
              />
            ))}
          </div>

        {/* — centred content — */}
        <motion.div
          key="left-panel"
          className="relative z-10 px-8 py-12 md:py-0 max-w-lg mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Logo */}
          <motion.div variants={featureItemVariants} className="mb-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/30 rotate-3">
                  <BarChart3 className="w-8 h-8 text-white" strokeWidth={2.5} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[var(--success)] rounded-full border-2 border-white flex items-center justify-center">
                  <Zap className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">JIRA Dash</h1>
                <p className="text-blue-200 text-xs font-medium tracking-wide">TIME TRACKING</p>
              </div>
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={titleVariants}
            className="text-4xl font-bold text-white mb-3"
          >
            JIRA Dashboard
          </motion.h1>

          {/* Tagline */}
          <motion.p
            variants={featureItemVariants}
            className="text-lg text-blue-100 mb-10"
          >
            {t('login.tagline')}
          </motion.p>

          {/* Feature highlights */}
          <div className="space-y-5">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={i}
                variants={featureItemVariants}
                className="flex items-start gap-3 hover:translate-x-1 transition-transform duration-200"
              >
                <div className={`w-8 h-8 ${FEATURE_CIRCLE_COLORS[i]} rounded-full flex items-center justify-center shrink-0`}>
                  <span className="text-sm">{feature.icon}</span>
                </div>
                <p className="text-white/80 text-sm leading-relaxed">
                  {feature.text}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Version footer */}
          <motion.p
            variants={featureItemVariants}
            className="mt-12 text-white/40 text-xs"
          >
            v1.1.0 &middot; Made with{' '}
                <span className="text-red-300/80">&hearts;</span>
          </motion.p>
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════
          RIGHT PANEL — Login Form (40%)
          ══════════════════════════════════════════ */}
      <div className="w-full md:w-[40%] md:min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] p-4 md:p-8">
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-sm"
        >
          <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl shadow-[var(--accent)]/10 p-8 min-w-[360px]">
            {/* ───── LOGIN MODE ───── */}
            {mode === 'login' && (
              <>
                {/* Header */}
                <div className="flex items-center justify-center mb-6">
                  <div className="w-12 h-12 bg-[var(--accent-light)] rounded-xl flex items-center justify-center">
                    <Lock className="w-6 h-6 text-[var(--accent)]" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-center text-[var(--text-primary)] mb-6 whitespace-nowrap">
                  {t('login.title')}
                </h1>

                <form onSubmit={handleLogin} onKeyDown={(e) => e.key === 'Enter' && handleLogin(e)} className="space-y-4">
                  {/* Username */}
                  <div>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-tertiary)]">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        ref={usernameRef}
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={t('login.username')}
                        className="w-full pr-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-all py-2.5"
                        style={{ paddingLeft: '2.75rem' }}
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-tertiary)]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('login.password')}
                        className="w-full pr-10 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-all py-2.5"
                        style={{ paddingLeft: '2.75rem' }}
                        autoComplete="current-password"
                        minLength={4}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                        tabIndex={-1}
                        aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Remember me (cosmetic) */}
                  <label className="flex items-center gap-2 cursor-pointer select-none transition-none">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="w-4 h-4 accent-[var(--accent)]"
                    />
                    <span className="text-sm text-[var(--text-secondary)] whitespace-nowrap">
                      {t('login.remember')}
                    </span>
                  </label>

                  {/* Error message with shake animation */}
                  {error && (
                    <motion.div
                      key={errorKey}
                      variants={shakeVariants}
                      initial="shake"
                      animate="shake"
                      className="flex items-center gap-2 p-3 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 text-[var(--danger)]" />
                      <span className="text-sm text-[var(--danger)]">
                        {error}
                      </span>
                    </motion.div>
                  )}

                  {/* Login button */}
                  <button
                    type="submit"
                    disabled={!username.trim() || !password}
                    className="w-full min-w-[140px] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-2.5 px-4 rounded-lg shadow-lg shadow-indigo-500/25 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('login.loginBtn')}
                  </button>
                </form>

                {/* Link to first-time setup */}
                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('setup');
                      setError('');
                      setPassword('');
                      setConfirmPassword('');
                    }}
                    className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors whitespace-nowrap"
                  >
                    {t('login.setupLink')}
                  </button>
                </div>
              </>
            )}

            {/* ───── SETUP MODE ───── */}
            {mode === 'setup' && (
              <>
                {/* Header */}
                <div className="w-12 h-12 bg-[var(--accent-light)] rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-6 h-6 text-[var(--accent)]" />
                </div>
                <h1 className="text-xl font-bold text-center text-[var(--text-primary)] mb-6 whitespace-nowrap">
                  {t('login.setup')}
                </h1>

                <form onSubmit={handleSetup} onKeyDown={(e) => e.key === 'Enter' && handleSetup(e)} className="space-y-4">
                  {/* Username */}
                  <div>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-tertiary)]">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={t('login.accountName')}
                        className="w-full pr-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-all py-2.5"
                        style={{ paddingLeft: '2.75rem' }}
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* New password */}
                  <div>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-tertiary)]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('login.newPassword')}
                        className="w-full pr-10 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-all py-2.5"
                        style={{ paddingLeft: '2.75rem' }}
                        minLength={4}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                        tabIndex={-1}
                        aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-tertiary)]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t('login.confirmPassword')}
                        className="w-full pr-10 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-all py-2.5"
                        style={{ paddingLeft: '2.75rem' }}
                        minLength={4}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                        tabIndex={-1}
                        aria-label={showConfirm ? t('login.hidePassword') : t('login.showPassword')}
                      >
                        {showConfirm ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[var(--danger)] text-sm text-center"
                    >
                      {error}
                    </motion.p>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={!username.trim() || password.length < 4 || !confirmPassword}
                    className="w-full min-w-[140px] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-2.5 px-4 rounded-lg shadow-lg shadow-indigo-500/25 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('login.setupBtn')}
                  </button>
                </form>

                {/* Back to login */}
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError('');
                      setPassword('');
                      setConfirmPassword('');
                    }}
                    className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors whitespace-nowrap"
                  >
                    &larr; {t('login.backToLogin')}
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
