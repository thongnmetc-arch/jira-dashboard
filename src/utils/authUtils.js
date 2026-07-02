/**
 * Password hashing via SubtleCrypto SHA-256, persisted to localStorage.
 * No backend, no server — local password protection for the Electron desktop app.
 *
 * Now supports username + password credentials with auto-initialized admin defaults.
 */

const AUTH_KEY = 'jira-dash-auth';
const LOCKOUT_KEY = 'jira-dash-lockout-until';
const ATTEMPTS_KEY = 'jira-dash-failed-attempts';

const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = '123456aA@';

/**
 * Hash a password string using SHA-256 via the browser's SubtleCrypto API.
 * Returns a lowercase hex string.
 */
export async function hashPassword(password) {
  // crypto.subtle requires secure context (HTTPS/localhost) — fallback on HTTP
  if (!crypto.subtle) return password;

  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a password against a previously stored hex hash.
 * Constant-time comparison is not strictly required here (no network),
 * but we compare via the hash output which is inherently length-fixed.
 */
export async function verifyPassword(password, storedHash) {
  const hash = await hashPassword(password);
  return hash === storedHash;
}

/* ───── stored-credential helpers (JSON format: { hash, username }) ───── */

/** Return true if auth data has been saved (any format). */
export function isPasswordSet() {
  return !!localStorage.getItem(AUTH_KEY);
}

/**
 * Legacy: persist a hex hash as the stored password.
 * Wraps in the new JSON format, preserving any existing username.
 */
export function savePasswordHash(hash) {
  const raw = localStorage.getItem(AUTH_KEY);
  let username = DEFAULT_USERNAME;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.username) username = parsed.username;
    } catch {
      // old plain-hash format — keep default
    }
  }
  localStorage.setItem(AUTH_KEY, JSON.stringify({ hash, username }));
}

/**
 * Save username + password credentials (hashes the password).
 */
export async function saveCredentials(username, password) {
  const hash = await hashPassword(password);
  localStorage.setItem(AUTH_KEY, JSON.stringify({ hash, username }));
}

/**
 * Return the stored username, or null if none / old format.
 */
export function getStoredUsername() {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.username) return parsed.username;
  } catch {
    // old plain-hash format → return null
  }
  return null;
}

/**
 * Verify both username and password against stored credentials.
 * Returns true only if both match.
 */
export async function verifyCredentials(username, password) {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return false;

  let storedHash, storedUsername;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.hash) return false;
    storedHash = parsed.hash;
    storedUsername = parsed.username || DEFAULT_USERNAME;
  } catch {
    // old plain-hash format → can't verify username
    return false;
  }

  if (username !== storedUsername) return false;
  const hash = await hashPassword(password);
  return hash === storedHash;
}

/**
 * Initialize default admin / 123456aA@ credentials if no auth data exists.
 * Also migrates old plain-hash format to the new JSON format.
 * Returns true if initialization or migration occurred.
 *
 * Call this once on app startup (e.g. from the LoginScreen useEffect).
 */
export async function initializeDefaultCredentials() {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) {
    // No auth data at all — create default admin account
    const hash = await hashPassword(DEFAULT_PASSWORD);
    localStorage.setItem(
      AUTH_KEY,
      JSON.stringify({ hash, username: DEFAULT_USERNAME }),
    );
    return true;
  }

  // Check if already in new JSON format
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.hash) {
      // Already in new format — nothing to do
      return false;
    }
  } catch {
    // Old plain-hash format → migrate: wrap with default username
    localStorage.setItem(
      AUTH_KEY,
      JSON.stringify({ hash: raw, username: DEFAULT_USERNAME }),
    );
    return true;
  }

  return false;
}

/* ───── lockout helpers ───── */

/** Return the lockout-until timestamp (ms epoch) or null. */
export function getLockoutUntil() {
  return localStorage.getItem(LOCKOUT_KEY);
}

/** Set a lockout that expires in `minutes`. */
export function setLockout(minutes) {
  const until = Date.now() + minutes * 60 * 1000;
  localStorage.setItem(LOCKOUT_KEY, String(until));
}

/** Return true if the user is currently locked out. */
export function isLockedOut() {
  const raw = localStorage.getItem(LOCKOUT_KEY);
  if (!raw) return false;
  const until = parseInt(raw, 10);
  if (isNaN(until)) return false;
  return Date.now() < until;
}

/** Return the number of whole seconds remaining in the current lockout (0 if none). */
export function getRemainingLockoutSeconds() {
  const raw = localStorage.getItem(LOCKOUT_KEY);
  if (!raw) return 0;
  const until = parseInt(raw, 10);
  if (isNaN(until)) return 0;
  return Math.max(0, Math.floor((until - Date.now()) / 1000));
}

/* ───── failed-attempt helpers ───── */

/** Return the current failed-attempt count. */
export function getFailedAttempts() {
  return parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10);
}

/** Increment the failed-attempt count and return the new value. */
export function incrementFailedAttempts() {
  const next = getFailedAttempts() + 1;
  localStorage.setItem(ATTEMPTS_KEY, String(next));
  return next;
}

/** Clear the failed-attempt and lockout keys. */
export function resetFailedAttempts() {
  localStorage.removeItem(ATTEMPTS_KEY);
  localStorage.removeItem(LOCKOUT_KEY);
}
