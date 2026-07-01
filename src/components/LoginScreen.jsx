import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Eye, EyeOff, AlertCircle, AlertTriangle, Sun, Moon } from 'lucide-react';
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

/* ───── static data ───── */

const FEATURES = [
  { icon: '\u{1F4CA}', text: 'Phân tích dữ liệu JIRA với 5+ biểu đồ trực quan' },
  { icon: '\u{1F3F7}\uFE0F', text: 'Quản lý nhãn thông minh, tự động phân loại công việc' },
  { icon: '\u{1F4BE}', text: 'Lưu & so sánh lịch sử phân tích theo thời gian' },
  { icon: '\u{1F5A5}\uFE0F', text: 'Ứng dụng desktop — Không cần trình duyệt' },
];

const FEATURE_CIRCLE_COLORS = [
  'bg-white/80 dark:bg-indigo-500/20 border border-indigo-300/50 dark:border-transparent hover:scale-110 hover:shadow-lg transition-all duration-200',
  'bg-white/80 dark:bg-purple-500/20 border border-purple-300/50 dark:border-transparent hover:scale-110 hover:shadow-lg transition-all duration-200',
  'bg-white/80 dark:bg-pink-500/20 border border-pink-300/50 dark:border-transparent hover:scale-110 hover:shadow-lg transition-all duration-200',
  'bg-white/80 dark:bg-blue-500/20 border border-blue-300/50 dark:border-transparent hover:scale-110 hover:shadow-lg transition-all duration-200',
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
  { size: 'w-80 h-80', pos: '-top-20 -left-20', color: 'bg-indigo-200/5 dark:bg-indigo-400/20', dur: 10, del: 0 },
  { size: 'w-96 h-96', pos: '-bottom-32 -right-10', color: 'bg-purple-200/5 dark:bg-purple-400/15', dur: 8, del: 2 },
  { size: 'w-96 h-96', pos: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2', color: 'bg-pink-200/5 dark:bg-pink-400/10', dur: 12, del: 4 },
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
  /* ───── state ───── */
  const [mode, setMode] = useState('loading'); // 'loading' | 'login' | 'setup' | 'lockout'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [remember, setRemember] = useState(false);
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
        // Pre-fill the stored username for convenience
        const storedUser = getStoredUsername();
        if (storedUser) setUsername(storedUser);
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
      setError('Vui lòng nhập tài khoản');
      return;
    }

    try {
      const valid = await verifyCredentials(username.trim(), password);
      if (valid) {
        resetFailedAttempts();
        onUnlock();
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
          setError('Quá nhiều lần thử sai. Vui lòng thử lại sau 30 phút.');
        } else {
          setError(`Sai tài khoản hoặc mật khẩu (còn ${remaining} lần)`);
        }
        setPassword('');
      }
    } catch (err) {
      setError('Lỗi xác thực. Vui lòng thử lại.');
    }
  }

  /* ───── first-time / change-password setup handler ───── */
  async function handleSetup(e) {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Vui lòng nhập tên tài khoản');
      return;
    }
    if (password.length < 4) {
      setError('Mật khẩu phải có ít nhất 4 ký tự');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    try {
      await saveCredentials(username.trim(), password);
      resetFailedAttempts();
      onUnlock();
    } catch (err) {
      setError('Lỗi khi thiết lập. Vui lòng thử lại.');
    }
  }

  /* ──────────────────────────────────────────────
     LOCKOUT SCREEN (full-viewport overlay)
     ────────────────────────────────────────────── */
  if (mode === 'lockout' || (mode !== 'loading' && isLockedOut())) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:bg-gradient-to-br dark:from-indigo-950 dark:via-slate-900 dark:to-slate-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-sm mx-4"
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Tạm khóa
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Quá nhiều lần thử sai. Vui lòng thử lại sau.
            </p>
            <p className="text-2xl font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
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
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:bg-gradient-to-br dark:from-indigo-950 dark:via-slate-900 dark:to-slate-950">
        <div className="w-9 h-9 border-4 border-indigo-300/30 dark:border-white/20 border-t-indigo-600 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  /* ──────────────────────────────────────────────
     TWO-COLUMN LAYOUT
     ────────────────────────────────────────────── */
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row relative">
      {/* ══════════════════════════════════════════
          LEFT PANEL — App Introduction (60%)
          ══════════════════════════════════════════ */}
      <button
        onClick={() => setDarkMode((prev) => !prev)}
        className="absolute top-4 right-4 z-10 p-2 rounded-full backdrop-blur-sm transition-colors bg-slate-200/60 text-slate-600 hover:bg-slate-300/60 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
        aria-label={darkMode ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      >
        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
      <div className="relative w-full md:w-[60%] min-h-[40vh] md:min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:bg-gradient-to-br dark:from-slate-900 dark:via-indigo-950 dark:to-purple-950">
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
                className={`absolute ${dot.pos} ${dot.size} ${dot.opacity} bg-indigo-300/30 dark:bg-white rounded-full`}
              />
            ))}
          </div>

        {/* — centred content — */}
        <motion.div
          className="relative z-10 px-8 py-12 md:py-0 max-w-lg mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Logo */}
          <motion.div variants={featureItemVariants} className="mb-6">
            <div className="w-[72px] h-[72px] bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <span className="text-white font-bold text-4xl">J</span>
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={titleVariants}
            className="text-4xl font-bold text-slate-800 dark:text-white mb-3"
          >
            JIRA Dashboard
          </motion.h1>

          {/* Tagline */}
          <motion.p
            variants={featureItemVariants}
            className="text-lg text-slate-600 dark:text-white/70 mb-10"
          >
            Theo dõi thời gian làm việc — Trực quan &amp; Hiệu quả
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
                <p className="text-slate-600 dark:text-white/80 text-sm leading-relaxed">
                  {feature.text}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Version footer */}
          <motion.p
            variants={featureItemVariants}
            className="mt-12 text-slate-400 dark:text-white/40 text-xs"
          >
            v1.1.0 &middot; Made with{' '}
            <span className="text-red-400/60">&hearts;</span>
          </motion.p>
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════
          RIGHT PANEL — Login Form (40%)
          ══════════════════════════════════════════ */}
      <div className="w-full md:w-[40%] md:min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 dark:bg-gradient-to-br dark:from-slate-950 dark:to-indigo-950 p-4 md:p-8">
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-sm"
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl ring-1 ring-indigo-100 dark:ring-slate-700 p-8">
            {/* ───── LOGIN MODE ───── */}
            {mode === 'login' && (
              <>
                {/* Header */}
                <div className="flex items-center justify-center mb-6">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                    <Lock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-6">
                  Đăng nhập
                </h1>

                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Username */}
                  <div>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        ref={usernameRef}
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Tài khoản"
                        className="w-full pr-3 input-like placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono text-slate-900 dark:text-white"
                        style={{ paddingLeft: '2.75rem' }}
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mật khẩu"
                        className="w-full pr-10 input-like placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono text-slate-900 dark:text-white"
                        style={{ paddingLeft: '2.75rem' }}
                        autoComplete="current-password"
                        minLength={4}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
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
                      className="w-4 h-4 accent-indigo-600 text-slate-900 dark:text-white"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Ghi nhớ đăng nhập
                    </span>
                  </label>

                  {/* Error message with shake animation */}
                  {error && (
                    <motion.div
                      key={errorKey}
                      variants={shakeVariants}
                      initial="shake"
                      animate="shake"
                      className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                      <span className="text-sm text-red-600 dark:text-red-400">
                        {error}
                      </span>
                    </motion.div>
                  )}

                  {/* Login button */}
                  <button
                    type="submit"
                    disabled={!username.trim() || !password}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-2.5 px-4 rounded-lg shadow-lg shadow-indigo-500/25 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Đăng nhập
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
                    className="text-xs text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                  >
                    Thiết lập mật khẩu lần đầu
                  </button>
                </div>
              </>
            )}

            {/* ───── SETUP MODE ───── */}
            {mode === 'setup' && (
              <>
                {/* Header */}
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h1 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-6">
                  Thiết lập mật khẩu
                </h1>

                <form onSubmit={handleSetup} className="space-y-4">
                  {/* Username */}
                  <div>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Tên tài khoản"
                        className="w-full pr-3 input-like placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono text-slate-900 dark:text-white"
                        style={{ paddingLeft: '2.75rem' }}
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* New password */}
                  <div>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mật khẩu mới"
                        className="w-full pr-10 input-like placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono text-slate-900 dark:text-white"
                        style={{ paddingLeft: '2.75rem' }}
                        minLength={4}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
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
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Xác nhận mật khẩu"
                        className="w-full pr-10 input-like placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono text-slate-900 dark:text-white"
                        style={{ paddingLeft: '2.75rem' }}
                        minLength={4}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        tabIndex={-1}
                        aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
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
                      className="text-red-500 dark:text-red-400 text-sm text-center"
                    >
                      {error}
                    </motion.p>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={!username.trim() || password.length < 4 || !confirmPassword}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-2.5 px-4 rounded-lg shadow-lg shadow-indigo-500/25 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Thiết lập
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
                    className="text-xs text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                  >
                    &larr; Quay lại đăng nhập
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
