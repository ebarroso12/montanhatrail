const crypto = require('crypto');
const db = require('./db');

const SESSION_COOKIE = 'at_session';
const SESSION_TTL_HOURS = 8;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MINUTES = 15;

function parseCookies(req) {
  const header = req.headers.cookie;
  const cookies = {};
  if (!header) return cookies;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    cookies[key] = decodeURIComponent(val);
  });
  return cookies;
}

function setSessionCookie(res, token, maxAgeSeconds) {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  );
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/** Returns the admin_id for a valid, non-expired session cookie, or null. */
async function getSessionAdmin(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  let result;
  try {
    result = await db.query(
      'SELECT admin_id, expires_at FROM admin_sessions WHERE token = $1',
      [token]
    );
  } catch (err) {
    return null;
  }

  const row = result.rows[0];
  if (!row) return null;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    // Expired — clean it up lazily.
    await db.query('DELETE FROM admin_sessions WHERE token = $1', [token]);
    return null;
  }

  return row.admin_id;
}

/** Writes a 401 and returns null if there's no valid session; otherwise returns the admin_id. */
async function requireAdmin(req, res) {
  const adminId = await getSessionAdmin(req);
  if (!adminId) {
    res.status(401).json({ error: 'not_authenticated' });
    return null;
  }
  return adminId;
}

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

module.exports = {
  SESSION_COOKIE,
  SESSION_TTL_HOURS,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_WINDOW_MINUTES,
  parseCookies,
  setSessionCookie,
  clearSessionCookie,
  generateToken,
  getSessionAdmin,
  requireAdmin,
  getClientIp,
};
